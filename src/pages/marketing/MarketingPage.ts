import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onLangChange, t, translateDom, type TranslationKey } from '../../i18n/i18n';
import type { PageContext, PageFactory } from '../../router/Page';
import { fragmentFromHtml, requireElement } from '../../utils/dom';
import { EASE_OUT, prefersReducedMotion } from '../../utils/motion';
import { contentTemplate } from './Content';
import { bindInterestForm } from './InterestForm';
import { bindTextReveal } from './motion/TextReveal';

gsap.registerPlugin(ScrollTrigger);
/** Calm editorial motion, deliberately outside the 3D camera's motion system. */
const MOTION = { reveal: 0.85, offset: 24, entrance: 1.25, counter: 1.6 } as const;
/** Interpolated ordinals refresh with the rest of the language bindings. */
function enhanceCopy(root: HTMLElement): void {
  for (const ordinal of root.querySelectorAll<HTMLElement>('[data-ordinal]'))
    ordinal.textContent = t('marketing.common.number', {
      number: (ordinal.dataset.ordinal ?? '').padStart(2, '0'),
    });
}

function bindCounters(root: HTMLElement): { refresh: () => void; dispose: () => void } {
  const nodes = [...root.querySelectorAll<HTMLElement>('[data-counter]')];
  const values = new Map<
    HTMLElement,
    {
      number: number;
      digits: number;
      unit: string;
      progress: { value: number };
    }
  >();
  let shown = false;
  const draw = (node: HTMLElement): void => {
    const entry = values.get(node);
    if (!entry) return;
    const number = document.createElement('strong');
    number.textContent = entry.progress.value.toFixed(entry.digits);
    const unit = document.createElement('small');
    unit.textContent = entry.unit;
    node.replaceChildren(number, unit);
  };
  const refresh = (): void => {
    for (const node of nodes) {
      const key = node.dataset.counter as TranslationKey;
      const value = t(key);
      const match = value.match(/\d+(?:\.\d+)?/);
      if (!match) continue;
      const previous = values.get(node);
      if (previous) gsap.killTweensOf(previous.progress);
      const numeric = Number(match[0]);
      values.set(node, {
        number: numeric,
        digits: match[0].includes('.') ? 1 : 0,
        unit: value.replace(match[0], '').trim(),
        progress: { value: shown || prefersReducedMotion() ? numeric : 0 },
      });
      draw(node);
    }
  };
  refresh();
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || shown) return;
      shown = true;
      observer.disconnect();
      for (const [node, value] of values) {
        if (prefersReducedMotion()) {
          value.progress.value = value.number;
          draw(node);
        } else
          gsap.to(value.progress, {
            value: value.number,
            duration: MOTION.counter,
            ease: EASE_OUT,
            onUpdate: () => {
              draw(node);
            },
          });
      }
    },
    { threshold: 0.3 },
  );
  for (const node of nodes) observer.observe(node);
  return {
    refresh,
    dispose: () => {
      observer.disconnect();
      for (const value of values.values()) gsap.killTweensOf(value.progress);
      values.clear();
    },
  };
}

const createMarketingPage: PageFactory = (initialContext) => {
  let context: PageContext = initialContext;
  let outlet: HTMLElement | null = null;
  let root: HTMLElement | null = null;
  let animations: gsap.Context | null = null;
  const cleanups: (() => void)[] = [];
  const disposeRoot = (): void => {
    cleanups.splice(0).forEach((cleanup) => {
      cleanup();
    });
    animations?.revert();
    animations = null;
    root?.remove();
    root = null;
  };
  const render = (): void => {
    if (!outlet) return;
    const fragment = fragmentFromHtml(
      `<div class="marketing-page">${contentTemplate(context)}</div>`,
    );
    root = requireElement(fragment, '.marketing-page', HTMLDivElement);
    document.body.dataset.hero = String(!context.path.startsWith('/legal/'));
    outlet.append(fragment);
    translateDom(root);
    enhanceCopy(root);
    const mounted = root;
    const counters = bindCounters(mounted);
    cleanups.push(counters.dispose);
    cleanups.push(bindTextReveal(mounted));
    if (context.path === '/invest') cleanups.push(bindInterestForm(mounted));
    cleanups.push(
      onLangChange(() => {
        enhanceCopy(mounted);
        counters.refresh();
        ScrollTrigger.refresh();
      }),
    );
    const scroll = (event: MouseEvent): void => {
      const id =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-scroll-to]')?.dataset.scrollTo
          : undefined;
      if (id)
        mounted
          .querySelector<HTMLElement>(`#${id}`)
          ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
    };
    mounted.addEventListener('click', scroll);
    cleanups.push(() => {
      mounted.removeEventListener('click', scroll);
    });
    if (!prefersReducedMotion())
      animations = gsap.context(() => {
        const hero = mounted.querySelector('.home-hero__copy,.page-hero__content');
        if (hero)
          gsap.fromTo(
            hero,
            { opacity: 0, y: MOTION.offset },
            {
              opacity: 1,
              y: 0,
              duration: MOTION.entrance,
              ease: EASE_OUT,
              clearProps: 'transform',
            },
          );
        for (const element of mounted.querySelectorAll<HTMLElement>('[data-reveal]'))
          gsap.fromTo(
            element,
            { opacity: 0, y: MOTION.offset },
            {
              opacity: 1,
              y: 0,
              duration: MOTION.reveal,
              ease: EASE_OUT,
              clearProps: 'transform',
              scrollTrigger: { trigger: element, start: 'top 94%', once: true },
            },
          );
      }, mounted);
    ScrollTrigger.refresh();
  };
  return {
    mount(host) {
      outlet = host;
      render();
    },
    update(next) {
      disposeRoot();
      context = next;
      render();
      window.scrollTo(0, 0);
      const heading = outlet?.querySelector<HTMLHeadingElement>('h1');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    },
    unmount() {
      disposeRoot();
      outlet = null;
      delete document.body.dataset.hero;
    },
  };
};

export default createMarketingPage;
