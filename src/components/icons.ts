/**
 * Inline SVG icons. All are decorative (aria-hidden); the owning control carries the label.
 * Icons with the `icon--directional` class are mirrored in RTL by CSS.
 */
const svg = (body: string, extraClass = ''): string =>
  `<svg class="icon ${extraClass}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  arrow: svg('<path d="M4 12h15M13 6l6 6-6 6"/>', 'icon--directional'),
  menu: svg('<path d="M4 8h16M4 16h16"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  globe: svg(
    '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5Z"/>',
  ),
} as const;
