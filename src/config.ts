/**
 * Build-time switches (from .env / .env.pitch) and runtime URL flags.
 *
 * URL flags are read from both the query string and the hash query, so
 * `index.html?debug#/experience` and `#/experience?debug` both work.
 */

/** When false (pitch build), `[TBC …]`, `[DRAFT …]` and `[AR DRAFT …]` markers are stripped from all copy. */
export const SHOW_PLACEHOLDER_MARKERS = import.meta.env.VITE_SHOW_PLACEHOLDER_MARKERS !== 'false';

/** When false (pitch build), `?debug` is ignored. */
const DEBUG_ALLOWED = import.meta.env.VITE_ALLOW_DEBUG !== 'false';

export const QUALITY_TIERS = ['high', 'medium', 'low'] as const;
export type QualityTier = (typeof QUALITY_TIERS)[number];

export interface RuntimeFlags {
  /** `?debug` — FPS panel and diagnostics. */
  readonly debug: boolean;
  /** `?quality=high|medium|low` — overrides adaptive quality. */
  readonly quality: QualityTier | null;
  /** `?tour=1` — autostart the Guided Tour when the Experience opens. */
  readonly tour: boolean;
  /** `?lang=en|ar` — force the initial language (validated by i18n). */
  readonly lang: string | null;
}

function readParams(): URLSearchParams {
  const params = new URLSearchParams(window.location.search);
  const hashQueryIndex = window.location.hash.indexOf('?');
  if (hashQueryIndex !== -1) {
    new URLSearchParams(window.location.hash.slice(hashQueryIndex + 1)).forEach((value, key) => {
      params.set(key, value);
    });
  }
  return params;
}

function isQualityTier(value: string | null): value is QualityTier {
  return QUALITY_TIERS.some((tier) => tier === value);
}

export function readRuntimeFlags(): RuntimeFlags {
  const params = readParams();
  const quality = params.get('quality');
  const tour = params.get('tour');
  return {
    debug: DEBUG_ALLOWED && params.has('debug'),
    quality: isQualityTier(quality) ? quality : null,
    tour: tour !== null && tour !== '0' && tour !== 'false',
    lang: params.get('lang'),
  };
}
