/**
 * The Drawgon logo, served from /public as a static file.
 *
 * It is a ~490KB auto-traced SVG (1000 paths, 1024x559) that carries its own
 * opaque #1E1F24 backdrop, so it is referenced with <img> rather than inlined:
 * inlining would push half a megabyte into the JS bundle on every render, and
 * its paths are not shaped for stroke animation.
 */
const LOGO_SRC = '/drawgon-logo.svg';
const ASPECT = 1024 / 559;

interface DrawgonMarkProps {
  /** Rendered height in px; width follows the artwork's aspect ratio. */
  size?: number;
  className?: string;
  /** Gentle idle motion for loading states. */
  animated?: boolean;
}

export function DrawgonMark({ size = 32, className, animated = false }: DrawgonMarkProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="Boared"
      width={Math.round(size * ASPECT)}
      height={size}
      className={[
        'select-none rounded-lg object-contain',
        animated ? 'drawgon-pulse' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
