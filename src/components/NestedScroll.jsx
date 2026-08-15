import { useEffect, useRef } from 'react';

const EDGE = 1;
const SNAP_RANGE = 140;
const SNAP_IDLE_MS = 140;

const snapTargets = new Set();
let snapUsers = 0;
let lastScrollY = 0;
let scrollDir = 0;
let idleTimer = 0;
let snapping = false;

function canScrollY(node) {
  return node.scrollHeight - node.clientHeight > EDGE;
}

function atBottom(node) {
  return node.scrollTop >= node.scrollHeight - node.clientHeight - EDGE;
}

function atTop(node) {
  return node.scrollTop <= EDGE;
}

function pageScroller() {
  return document.scrollingElement || document.documentElement;
}

function scrollPage(deltaY) {
  pageScroller().scrollTop += deltaY;
}

function headerOffset() {
  if (window.matchMedia('(min-width: 768px)').matches) return 16;
  if (window.matchMedia('(orientation: landscape)').matches) return 12;
  return 68;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isWideScreen() {
  return window.matchMedia('(min-width: 768px)').matches;
}

function clearSnapPad() {
  if (!padEl) return;
  padEl.style.marginBottom = '';
  padEl = null;
  padValue = 0;
}

function visibleSnapTargets() {
  return [...snapTargets].filter((el) => {
    if (!el.isConnected) return false;
    const rect = el.getBoundingClientRect();
    return rect.height > 48 && rect.width > 48;
  });
}

function lastSnapTarget() {
  const list = [...snapTargets].filter((el) => el.isConnected);
  list.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  return list[list.length - 1] ?? null;
}

let padEl = null;
let padValue = 0;
let padObserver = null;

function updateSnapEndPad() {
  if (isWideScreen()) {
    clearSnapPad();
    return;
  }

  const last = lastSnapTarget();
  if (padEl && padEl !== last) {
    clearSnapPad();
  }
  if (!last) return;

  const scroller = pageScroller();
  const lastTopDoc = last.getBoundingClientRect().top + window.scrollY;
  const desiredMaxScroll = Math.max(0, lastTopDoc - headerOffset());
  const maxWithoutPad = scroller.scrollHeight - padValue - scroller.clientHeight;
  const needed = Math.max(0, Math.ceil(desiredMaxScroll - maxWithoutPad));
  if (needed === padValue && padEl === last) return;

  padEl = last;
  padValue = needed;
  last.style.marginBottom = needed ? `${needed}px` : '';
}

function alignTable(el) {
  updateSnapEndPad();
  const scroller = pageScroller();
  const max = scroller.scrollHeight - scroller.clientHeight;
  const next = Math.max(0, Math.min(max, window.scrollY + el.getBoundingClientRect().top - headerOffset()));
  if (Math.abs(next - window.scrollY) < 6) return;

  snapping = true;
  scroller.scrollTo({ top: next, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    snapping = false;
    lastScrollY = window.scrollY;
    window.removeEventListener('scrollend', done);
  };
  window.addEventListener('scrollend', done, { once: true });
  window.setTimeout(done, 450);
}

function visibleHeight(el, viewTop, viewBottom) {
  const rect = el.getBoundingClientRect();
  return Math.max(0, Math.min(rect.bottom, viewBottom) - Math.max(rect.top, viewTop));
}

function snapIdle() {
  if (snapping || prefersReducedMotion() || isWideScreen()) return;

  const y = window.scrollY;
  if (y !== lastScrollY) scrollDir = y > lastScrollY ? 1 : -1;
  lastScrollY = y;

  const offset = headerOffset();
  const ranked = visibleSnapTargets()
    .map((el) => ({
      el,
      visible: visibleHeight(el, 0, window.innerHeight),
      dist: el.getBoundingClientRect().top - offset,
    }))
    .filter((item) => item.visible > 8)
    .sort((a, b) => b.visible - a.visible);

  if (ranked.length === 0) return;

  if (ranked.length >= 2) {
    let pick = ranked[0];
    if (Math.abs(ranked[0].visible - ranked[1].visible) < 32 && scrollDir !== 0) {
      const directed = scrollDir > 0
        ? ranked.find((item) => item.dist >= 0)
        : ranked.find((item) => item.dist <= 0);
      if (directed) pick = directed;
    }
    if (Math.abs(pick.dist) < 4) return;
    alignTable(pick.el);
    return;
  }

  if (scrollDir === 0) return;
  const only = ranked[0];
  if (Math.abs(only.dist) < 8 || Math.abs(only.dist) > SNAP_RANGE) return;
  if (scrollDir > 0 && only.dist < 0) return;
  if (scrollDir < 0 && only.dist > 0) return;
  alignTable(only.el);
}

function onPageScroll() {
  if (snapping) return;
  const y = window.scrollY;
  if (y !== lastScrollY) scrollDir = y > lastScrollY ? 1 : -1;
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(snapIdle, SNAP_IDLE_MS);
}

function registerSnapTarget(el) {
  snapTargets.add(el);
  el.classList.add('table-snap');
  if (snapUsers === 0) {
    lastScrollY = window.scrollY;
    window.addEventListener('scroll', onPageScroll, { passive: true });
    window.addEventListener('resize', updateSnapEndPad);
    padObserver = new ResizeObserver(() => updateSnapEndPad());
  }
  padObserver?.observe(el);
  snapUsers += 1;
  updateSnapEndPad();
  return () => {
    padObserver?.unobserve(el);
    snapTargets.delete(el);
    el.classList.remove('table-snap');
    if (el === padEl) clearSnapPad();
    snapUsers -= 1;
    if (snapUsers === 0) {
      window.removeEventListener('scroll', onPageScroll);
      window.removeEventListener('resize', updateSnapEndPad);
      window.clearTimeout(idleTimer);
      padObserver?.disconnect();
      padObserver = null;
    } else {
      updateSnapEndPad();
    }
  };
}

export default function NestedScroll({ className, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const snapRoot = node.closest('[data-table-snap]') ?? node.parentElement ?? node;
    const unregisterSnap = registerSnapTarget(snapRoot);

    const onWheel = (event) => {
      if (event.ctrlKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (!canScrollY(node)) return;

      const chained = event.deltaY > 0 ? atBottom(node) : atTop(node);
      if (!chained) return;

      event.preventDefault();
      scrollPage(event.deltaY);
    };

    let touchY = 0;
    const onTouchStart = (event) => {
      touchY = event.touches[0].clientY;
    };
    const onTouchMove = (event) => {
      if (!canScrollY(node)) return;
      const y = event.touches[0].clientY;
      const deltaY = touchY - y;
      touchY = y;
      if (deltaY === 0) return;

      const chained = deltaY > 0 ? atBottom(node) : atTop(node);
      if (!chained) return;

      event.preventDefault();
      scrollPage(deltaY);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      unregisterSnap();
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
