import type { ReactNode } from 'react';
import { icons } from '../../components/icons';

/** Decorative inline icon from the shared, code-authored SVG set (aria-hidden in the markup). */
export function Icon({ name }: { name: keyof typeof icons }): ReactNode {
  return <span className="icon-slot" dangerouslySetInnerHTML={{ __html: icons[name] }} />;
}
