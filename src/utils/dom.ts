/** Query a required element; throws if missing because that is a template bug, not a runtime state. */
export function requireElement<T extends Element>(
  root: ParentNode,
  selector: string,
  type: new () => T,
): T {
  const element = root.querySelector(selector);
  if (!(element instanceof type)) {
    throw new Error(`Expected ${type.name} for selector "${selector}"`);
  }
  return element;
}

/** Parse a static HTML template into a fragment. Only use with trusted, code-authored markup. */
export function fragmentFromHtml(html: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}
