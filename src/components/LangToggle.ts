import { getLang, otherLang, setLang } from '../i18n/i18n';

/**
 * EN/عربي switch. The visible label is the *other* language, written in that language,
 * and carries its own `lang` (via `lang.switchToCode`) so screen readers pronounce it correctly.
 * Purely declarative i18n bindings: no listeners to clean up when the owner unmounts.
 */
export function createLangToggle(variant: 'default' | 'on-dark' = 'default'): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `lang-toggle lang-toggle--${variant}`;
  button.setAttribute('data-i18n-attr', 'aria-label:a11y.switchLanguage');

  const label = document.createElement('span');
  label.setAttribute('data-i18n', 'lang.switchTo');
  label.setAttribute('data-i18n-attr', 'lang:lang.switchToCode');
  button.append(label);

  button.addEventListener('click', () => {
    setLang(otherLang(getLang()));
  });
  return button;
}
