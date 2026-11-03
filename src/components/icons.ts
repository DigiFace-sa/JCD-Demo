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
  down: svg('<path d="M12 4v16M6 14l6 6 6-6"/>'),
  star: svg('<path d="m12 2 2.4 6.6 7 .2-5.6 4.3 2 6.9-5.8-4-5.8 4 2-6.9-5.6-4.3 7-.2Z"/>'),
  waves: svg(
    '<path d="M3 7c3-4 6 4 9 0s6 4 9 0M3 12c3-4 6 4 9 0s6 4 9 0M3 17c3-4 6 4 9 0s6 4 9 0"/>',
  ),
  leaf: svg('<path d="M20 4C9 2 3 8 6 15s15 3 14-11ZM5 20 16 9"/>'),
  sun: svg(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1"/>',
  ),
  connections: svg(
    '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="19" r="2"/><path d="M7 6h10M6 8l5 9M18 8l-5 9"/>',
  ),
} as const;
