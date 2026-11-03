import type { TranslationKey } from '../i18n/i18n';

export interface NavItem {
  readonly path: string;
  readonly labelKey: TranslationKey;
}

export const MAIN_NAV: readonly NavItem[] = [
  { path: '/', labelKey: 'nav.home' },
  { path: '/destination', labelKey: 'nav.destination' },
  { path: '/landmarks', labelKey: 'nav.landmarks' },
  { path: '/invest', labelKey: 'nav.invest' },
  { path: '/experience', labelKey: 'nav.experience' },
];

export const LEGAL_DOCS = ['privacy', 'terms', 'cookies'] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];

export const LEGAL_NAV: readonly NavItem[] = LEGAL_DOCS.map((doc) => ({
  path: `/legal/${doc}`,
  labelKey: `legal.${doc}` as const,
}));

export function isLegalDoc(value: string | undefined): value is LegalDoc {
  return LEGAL_DOCS.some((doc) => doc === value);
}

export interface SocialLink {
  readonly id: string;
  readonly labelKey: TranslationKey;
  /** [TBC: official JCDC profile URLs]. Null renders the label without a link. */
  readonly href: string | null;
}

export const SOCIAL_LINKS: readonly SocialLink[] = [
  { id: 'x', labelKey: 'social.x', href: null },
  { id: 'instagram', labelKey: 'social.instagram', href: null },
  { id: 'linkedin', labelKey: 'social.linkedin', href: null },
  { id: 'youtube', labelKey: 'social.youtube', href: null },
];
