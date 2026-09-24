import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Editor, RecordsDiff, TLRecord } from '@tldraw/tldraw';
import { API_BASE_URL } from '@/lib/api-client';

export interface ActiveCollaborator {
  socketId: string;
  userId: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
}

interface UseBoardSyncOptions {
  boardId: string;
  editor: Editor | null;
  readOnly?: boolean;
}

export function useBoardSync({ boardId, editor, readOnly = false }: UseBoardSyncOptions) {
  const [activeCollaborators, setActiveCollaborators] = useState<ActiveCollaborator[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!boardId) return;

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

    socket.on(
      'board:presence',
      (data: { activeCollaborators: ActiveCollaborator[] }) => {
        if (data?.activeCollaborators) {
          setActiveCollaborators(data.activeCollaborators);
        }
      },
    );

    return () => {
      socket.emit('leave-board');
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setActiveCollaborators([]);
    };
  }, [boardId]);

  // Handle incoming remote changes and outgoing local changes
  useEffect(() => {
    if (!editor || !boardId) return;
    const socket = socketRef.current;
    if (!socket) return;

    // 1. Listen for remote changes from other users
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

    // 2. Broadcast local user changes to collaborators
    const unsubscribe = editor.store.listen(
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

    return () => {
      socket.off('board:changes', handleRemoteChanges);
      unsubscribe();
    };
  }, [editor, boardId, readOnly]);

  return {
    activeCollaborators,
    isConnected,
  };
}
