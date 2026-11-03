/**
 * Bilingual (EN/AR) string lookup and DOM binding.
 *
 * - `t(key, vars)` returns a string; keys are type-checked against en.json.
 * - Markup declares text with `data-i18n="key"` and attributes with
 *   `data-i18n-attr="aria-label:key;title:key"`; `translateDom()` fills them, and runs
 *   over the whole document on every language switch, so UI never needs to re-render.
 * - Placeholder markers (`[TBC …]`, `[DRAFT …]`, `[AR DRAFT …]`) stay in the JSON and are
 *   stripped at lookup time when SHOW_PLACEHOLDER_MARKERS is false (pitch build).
 */
import { SHOW_PLACEHOLDER_MARKERS, readRuntimeFlags } from '../config';
import { readStorage, writeStorage } from '../utils/storage';
import ar from './ar.json';
import en from './en.json';

export const LANGUAGES = ['en', 'ar'] as const;
export type Lang = (typeof LANGUAGES)[number];

type Dictionary = typeof en;

/** Dot-separated paths to every string leaf in en.json, e.g. `nav.home`. */
type LeafKeys<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : LeafKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = LeafKeys<Dictionary>;

/** Typing ar as Dictionary makes a missing Arabic key a compile error. */
const dictionaries: Record<Lang, Dictionary> = { en, ar };

/** Must match the key read by the inline script in index.html. */
const STORAGE_KEY = 'jcdc.lang';
const PLACEHOLDER_MARKER = /\s*\[(?:TBC|DRAFT|AR DRAFT)\b[^\]]*\]/g;
const INTERPOLATION = /\{(\w+)\}/g;
const DISPLAY_MARKER = /\s*(\[(?:TBC|DRAFT|AR DRAFT)\b[^\]]*\])/g;

type Listener = (lang: Lang) => void;

let currentLang: Lang = 'en';
const listeners = new Set<Listener>();

export function isLang(value: string | null): value is Lang {
  return LANGUAGES.some((lang) => lang === value);
}

export function getLang(): Lang {
  return currentLang;
}

export function otherLang(lang: Lang = currentLang): Lang {
  return lang === 'en' ? 'ar' : 'en';
}

export function isRtl(lang: Lang = currentLang): boolean {
  return lang === 'ar';
}

function lookup(lang: Lang, key: string): string | undefined {
  let node: unknown = dictionaries[lang];
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Translate a key for the current language, interpolating `{name}` placeholders. */
export function t(key: TranslationKey, vars?: Readonly<Record<string, string | number>>): string {
  return translateRaw(key, vars);
}

/** Untyped variant for keys that come from markup attributes. */
function translateRaw(key: string, vars?: Readonly<Record<string, string | number>>): string {
  let value = lookup(currentLang, key);
  if (value === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] Missing key "${key}" for "${currentLang}"`);
    return key;
  }
  if (!SHOW_PLACEHOLDER_MARKERS) value = value.replace(PLACEHOLDER_MARKER, '').trim();
  if (vars)
    value = value.replace(INTERPOLATION, (match, name: string) => String(vars[name] ?? match));
  return value;
}

/**
 * Separate a translated string's display text from its review markers (`[DRAFT …]`, `[TBC …]`),
 * so components can style the markers apart from the copy. Pitch builds have no markers left.
 */
export function splitMarkers(value: string): { text: string; markers: string[] } {
  const markers: string[] = [];
  const text = value
    .replace(DISPLAY_MARKER, (_match, marker: string) => {
      markers.push(marker);
      return '';
    })
    .trim();
  return { text, markers };
}

/** Fill every `data-i18n` / `data-i18n-attr` element under `root` (including root itself). */
export function translateDom(root: ParentNode = document): void {
  const elements: Element[] = [...root.querySelectorAll('[data-i18n], [data-i18n-attr]')];
  if (root instanceof Element && root.matches('[data-i18n], [data-i18n-attr]')) elements.push(root);

  for (const element of elements) {
    const textKey = element.getAttribute('data-i18n');
    if (textKey) {
      const value = translateRaw(textKey);
      const parts = element.hasAttribute('data-copy') ? value.split(DISPLAY_MARKER) : [value];
      if (parts.length === 1) element.textContent = value;
      else
        element.replaceChildren(
          ...parts.filter(Boolean).map((part) => {
            if (!part.startsWith('[')) return document.createTextNode(part);
            const marker = document.createElement('span');
            marker.className = 'copy-marker';
            marker.dir = 'ltr';
            marker.textContent = part;
            return marker;
          }),
        );
    }

    const attrSpec = element.getAttribute('data-i18n-attr');
    if (attrSpec) {
      for (const pair of attrSpec.split(';')) {
        const [attr, key] = pair.split(':').map((part) => part.trim());
        if (attr && key) element.setAttribute(attr, translateRaw(key));
      }
    }
  }
}

function applyDocumentLang(lang: Lang): void {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = isRtl(lang) ? 'rtl' : 'ltr';
}

/** Switch language: updates <html lang/dir>, persists, re-translates the DOM, notifies listeners. */
export function setLang(lang: Lang): void {
  if (lang === currentLang) return;
  currentLang = lang;
  applyDocumentLang(lang);
  writeStorage(STORAGE_KEY, lang);
  translateDom(document);
  listeners.forEach((listener) => {
    listener(lang);
  });
}

/** Subscribe to language changes. Returns an unsubscribe function. */
export function onLangChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Resolve the initial language: `?lang=` → stored preference → English. */
export function initI18n(): void {
  const fromUrl = readRuntimeFlags().lang;
  const stored = readStorage(STORAGE_KEY);
  currentLang = isLang(fromUrl) ? fromUrl : isLang(stored) ? stored : 'en';
  applyDocumentLang(currentLang);
}
