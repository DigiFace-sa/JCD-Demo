import { useSyncExternalStore } from 'react';

const query = window.matchMedia('(prefers-reduced-motion: reduce)');
const subscribe = (onChange: () => void): (() => void) => {
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
};

/** Live `prefers-reduced-motion`, so motion can switch off without a reload. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => query.matches);
}
