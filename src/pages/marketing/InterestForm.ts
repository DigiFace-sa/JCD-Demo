import { INVESTOR_TYPES, SECTORS } from '../../data/marketing';
import { t, translateDom, type TranslationKey } from '../../i18n/i18n';
import { prefersReducedMotion } from '../../utils/motion';
import { requireElement } from '../../utils/dom';
import { copy } from './templates';

const REQUIRED_FIELDS = new Set(['name', 'email', 'company', 'sector', 'type']);
/** International-length digits with an optional leading plus and common formatting separators. */
const PHONE_PATTERN = /^(?=(?:\D*\d){7,15}\D*$)\+?[\d\s()-]{7,22}$/;

const field = (name: 'name' | 'email' | 'phone' | 'company' | 'message'): string => {
  const required = REQUIRED_FIELDS.has(name);
  const input =
    name === 'message'
      ? `<textarea id="interest-${name}" name="${name}" rows="4"></textarea>`
      : `<input id="interest-${name}" name="${name}" type="${name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'text'}" autocomplete="${name === 'company' ? 'organization' : name === 'phone' ? 'tel' : name}" ${required ? 'required' : ''} />`;
  return `<div class="form-field ${name === 'message' ? 'form-field--full' : ''}"><label for="interest-${name}"><span data-i18n="marketing.form.${name}"></span><small data-i18n="marketing.form.${required ? 'required' : 'optional'}"></small></label>${input}<span class="form-error" id="error-${name}" hidden></span></div>`;
};

export function interestFormTemplate(): string {
  return `<div class="interest-form" data-reveal><form novalidate>
    ${copy('marketing.form.demo', 'p', 'form-disclosure')}<p class="form-summary" role="alert" data-i18n="marketing.form.errors.summary" hidden></p>
    <div class="form-grid">${field('name')}${field('email')}${field('phone')}${field('company')}
    ${(['sector', 'type'] as const).map((name) => `<div class="form-field"><label for="interest-${name}"><span data-i18n="marketing.form.${name}"></span><small data-i18n="marketing.form.required"></small></label><select id="interest-${name}" name="${name}" required><option value="" data-i18n="marketing.form.choose"></option>${(name === 'sector' ? SECTORS : INVESTOR_TYPES).map((id) => `<option value="${id}" data-i18n="${name === 'sector' ? `marketing.invest.sectors.${id}` : `marketing.form.types.${id}`}"></option>`).join('')}</select><span class="form-error" id="error-${name}" hidden></span></div>`).join('')}
    ${field('message')}<div class="form-field form-field--full"><label class="consent-label" for="interest-consent"><input id="interest-consent" name="consent" type="checkbox" required/><span data-i18n="marketing.form.consent"></span></label><span class="form-error" id="error-consent" hidden></span></div></div>
    <div class="form-bottom"><button class="btn btn--primary btn--large" type="submit" data-i18n="marketing.form.submit"></button><a class="small-link" href="#/legal/privacy" data-i18n="marketing.form.privacy"></a></div>
    </form><div class="form-success" hidden><span class="form-success__mark" aria-hidden="true">✓</span>${copy('marketing.form.successTitle', 'h3')}${copy('marketing.form.successBody', 'p', 'muted')}<button type="button" class="text-link" data-form-reset data-i18n="marketing.form.again"></button></div></div>`;
}

export function bindInterestForm(root: HTMLElement): () => void {
  const form = requireElement(root, '.interest-form form', HTMLFormElement);
  const summary = requireElement(form, '.form-summary', HTMLParagraphElement);
  const success = requireElement(root, '.form-success', HTMLDivElement);
  const controls = [
    ...form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input,select,textarea',
    ),
  ];
  const validate = (control: (typeof controls)[number]): boolean => {
    let error: TranslationKey | null = null;
    if (control.name === 'consent' && control instanceof HTMLInputElement && !control.checked)
      error = 'marketing.form.errors.consent';
    else if (control.required && !control.value.trim()) error = 'marketing.form.errors.required';
    else if (control.name === 'email' && control.validity.typeMismatch)
      error = 'marketing.form.errors.email';
    else if (control.name === 'phone' && control.value.trim() && !PHONE_PATTERN.test(control.value))
      error = 'marketing.form.errors.phone';
    const element = form.querySelector<HTMLElement>(`#error-${control.name}`);
    if (error) {
      control.setAttribute('aria-invalid', 'true');
      control.setAttribute('aria-describedby', `error-${control.name}`);
      if (element) {
        element.hidden = false;
        element.setAttribute('data-i18n', error);
        element.textContent = t(error);
      }
    } else {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-describedby');
      if (element) {
        element.hidden = true;
        element.removeAttribute('data-i18n');
        element.textContent = '';
      }
    }
    return error === null;
  };
  const submit = (event: SubmitEvent): void => {
    event.preventDefault();
    const invalid = controls.filter((control) => !validate(control));
    summary.hidden = invalid.length === 0;
    if (invalid.length) {
      invalid[0]?.focus();
      return;
    }
    form.hidden = true;
    success.hidden = false;
    const heading = requireElement(success, 'h3', HTMLHeadingElement);
    heading.tabIndex = -1;
    heading.focus();
    form.reset();
  };
  const input = (event: Event): void => {
    const control = event.target;
    if (
      (control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement) &&
      control.hasAttribute('aria-invalid')
    )
      validate(control);
  };
  const click = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-form-reset]')) {
      success.hidden = true;
      form.hidden = false;
      summary.hidden = true;
      controls[0]?.focus();
    }
    const sector = target?.closest<HTMLElement>('[data-sector]')?.dataset.sector;
    if (sector && SECTORS.some((id) => id === sector)) {
      requireElement(form, '[name="sector"]', HTMLSelectElement).value = sector;
      requireElement(root, '#register-interest', HTMLElement).scrollIntoView({
        behavior: prefersReducedMotion() ? 'instant' : 'smooth',
      });
      requireElement(form, '[name="sector"]', HTMLSelectElement).focus({ preventScroll: true });
    }
  };
  form.addEventListener('submit', submit);
  form.addEventListener('input', input);
  root.addEventListener('click', click);
  translateDom(form);
  return () => {
    form.removeEventListener('submit', submit);
    form.removeEventListener('input', input);
    root.removeEventListener('click', click);
    form.reset();
  };
}
