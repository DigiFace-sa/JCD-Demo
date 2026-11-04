import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { Copy } from '../../app/Copy';
import { useI18n } from '../../app/i18n';
import { useLenis } from '../../app/SmoothScroll';
import { Icon } from '../../app/shell/Icon';
import { INVESTOR_TYPES, SECTORS } from '../../data/marketing';

export type Sector = (typeof SECTORS)[number];
type Field = 'name' | 'email' | 'phone' | 'company' | 'sector' | 'type' | 'message' | 'consent';
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type ErrorKey =
  | 'marketing.form.errors.required'
  | 'marketing.form.errors.email'
  | 'marketing.form.errors.phone'
  | 'marketing.form.errors.consent';
type Errors = Partial<Record<Field, ErrorKey>>;
type Values = Record<Exclude<Field, 'consent'>, string> & { consent: boolean };

/** Preserve the approved form's international digit count and formatting tolerance. */
const PHONE_PATTERN = /^(?=(?:\D*\d){7,15}\D*$)\+?[\d\s()-]{7,22}$/;
const FIELDS: readonly Field[] = [
  'name',
  'email',
  'phone',
  'company',
  'sector',
  'type',
  'message',
  'consent',
];
const REQUIRED = new Set<Field>(['name', 'email', 'company', 'sector', 'type', 'consent']);

function emptyValues(): Values {
  return {
    name: '',
    email: '',
    phone: '',
    company: '',
    sector: '',
    type: '',
    message: '',
    consent: false,
  };
}

function validate(
  field: Field,
  values: Values,
  control: Control | null | undefined,
): ErrorKey | null {
  if (field === 'consent') return values.consent ? null : 'marketing.form.errors.consent';
  const value = values[field];
  if (REQUIRED.has(field) && !value.trim()) return 'marketing.form.errors.required';
  // Keep native email syntax checking rather than imposing a narrower custom address pattern.
  if (field === 'email' && control?.validity.typeMismatch) return 'marketing.form.errors.email';
  if (field === 'phone' && value.trim() && !PHONE_PATTERN.test(value))
    return 'marketing.form.errors.phone';
  return null;
}

function withFieldError(previous: Errors, field: Field, error: ErrorKey | null): Errors {
  const next: Errors = {};
  for (const name of FIELDS) {
    const value = name === field ? error : previous[name];
    if (value) next[name] = value;
  }
  return next;
}

export interface InterestFormHandle {
  open(sector?: Sector): void;
  focus(field?: 'name' | 'sector'): void;
}

