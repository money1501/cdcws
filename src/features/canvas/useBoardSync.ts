import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Editor, RecordsDiff, TLRecord } from '@tldraw/tldraw';
import {
  InstancePresenceRecordType,
  type TLInstancePresence,
  type TLInstancePresenceID,
  type TLUserId,
} from '@tldraw/tlschema';
import { API_BASE_URL } from '@/lib/api-client';

export interface ActiveCollaborator {
  socketId: string;
  userId: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
}

interface RemoteCursorData {
  fromSocketId: string;
  userId?: string | null;
  name?: string | null;
  point: { x: number; y: number } | null;
}

const COLLABORATOR_COLORS = [
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#14b8a6', // teal
];

function getCollaboratorColor(identifier: string): string {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
}

interface UseBoardSyncOptions {
  boardId: string;
  editor: Editor | null;
  readOnly?: boolean;
  enabled?: boolean;
}

export function useBoardSync({
  boardId,
  editor,
  readOnly = false,
  enabled = true,
}: UseBoardSyncOptions) {
  const [activeCollaborators, setActiveCollaborators] = useState<ActiveCollaborator[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !boardId || boardId === 'local' || boardId === 'new') {
      setIsConnected(false);
      setActiveCollaborators([]);
      return;
    }

    const socket = io(`${API_BASE_URL}/boards-sync`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-board', { boardId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socket.emit('leave-board');
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setActiveCollaborators([]);
    };
  }, [boardId, enabled]);

  // Handle incoming remote changes, cursors, presence, and outgoing changes & cursors
  useEffect(() => {
    if (!editor || !boardId || !enabled) return;
    const socket = socketRef.current;
    if (!socket) return;

    // 1. Handle presence updates (collaborators joining and leaving)
    const handlePresence = (data: { activeCollaborators: ActiveCollaborator[] }) => {
      if (data?.activeCollaborators) {
        setActiveCollaborators(data.activeCollaborators);

        // Remove presence records of collaborators who left
        const activeSocketIds = new Set(data.activeCollaborators.map((c) => c.socketId));
        const allPresence = editor.store.query.records('instance_presence').get();
        const toRemove: TLInstancePresenceID[] = [];

        for (const p of allPresence) {
          const socketId = p.id.replace('instance_presence:', '');
          if (!activeSocketIds.has(socketId)) {
            toRemove.push(p.id);
          }
        }

        if (toRemove.length > 0) {
          editor.store.remove(toRemove);
        }
      }
    };

    socket.on('board:presence', handlePresence);

    // 2. Listen for remote changes from other users
    const handleRemoteChanges = (data: {
      diff: RecordsDiff<TLRecord>;
      fromSocketId: string;
    }) => {
      if (!data?.diff || data.fromSocketId === socket.id) return;

      try {
        editor.store.mergeRemoteChanges(() => {
          const { added, updated, removed } = data.diff;
          const toPut: TLRecord[] = [];

          if (added) {
            toPut.push(...(Object.values(added) as TLRecord[]));
          }

          if (updated) {
            for (const entry of Object.values(updated)) {
              const to = (Array.isArray(entry) ? entry[1] : entry) as TLRecord;
              if (to) toPut.push(to);
            }
          }

          if (toPut.length > 0) {
            editor.store.put(toPut);
          }

          if (removed) {
            const toRemove = Object.keys(removed);
            if (toRemove.length > 0) {
              editor.store.remove(toRemove as any);
            }
          }
        });
      } catch (err) {
        console.error('Error applying remote changes to tldraw store:', err);
      }
    };

    socket.on('board:changes', handleRemoteChanges);

    // 3. Listen for remote cursors from other users
    const handleRemoteCursor = (data: RemoteCursorData) => {
      if (!data?.fromSocketId || data.fromSocketId === socket.id) return;

      const presenceId = InstancePresenceRecordType.createId(data.fromSocketId);

      if (!data.point) {
        // Cursor left canvas or disconnected
        if (editor.store.has(presenceId)) {
          editor.store.remove([presenceId]);
        }
        return;
      }

      const tlUserId = (
        data.userId ? `user:${data.userId}_${data.fromSocketId}` : `user:${data.fromSocketId}`
      ) as TLUserId;
      const color = getCollaboratorColor(data.userId || data.name || data.fromSocketId);
      const userName = data.name || 'Collaborator';

      const existing = editor.store.get(presenceId) as TLInstancePresence | undefined;

      const presenceRecord = InstancePresenceRecordType.create({
        ...existing,
        id: presenceId,
        currentPageId: editor.getCurrentPageId(),
        userId: tlUserId,
        userName,
        color,
        cursor: {
          x: data.point.x,
          y: data.point.y,
          type: 'default',
          rotation: 0,
        },
        lastActivityTimestamp: Date.now(),
      });

      editor.store.put([presenceRecord]);
    };

    socket.on('board:cursor', handleRemoteCursor);

    // 4. Broadcast local user changes to collaborators
    const unsubscribeDocument = editor.store.listen(
      (entry) => {
        if (readOnly) return;
        if (socket.connected && entry.changes) {
          socket.emit('board:changes', {
            boardId,
            diff: entry.changes,
          });
        }
      },
      { source: 'user', scope: 'document' },
    );

    // 5. Broadcast local user cursor movements (throttled to ~25fps to preserve performance)
    let lastSentTime = 0;
    let pendingPoint: { x: number; y: number } | null = null;
    let throttleTimer: number | null = null;
    const THROTTLE_MS = 40;

    const sendCursor = (point: { x: number; y: number } | null) => {
      if (socket.connected) {
        socket.emit('board:cursor', {
          boardId,
          point,
        });
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const pagePoint = editor.screenToPage({ x: e.clientX, y: e.clientY });
      const point = {
        x: Math.round(pagePoint.x * 10) / 10,
        y: Math.round(pagePoint.y * 10) / 10,
      };

      const now = performance.now();
      if (now - lastSentTime >= THROTTLE_MS) {
        lastSentTime = now;
        if (throttleTimer) {
          window.clearTimeout(throttleTimer);
          throttleTimer = null;
        }
        pendingPoint = null;
        sendCursor(point);
      } else {
        pendingPoint = point;
        if (!throttleTimer) {
          throttleTimer = window.setTimeout(() => {
            lastSentTime = performance.now();
            throttleTimer = null;
            if (pendingPoint) {
              sendCursor(pendingPoint);
              pendingPoint = null;
            }
          }, THROTTLE_MS - (now - lastSentTime));
        }
      }
    };

    const handlePointerLeave = () => {
      if (throttleTimer) {
        window.clearTimeout(throttleTimer);
        throttleTimer = null;
      }
      pendingPoint = null;
      sendCursor(null);
    };

    const container = editor.getContainer();
    if (container) {
      container.addEventListener('pointermove', handlePointerMove, { passive: true });
      container.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    }
    window.addEventListener('blur', handlePointerLeave);

    return () => {
      socket.off('board:presence', handlePresence);
      socket.off('board:changes', handleRemoteChanges);
      socket.off('board:cursor', handleRemoteCursor);
      unsubscribeDocument();

      if (container) {
        container.removeEventListener('pointermove', handlePointerMove);
        container.removeEventListener('pointerleave', handlePointerLeave);
      }
      window.removeEventListener('blur', handlePointerLeave);
      if (throttleTimer) {
        window.clearTimeout(throttleTimer);
      }
      sendCursor(null);

      // Clean up any remaining remote cursors from store
      const allPresence = editor.store.query.records('instance_presence').get();
      if (allPresence.length > 0) {
        editor.store.remove(allPresence.map((p) => p.id));
      }
    };
  }, [editor, boardId, readOnly, enabled]);

  return {
    activeCollaborators,
    isConnected,
  };
}
