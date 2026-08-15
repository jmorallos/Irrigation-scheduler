import { useEffect, useRef } from 'react';
import { isDesktopLayout, isPhoneLandscape } from '../utils/phoneLandscape';

const EDGE = 1;
const SNAP_RANGE = 140;
const SNAP_IDLE_MS = 140;
const PAGE_BREAKOUT = 64;

const snapTargets = new Set();
let snapUsers = 0;
let lastScrollY = 0;
let scrollDir = 0;
let idleTimer = 0;
let snapping = false;
let tableTouches = 0;
let touchLockUntil = 0;
let touchLockTimer = 0;
let pageYAtTouchStart = 0;

function canScrollY(node) {
  return node.scrollHeight - node.clientHeight > EDGE;
}

function atBottom(node) {
  return node.scrollTop >= node.scrollHeight - node.clientHeight - EDGE;
}

function atTop(node) {
  return node.scrollTop <= EDGE;
}

function atOverscrollEdge(node, deltaY) {
  return deltaY > 0 ? atBottom(node) : atTop(node);
}

function pageScroller() {
  return document.scrollingElement || document.documentElement;
}

function scrollPage(deltaY) {
  pageScroller().scrollTop += deltaY;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function headerOffset() {
  if (isPhoneLandscape()) return 12;
  if (isDesktopLayout()) return 16;
  return 68;
}

function isWideScreen() {
  return isDesktopLayout();
}

function tableTouchActive() {
  return tableTouches > 0 || Date.now() < touchLockUntil;
}

function beginTableTouch() {
  if (tableTouches === 0) pageYAtTouchStart = window.scrollY;
  tableTouches += 1;
  window.clearTimeout(idleTimer);
  window.clearTimeout(touchLockTimer);
}

function endTableTouch() {
  tableTouches = Math.max(0, tableTouches - 1);
  if (tableTouches > 0) return;
  window.clearTimeout(idleTimer);
  window.clearTimeout(touchLockTimer);
  const pageMoved = Math.abs(window.scrollY - pageYAtTouchStart) >= 2;
  if (!pageMoved) {
    touchLockUntil = 0;
    return;
  }
  touchLockUntil = Date.now() + SNAP_IDLE_MS;
  touchLockTimer = window.setTimeout(() => {
    touchLockUntil = 0;
    snapIdle();
  }, SNAP_IDLE_MS);
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
  if (snapping || prefersReducedMotion() || isWideScreen() || tableTouchActive()) return;

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
    if (scrollDir === 0) return;
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
  lastScrollY = y;
  if (tableTouchActive()) return;
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
      window.clearTimeout(touchLockTimer);
      tableTouches = 0;
      touchLockUntil = 0;
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

    let overflow = 0;
    let chained = false;
    let wheelReset = 0;

    const resetBreakout = () => {
      overflow = 0;
      chained = false;
    };

    const takePageIfCommitted = (deltaY, event) => {
      if (!atOverscrollEdge(node, deltaY)) {
        resetBreakout();
        return false;
      }

      if (!chained) {
        overflow += Math.abs(deltaY);
        if (overflow < PAGE_BREAKOUT) {
          if (event.cancelable) event.preventDefault();
          return true;
        }
        chained = true;
      }

      if (event.cancelable) event.preventDefault();
      scrollPage(deltaY);
      return true;
    };

    const onWheel = (event) => {
      if (event.ctrlKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (!canScrollY(node)) return;

      window.clearTimeout(wheelReset);
      wheelReset = window.setTimeout(resetBreakout, 160);
      takePageIfCommitted(event.deltaY, event);
    };

    let touchY = 0;
    let holdingTouch = false;
    const onTouchStart = (event) => {
      touchY = event.touches[0].clientY;
      resetBreakout();
      if (holdingTouch) return;
      holdingTouch = true;
      beginTableTouch();
    };
    const onTouchEnd = (event) => {
      if (event.touches.length > 0) return;
      resetBreakout();
      if (!holdingTouch) return;
      holdingTouch = false;
      endTableTouch();
    };
    const onTouchMove = (event) => {
      if (!canScrollY(node)) return;
      const y = event.touches[0].clientY;
      const deltaY = touchY - y;
      touchY = y;
      if (deltaY === 0) return;
      takePageIfCommitted(deltaY, event);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd, { passive: true });
    node.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      window.clearTimeout(wheelReset);
      if (holdingTouch) {
        holdingTouch = false;
        endTableTouch();
      }
      unregisterSnap();
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
