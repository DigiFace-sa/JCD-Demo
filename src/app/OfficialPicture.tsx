import type { ReactNode } from 'react';
import { OFFICIAL_IMAGES, type OfficialImage } from '../data/officialImages';

export interface OfficialPictureProps {
  readonly id: OfficialImage;
  /** Rendered width hint for the browser's size choice, e.g. `100vw` for full-screen scenes. */
  readonly sizes?: string;
  /** Empty for decorative use (the scene copy carries the meaning). */
  readonly alt: string;
  readonly priority?: boolean;
  readonly className?: string;
}

/**
 * An official JCDC render: AVIF at every generated width, WebP fallback. The browser picks the
 * smallest file that covers the rendered size at the device pixel ratio.
 */
export function OfficialPicture({ id, sizes = '100vw', alt, priority = false, className }: OfficialPictureProps): ReactNode {
  const { width, height, widths } = OFFICIAL_IMAGES[id];
  return (
    <picture className="official-picture">
      <source
        type="image/avif"
        sizes={sizes}
        srcSet={widths.map((w) => `images/jcdc/${id}-${w}.avif ${w}w`).join(', ')}
      />
      <img
        className={className}
        src={`images/jcdc/${id}.webp`}
        width={width}
        height={height}
        alt={alt}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'low'}
      />
    </picture>
  );
}
