import { Mic, MicOff, PhoneOff, Radio } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { useVoiceRoom } from './useVoiceRoom';

/** Discord-style voice dock for a board. */
export function VoiceBar({ boardId }: { boardId: string }) {
  const { status, error, peers, muted, selfLevel, join, leave, toggleMute } =
    useVoiceRoom(boardId);

  if (status === 'idle' || status === 'error') {
    return (
      <div className="pointer-events-auto absolute bottom-4 right-4 z-[400] flex flex-col items-end gap-1">
        {error && (
          <span className="rounded-md bg-red-100 px-2 py-1 text-xs text-red-800 dark:bg-red-500/15 dark:text-red-300">
            {error}
          </span>
        )}
        <button
          type="button"
          onClick={() => void join()}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-md transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <Mic size={14} />
          Join voice
        </button>
      </div>
    );
  }

  const speaking = !muted && selfLevel > 0.08;

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-[400] flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
      <span className="inline-flex items-center gap-1.5 px-1.5 text-xs font-semibold text-emerald-500">
        <Radio size={13} className={status === 'connecting' ? 'animate-pulse' : ''} />
        {status === 'connecting' ? 'Connecting' : 'Live'}
      </span>

      <div className="flex items-center -space-x-1.5">
        <span
          title="You"
          className={`rounded-full ring-2 transition ${
            speaking ? 'ring-emerald-500' : 'ring-transparent'
          }`}
        >
          <Avatar name="You" size="sm" />
        </span>
        {peers.map((p) => (
          <span
            key={p.socketId}
            title={p.muted ? `${p.name} (muted)` : p.name}
            className={`rounded-full ring-2 transition ${
              p.muted ? 'opacity-50 ring-transparent' : 'ring-transparent'
            }`}
          >
            <Avatar name={p.name} size="sm" />
          </span>
        ))}
      </div>

      <span className="text-xs text-neutral-400">
        {peers.length === 0 ? 'Only you' : `${peers.length + 1} in call`}
      </span>

      <button
        type="button"
        onClick={toggleMute}
        title={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
          muted
            ? 'bg-red-500/15 text-red-500'
            : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
        }`}
      >
        {muted ? <MicOff size={15} /> : <Mic size={15} />}
      </button>

      <button
        type="button"
        onClick={leave}
        title="Leave call"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
      >
        <PhoneOff size={14} />
      </button>
    </div>
  );
}
