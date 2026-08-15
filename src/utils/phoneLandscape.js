/** Phones in landscape are often wider than the md breakpoint (768px). */
export const PHONE_LANDSCAPE_MQ = '(orientation: landscape) and (max-height: 640px)';

export function isPhoneLandscape() {
  return window.matchMedia(PHONE_LANDSCAPE_MQ).matches;
}

export function isDesktopLayout() {
  return window.matchMedia('(min-width: 768px)').matches && !isPhoneLandscape();
}