/** In-memory demonstration only. Language changes retranslate the same controlled fields. */
export function InterestForm({ ref }: { ref?: Ref<InterestFormHandle> }): ReactNode {
  const { t, lang } = useI18n();
  const lenis = useLenis();
  const prefix = useId();
  const controls = useRef<Partial<Record<Field, Control | null>>>({});
  const successHeading = useRef<HTMLHeadingElement>(null);
  const focusFrame = useRef<number | null>(null);
  const submitted = useRef(false);
  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<Errors>({});
  const [success, setSuccess] = useState(false);
  const errorCount = Object.keys(errors).length;
  const id = (field: Field): string => `${prefix}-${field}`;

  const requestFocus = useCallback((field: Field | 'success', preventScroll = false): void => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      const element = field === 'success' ? successHeading.current : controls.current[field];
      element?.focus({ preventScroll });
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      open(sector) {
        setSuccess(false);
        if (sector) {
          setValues((previous) => ({ ...previous, sector }));
          setErrors((previous) => withFieldError(previous, 'sector', null));
        }
      },
      focus(field = 'name') {
        requestFocus(field, true);
      },
    }),
    [requestFocus],
  );

  useEffect(
    () => () => {
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    },
    [],
  );
  useEffect(() => {
    // Error text and the success state change layout below the other editorial reveals.
    lenis?.resize();
    ScrollTrigger.refresh();
  }, [errorCount, success, lang, lenis]);

  const update = (field: Field, value: string | boolean): void => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (!submitted.current) return;
    const error = validate(field, next, controls.current[field]);
    setErrors((previous) => withFieldError(previous, field, error));
  };
  const errorNode = (field: Field): ReactNode => {
    const error = errors[field];
    return (
      <span className="invest-form__error" id={`${id(field)}-error`} hidden={!error}>
        {error ? t(error) : ''}
      </span>
    );
  };
  const label = (field: Exclude<Field, 'consent'>): ReactNode => (
    <label htmlFor={id(field)}>
      <span>{t(`marketing.form.${field}`)}</span>
      <small>
        {t(REQUIRED.has(field) ? 'marketing.form.required' : 'marketing.form.optional')}
      </small>
    </label>
  );
  const textField = (field: 'name' | 'email' | 'phone' | 'company'): ReactNode => (
    <div className="invest-form__field" key={field}>
      {label(field)}
      <input
        ref={(element) => {
          controls.current[field] = element;
        }}
        id={id(field)}
        name={field}
        type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
        autoComplete={field === 'company' ? 'organization' : field === 'phone' ? 'tel' : field}
        dir={field === 'email' || field === 'phone' ? 'ltr' : undefined}
        value={values[field]}
        required={REQUIRED.has(field)}
        aria-invalid={errors[field] ? true : undefined}
        aria-describedby={errors[field] ? `${id(field)}-error` : undefined}
        onChange={(event) => {
          update(field, event.currentTarget.value);
        }}
      />
      {errorNode(field)}
    </div>
  );

  return (
    <div className="invest-interest-form" data-state={success ? 'success' : 'form'}>
      <form
        className="invest-form"
        hidden={success}
        noValidate
        aria-label={t('marketing.form.title')}
        onSubmit={(event) => {
          event.preventDefault();
          submitted.current = true;
          const next: Errors = {};
          FIELDS.forEach((field) => {
            const error = validate(field, values, controls.current[field]);
            if (error) next[field] = error;
          });
          setErrors(next);
          const firstInvalid = FIELDS.find((field) => next[field]);
          if (firstInvalid) {
            requestFocus(firstInvalid);
            return;
          }
          // Clear the data immediately; no network request, storage or delayed retention.
          setValues(emptyValues());
          submitted.current = false;
          setSuccess(true);
          requestFocus('success');
        }}
      >
        <p className="invest-form__disclosure">{t('marketing.form.demo')}</p>
        <p className="invest-form__summary" role="alert" hidden={!errorCount}>
          {t('marketing.form.errors.summary')}
        </p>
        <div className="invest-form__grid">
          {(['name', 'email', 'phone', 'company'] as const).map(textField)}
          {(['sector', 'type'] as const).map((field) => (
            <div className="invest-form__field" key={field}>
              {label(field)}
              <div className="invest-form__select">
                <select
                  ref={(element) => {
                    controls.current[field] = element;
                  }}
                  id={id(field)}
                  name={field}
                  required
                  value={values[field]}
                  aria-invalid={errors[field] ? true : undefined}
                  aria-describedby={errors[field] ? `${id(field)}-error` : undefined}
                  onChange={(event) => {
                    update(field, event.currentTarget.value);
                  }}
                >
                  <option value="">{t('marketing.form.choose')}</option>
                  {field === 'sector'
                    ? SECTORS.map((sector) => (
                        <option key={sector} value={sector}>
                          {t(`marketing.invest.sectors.${sector}`)}
                        </option>
                      ))
                    : INVESTOR_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {t(`marketing.form.types.${type}`)}
                        </option>
                      ))}
                </select>
                <span aria-hidden="true">
                  <Icon name="down" />
                </span>
              </div>
              {errorNode(field)}
            </div>
          ))}
          <div className="invest-form__field invest-form__field--full">
            {label('message')}
            <textarea
              ref={(element) => {
                controls.current.message = element;
              }}
              id={id('message')}
              name="message"
              rows={4}
              value={values.message}
              onChange={(event) => {
                update('message', event.currentTarget.value);
              }}
            />
          </div>
          <div className="invest-form__field invest-form__field--full">
            <label className="invest-form__consent" htmlFor={id('consent')}>
              <input
                ref={(element) => {
                  controls.current.consent = element;
                }}
                id={id('consent')}
                name="consent"
                type="checkbox"
                required
                checked={values.consent}
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={errors.consent ? `${id('consent')}-error` : undefined}
                onChange={(event) => {
                  update('consent', event.currentTarget.checked);
                }}
              />
              <span>{t('marketing.form.consent')}</span>
            </label>
            {errorNode('consent')}
          </div>
        </div>
        <div className="invest-form__bottom">
          <button className="invest-button" type="submit">
            <span>{t('marketing.form.submit')}</span>
            <Icon name="arrow" />
          </button>
          <a href="#/legal/privacy">{t('marketing.form.privacy')}</a>
        </div>
      </form>
      <div className="invest-form__success" hidden={!success} role="status" aria-live="polite">
        <span className="invest-form__success-symbol" aria-hidden="true">
          <Icon name="leaf" />
        </span>
        <h3 ref={successHeading} tabIndex={-1}>
          {t('marketing.form.successTitle')}
        </h3>
        <Copy k="marketing.form.successBody" />
        <button
          type="button"
          className="invest-button invest-button--outline"
          onClick={() => {
            setValues(emptyValues());
            setErrors({});
            submitted.current = false;
            setSuccess(false);
            requestFocus('name');
          }}
        >
          <span>{t('marketing.form.again')}</span>
          <Icon name="arrow" />
        </button>
      </div>
    </div>
  );
}
