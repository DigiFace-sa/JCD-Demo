import { useCallback, useMemo, useSyncExternalStore } from 'react';

/** Live layout queries share the same subscription lifecycle as reduced-motion preferences. */
export function useMediaQuery(query: string): boolean {
  const media = useMemo(() => window.matchMedia(query), [query]);
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      media.addEventListener('change', onChange);
      return () => {
        media.removeEventListener('change', onChange);
      };
    },
    [media],
  );
  return useSyncExternalStore(subscribe, () => media.matches);
}
