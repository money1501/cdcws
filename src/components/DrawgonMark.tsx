/**
 * The Boared logo/mascot, served from /public as a static asset.
 */
const LOGO_SRC = '/logo.png';
const ASPECT = 929 / 655; // 1.4183

interface DrawgonMarkProps {
  /** Rendered height in px; width follows the artwork's aspect ratio. */
  size?: number;
  className?: string;
  /** Gentle idle motion for loading states. */
  animated?: boolean;
}

export function DrawgonMark({ size = 32, className, animated = false }: DrawgonMarkProps) {
  const width = Math.round(size * ASPECT);
  return (
    <img
      src={LOGO_SRC}
      alt="Boared"
      width={width}
      height={size}
      style={{ width: `${width}px`, height: `${size}px` }}
      className={[
        'select-none object-contain transition-transform',
        animated ? 'drawgon-pulse' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}

