/* ============================================================
   motion.js - shared interaction and motion layer
   E-Learning for LSPID

   Loaded synchronously in <head> so the "js-motion" flag lands before
   first paint and reveal targets never flash in and back out.

   Design rules this file follows:
   - Only transform and opacity are animated.
   - No scroll listeners. IntersectionObserver only.
   - Motion is opt-in: without this script the pages render fully
     visible and fully usable.
   - Both prefers-reduced-motion and the in-page "Reduce motion"
     toggle collapse everything to static, live.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  /* The manual toggle is stored by a11y.js under this key. Read it here
     so a learner who turned motion off never sees a frame of animation
     on the next page load. */
  function manualReduceMotion() {
    try {
      var raw = window.localStorage.getItem('lspid-a11y-prefs-v1');
      if (!raw) return false;
      return !!JSON.parse(raw).reduceMotion;
    } catch (e) {
      return false;
    }
  }

  var motionOff = reduceQuery.matches || manualReduceMotion();

  /* Flag set before paint. CSS keys every hidden state off it. */
  if (!motionOff) root.classList.add('js-motion');

  /* ----------------------------------------------------------
     Reveal on scroll
     ---------------------------------------------------------- */
  var REVEAL_STEP = 55;   /* ms between siblings in one batch */
  var REVEAL_MAX = 330;   /* cap, so a long grid never trickles */

  function markRevealTargets() {
    var groups = [
      ['.home-banner', 'soft'],
      ['.page-hero__icon', 'soft'],
      ['.page-hero__title', ''],
      ['.page-hero__rule', ''],
      ['.page-hero__back', ''],
      ['.ag-courses_item', ''],
      ['.empty-state', 'soft'],
      ['.site-footer p', '']
    ];

    groups.forEach(function (group) {
      var nodes = document.querySelectorAll(group[0]);
      for (var i = 0; i < nodes.length; i++) {
        if (!nodes[i].hasAttribute('data-reveal')) {
          nodes[i].setAttribute('data-reveal', group[1]);
        }
      }
    });
  }

  function revealAll() {
    var nodes = document.querySelectorAll('[data-reveal]');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.add('is-revealed');
  }

  /* Safety net. If the observer never reports (a zero-height viewport, an
     unusual embedding, a print context), anything already on screen is
     shown anyway. Content visibility must never depend on motion working. */
  function failsafeReveal() {
    if (!window.innerHeight) { revealAll(); return; }
    var nodes = document.querySelectorAll('[data-reveal]:not(.is-revealed)');
    for (var i = 0; i < nodes.length; i++) {
      var rect = nodes[i].getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        nodes[i].classList.add('is-revealed');
      }
    }
  }

  function startRevealObserver() {
    if (!('IntersectionObserver' in window) || !window.innerHeight) { revealAll(); return; }

    var observer = new IntersectionObserver(function (entries) {
      var shown = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = Math.min(shown * REVEAL_STEP, REVEAL_MAX);
        el.style.setProperty('--reveal-delay', delay + 'ms');
        el.classList.add('is-revealed');
        observer.unobserve(el);
        shown++;
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    var nodes = document.querySelectorAll('[data-reveal]');
    for (var i = 0; i < nodes.length; i++) observer.observe(nodes[i]);
    return observer;
  }

  /* ----------------------------------------------------------
     Header condensation
     A one pixel sentinel above the sticky header, watched by an
     observer. No scroll handler, so nothing runs per frame.
     ---------------------------------------------------------- */
  function startHeaderObserver() {
    var header = document.querySelector('.site-header');
    if (!header || !('IntersectionObserver' in window)) return;

    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;height:1px;width:1px;pointer-events:none;';
    header.parentNode.insertBefore(sentinel, header);

    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }, { threshold: 0 }).observe(sentinel);
  }

  /* ----------------------------------------------------------
     Pointer spotlight on cards
     One delegated listener, coalesced into a single rAF, writing two
     custom properties. Fine pointers only, so touch is untouched.
     ---------------------------------------------------------- */
  function startSpotlight() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var pending = null;
    var frame = 0;

    function paint() {
      frame = 0;
      if (!pending) return;
      var card = pending.card;
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', (pending.x - rect.left) + 'px');
      card.style.setProperty('--my', (pending.y - rect.top) + 'px');
      pending = null;
    }

    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.ag-courses-item_link');
      if (!card) return;
      pending = { card: card, x: e.clientX, y: e.clientY };
      if (!frame) frame = window.requestAnimationFrame(paint);
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     Home banner emoji drift
     Each glyph becomes its own element so it can float on its own
     offset instead of the whole strip moving as one block.
     ---------------------------------------------------------- */
  function splitBannerEmojis() {
    var strip = document.querySelector('.home-banner__emojis');
    if (!strip || strip.querySelector('span')) return;

    var glyphs = strip.textContent.trim().split(/\s+/);
    strip.textContent = '';
    glyphs.forEach(function (glyph, i) {
      var span = document.createElement('span');
      span.textContent = glyph;
      span.style.setProperty('--drift-delay', (i * 0.26).toFixed(2) + 's');
      strip.appendChild(span);
      if (i < glyphs.length - 1) strip.appendChild(document.createTextNode(' '));
    });
    strip.classList.add('is-split');
  }

  /* ----------------------------------------------------------
     Live response to the in-page "Reduce motion" toggle
     ---------------------------------------------------------- */
  function watchManualToggle() {
    if (!('MutationObserver' in window)) return;
    new MutationObserver(function () {
      var off = document.body.classList.contains('a11y-reduce-motion');
      root.classList.toggle('js-motion', !off);
      if (off) revealAll();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  /* ----------------------------------------------------------
     Boot
     ---------------------------------------------------------- */
  function init() {
    splitBannerEmojis();

    if (motionOff) {
      markRevealTargets();
      revealAll();
      return;
    }

    markRevealTargets();
    startRevealObserver();
    startHeaderObserver();
    startSpotlight();
    watchManualToggle();

    window.setTimeout(failsafeReveal, 1400);
    window.addEventListener('pageshow', failsafeReveal);
    window.addEventListener('resize', failsafeReveal, { passive: true });

    /* If the OS setting flips mid-session, drop straight to static. */
    if (reduceQuery.addEventListener) {
      reduceQuery.addEventListener('change', function (e) {
        if (e.matches) { root.classList.remove('js-motion'); revealAll(); }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
