import { Link } from 'react-router-dom';
import { DrawgonMark } from './DrawgonMark';

export function DrawgonWordmark({ size = 28, to }: { size?: number; to?: string }) {
  const inner = (
    <>
      <DrawgonMark size={size} />
      <span className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
        Boared
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="flex items-center gap-2">
        {inner}
      </Link>
    );
  }
  return <div className="flex items-center gap-2">{inner}</div>;
}
