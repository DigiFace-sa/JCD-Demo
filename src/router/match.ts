import type { PageContext } from './Page';
import { type RouteDef, notFoundRoute, routes } from './routes';

export interface RouteMatch {
  readonly route: RouteDef;
  readonly context: PageContext;
}

function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (const [index, patternPart] of patternParts.entries()) {
    const pathPart = pathParts[index] ?? '';
    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }
  return params;
}

/** Resolve a router location (`pathname` + `search`, as HashRouter reports them) to a route. */
export function resolveRoute(pathname: string, search: string): RouteMatch {
  const trimmed = pathname.replace(/\/+$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const query = new URLSearchParams(search);
  for (const route of routes) {
    const params = matchPattern(route.pattern, path);
    if (params && (!route.validate || route.validate(params))) {
      return { route, context: { path, params, query } };
    }
  }
  return { route: notFoundRoute, context: { path, params: {}, query } };
}
