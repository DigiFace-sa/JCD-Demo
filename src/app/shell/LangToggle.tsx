import type { ReactNode } from 'react';
import { otherLang } from '../../i18n/i18n';
import { useI18n } from '../i18n';

/** EN/عربي switch; the label is the other language, in that language, with its own `lang`. */
export function LangToggle({
  variant = 'default',
}: {
  variant?: 'default' | 'on-dark';
}): ReactNode {
  const { t, lang, setLang } = useI18n();
  return (
    <button
      type="button"
      className={`lang-toggle lang-toggle--${variant}`}
      aria-label={t('a11y.switchLanguage')}
      onClick={() => {
        setLang(otherLang(lang));
      }}
    >
      <span lang={t('lang.switchToCode')}>{t('lang.switchTo')}</span>
    </button>
  );
}
