import type { ReactNode } from 'react';
import type { TranslationKey } from '../i18n/i18n';
import { splitMarkers } from '../i18n/i18n';
import type { MotionKind } from '../motion/choreography';
import { useI18n } from './i18n';

type Tag = 'p' | 'h1' | 'h2' | 'h3' | 'span' | 'dd' | 'dt';

/**
 * Translated copy. Review markers (`[DRAFT — client to approve]`) render as small separate
 * notes after the text, so headings animate and read cleanly; pitch builds have none.
 */
export function Copy({
  k,
  as: Element = 'p',
  className,
  motion,
  vars,
  id,
}: {
  k: TranslationKey;
  as?: Tag;
  className?: string;
  motion?: MotionKind;
  vars?: Readonly<Record<string, string | number>>;
  id?: string;
}): ReactNode {
  const { t } = useI18n();
  const { text, markers } = splitMarkers(t(k, vars));
  return (
    <>
      <Element id={id} className={className} data-motion={motion}>
        {text}
      </Element>
      {markers.map((marker) => (
        <span
          key={marker}
          className="copy-marker"
          dir="ltr"
          data-motion={motion ? 'fade' : undefined}
        >
          {marker}
        </span>
      ))}
    </>
  );
}
