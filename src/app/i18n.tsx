import { useSyncExternalStore } from 'react';
import { getLang, isRtl, onLangChange, setLang, t, type Lang } from '../i18n/i18n';

/**
 * React binding for the existing i18n module. Components call `useI18n()` to re-render on a
 * language switch; `t()` itself stays the single, typed lookup shared with legacy pages.
 */
export function useI18n(): { lang: Lang; rtl: boolean; t: typeof t; setLang: typeof setLang } {
  const lang = useSyncExternalStore(onLangChange, getLang, getLang);
  return { lang, rtl: isRtl(lang), t, setLang };
}
