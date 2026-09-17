/* ============================================================
   E-Learning for LSPID — Accessibility & Reading Toolkit
   Bionic Reading, dyslexia-friendly mode, read-aloud, high
   contrast, big cursor, reading ruler, text size / spacing,
   and reduced motion — all self-mounting, no HTML changes
   needed on any page. Preferences are saved per-browser via
   localStorage (falls back gracefully if unavailable).
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'lspid-a11y-prefs-v1';
  var DEFAULTS = {
    bionic: false,
    dyslexia: false,
    contrast: false,
    bigCursor: false,
    reduceMotion: false,
    ruler: false,
    hoverSpeak: false,
    fontStep: 0,   // -2..+4 -> maps to --font-scale
    lineStep: 0,   // 0..4   -> maps to --line-scale
  };

  function loadPrefs() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      var parsed = JSON.parse(raw);
      return Object.assign({}, DEFAULTS, parsed);
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }
  function savePrefs(prefs) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
  }

  var prefs = loadPrefs();

  /* ---------------- helpers ---------------- */
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function fontScaleFor(step) { return (1 + step * 0.1).toFixed(2); }
  function lineScaleFor(step) { return (1 + step * 0.15).toFixed(2); }

  function applyScales() {
    document.documentElement.style.setProperty('--font-scale', fontScaleFor(prefs.fontStep));
    document.documentElement.style.setProperty('--line-scale', lineScaleFor(prefs.lineStep));
  }

  function toggleBodyClass(name, on) {
    document.body.classList.toggle(name, !!on);
  }

  /* ---------------- Bionic Reading ---------------- */
  var BIONIC_MARK = 'data-a11y-bionic';

  function bionicWordHtml(word) {
    var m = word.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9]+)([^a-zA-Z0-9]*)$/);
    if (!m) return escapeHtml(word);
    var lead = m[1], core = m[2], trail = m[3];
    var boldLen = core.length <= 3 ? 1 : Math.ceil(core.length * 0.5);
    var boldPart = core.slice(0, boldLen);
    var restPart = core.slice(boldLen);
    return escapeHtml(lead) + '<b>' + escapeHtml(boldPart) + '</b>' + escapeHtml(restPart) + escapeHtml(trail);
  }

  function shouldSkipNode(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    while (el) {
      if (el.id === 'a11y-panel' || el.id === 'a11y-toggle' || el.id === 'a11y-reading-ruler') return true;
      var tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return true;
      el = el.parentElement;
    }
    return false;
  }

  function collectTextNodes(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue || !/\S/.test(n.nodeValue)) continue;
      if (shouldSkipNode(n)) continue;
      nodes.push(n);
    }
    return nodes;
  }

  function enableBionic() {
    if (document.body.getAttribute(BIONIC_MARK) === '1') return;
    var nodes = collectTextNodes(document.body);
    nodes.forEach(function (textNode) {
      var original = textNode.nodeValue;
      var parts = original.split(/(\s+)/);
      var html = parts.map(function (p) {
        return /\s+/.test(p) ? p : bionicWordHtml(p);
      }).join('');
      var span = document.createElement('span');
      span.className = 'a11y-bionic-container';
      span.setAttribute('data-original', original);
      span.innerHTML = html;
      textNode.parentNode.replaceChild(span, textNode);
    });
    document.body.setAttribute(BIONIC_MARK, '1');
  }

  function disableBionic() {
    if (document.body.getAttribute(BIONIC_MARK) !== '1') return;
    var spans = document.querySelectorAll('span.a11y-bionic-container');
    spans.forEach(function (span) {
      var original = span.getAttribute('data-original') || '';
      var textNode = document.createTextNode(original);
      span.parentNode.replaceChild(textNode, span);
    });
    document.body.removeAttribute(BIONIC_MARK);
  }

  /* ---------------- Read aloud (speech synthesis) ---------------- */
  var speaking = false;
  function speakText(text) {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      var utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
    } catch (e) { /* ignore */ }
  }
  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  }
  function readPageAloud() {
    var main = document.getElementById('main-content') || document.body;
    speakText(main.innerText || main.textContent || '');
  }

  var hoverSpeakHandler = null;
  function setHoverSpeak(on) {
    var links = document.querySelectorAll('.ag-courses-item_link');
    if (on) {
      hoverSpeakHandler = function (e) {
        var title = e.currentTarget.querySelector('.ag-courses-item_title');
        if (title) speakText(title.textContent.trim());
      };
      links.forEach(function (l) {
        l.addEventListener('mouseenter', hoverSpeakHandler);
        l.addEventListener('focus', hoverSpeakHandler);
      });
    } else if (hoverSpeakHandler) {
      links.forEach(function (l) {
        l.removeEventListener('mouseenter', hoverSpeakHandler);
        l.removeEventListener('focus', hoverSpeakHandler);
      });
    }
  }

  /* ---------------- Reading ruler ---------------- */
  var rulerEl = null;
  function ensureRuler() {
    if (rulerEl) return rulerEl;
    rulerEl = document.createElement('div');
    rulerEl.id = 'a11y-reading-ruler';
    document.body.appendChild(rulerEl);
    document.addEventListener('mousemove', function (e) {
      rulerEl.style.top = (e.clientY - 20) + 'px';
    });
    return rulerEl;
  }

  /* ---------------- Apply all current prefs ---------------- */
  function applyAll() {
    toggleBodyClass('a11y-dyslexia', prefs.dyslexia);
    toggleBodyClass('a11y-contrast', prefs.contrast);
    toggleBodyClass('a11y-big-cursor', prefs.bigCursor);
    toggleBodyClass('a11y-reduce-motion', prefs.reduceMotion);
    toggleBodyClass('a11y-ruler-on', prefs.ruler);
    if (prefs.ruler) ensureRuler();
    applyScales();
    if (prefs.bionic) enableBionic(); else disableBionic();
    setHoverSpeak(prefs.hoverSpeak);
  }

  /* ---------------- Build the toolbar UI ---------------- */
  function row(labelHtml, id) {
    return (
      '<div class="a11y-row">' +
        '<span class="a11y-row__label">' + labelHtml + '</span>' +
        '<button type="button" class="a11y-switch" id="' + id + '" aria-pressed="false"></button>' +
      '</div>'
    );
  }

  function buildToolbar() {
    var toggle = document.createElement('button');
    toggle.id = 'a11y-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Open reading and accessibility tools');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '🧩';

    var panel = document.createElement('div');
    panel.id = 'a11y-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Reading and accessibility tools');
    panel.hidden = true;
    panel.innerHTML =
      '<h2>✨ Reading &amp; Accessibility</h2>' +
      row('🅱️ Bionic Reading', 'a11y-bionic') +
      row('🔤 Dyslexia-Friendly Mode', 'a11y-dyslexia') +
      row('🔲 High Contrast', 'a11y-contrast') +
      row('🖱️ Big Cursor', 'a11y-bigcursor') +
      row('📏 Reading Ruler', 'a11y-ruler') +
      row('🎧 Speak Card Names on Hover', 'a11y-hoverspeak') +
      row('🐢 Reduce Motion', 'a11y-reducemotion') +
      '<hr class="a11y-hr">' +
      '<div class="a11y-row"><span class="a11y-row__label">🔊 Read This Page</span>' +
        '<button type="button" class="a11y-switch" id="a11y-readpage" aria-pressed="false" style="width:auto;border-radius:999px;background:var(--color-purple);color:#fff;padding:0 12px;font-size:.8rem;font-weight:700;">Play</button>' +
      '</div>' +
      '<hr class="a11y-hr">' +
      '<div class="a11y-row"><span class="a11y-row__label">🔠 Text Size</span>' +
        '<span class="a11y-stepper"><button type="button" id="a11y-font-minus" aria-label="Smaller text">−</button>' +
        '<span id="a11y-font-value">100%</span>' +
        '<button type="button" id="a11y-font-plus" aria-label="Larger text">+</button></span>' +
      '</div>' +
      '<div class="a11y-row"><span class="a11y-row__label">↕️ Line Spacing</span>' +
        '<span class="a11y-stepper"><button type="button" id="a11y-line-minus" aria-label="Less line spacing">−</button>' +
        '<span id="a11y-line-value">1</span>' +
        '<button type="button" id="a11y-line-plus" aria-label="More line spacing">+</button></span>' +
      '</div>' +
      '<button type="button" class="a11y-reset" id="a11y-reset-all">↺ Reset everything</button>';

    document.body.appendChild(panel);
    document.body.appendChild(toggle);

    toggle.addEventListener('click', function () {
      var willShow = panel.hidden;
      panel.hidden = !willShow;
      toggle.setAttribute('aria-expanded', String(willShow));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) {
        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });

    function wireSwitch(id, key, onChange) {
      var btn = document.getElementById(id);
      if (!btn) return;
      function sync() { btn.setAttribute('aria-pressed', String(!!prefs[key])); }
      sync();
      btn.addEventListener('click', function () {
        prefs[key] = !prefs[key];
        sync();
        savePrefs(prefs);
        onChange(prefs[key]);
      });
    }

    wireSwitch('a11y-bionic', 'bionic', function (on) { on ? enableBionic() : disableBionic(); });
    wireSwitch('a11y-dyslexia', 'dyslexia', function (on) { toggleBodyClass('a11y-dyslexia', on); });
    wireSwitch('a11y-contrast', 'contrast', function (on) { toggleBodyClass('a11y-contrast', on); });
    wireSwitch('a11y-bigcursor', 'bigCursor', function (on) { toggleBodyClass('a11y-big-cursor', on); });
    wireSwitch('a11y-ruler', 'ruler', function (on) { toggleBodyClass('a11y-ruler-on', on); if (on) ensureRuler(); });
    wireSwitch('a11y-hoverspeak', 'hoverSpeak', function (on) { setHoverSpeak(on); });
    wireSwitch('a11y-reducemotion', 'reduceMotion', function (on) { toggleBodyClass('a11y-reduce-motion', on); });

    var readBtn = document.getElementById('a11y-readpage');
    readBtn.addEventListener('click', function () {
      speaking = !speaking;
      if (speaking) {
        readBtn.textContent = 'Stop';
        readBtn.setAttribute('aria-pressed', 'true');
        readPageAloud();
      } else {
        readBtn.textContent = 'Play';
        readBtn.setAttribute('aria-pressed', 'false');
        stopSpeaking();
      }
    });
    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener && window.speechSynthesis.addEventListener('end', function () {
        speaking = false;
        readBtn.textContent = 'Play';
        readBtn.setAttribute('aria-pressed', 'false');
      });
    } else {
      readBtn.disabled = true;
      readBtn.title = 'Not supported in this browser';
    }

    function updateFontLabel() { document.getElementById('a11y-font-value').textContent = Math.round(fontScaleFor(prefs.fontStep) * 100) + '%'; }
    function updateLineLabel() { document.getElementById('a11y-line-value').textContent = lineScaleFor(prefs.lineStep); }
    updateFontLabel();
    updateLineLabel();

    document.getElementById('a11y-font-minus').addEventListener('click', function () {
      prefs.fontStep = Math.max(-2, prefs.fontStep - 1);
      applyScales(); updateFontLabel(); savePrefs(prefs);
    });
    document.getElementById('a11y-font-plus').addEventListener('click', function () {
      prefs.fontStep = Math.min(4, prefs.fontStep + 1);
      applyScales(); updateFontLabel(); savePrefs(prefs);
    });
    document.getElementById('a11y-line-minus').addEventListener('click', function () {
      prefs.lineStep = Math.max(0, prefs.lineStep - 1);
      applyScales(); updateLineLabel(); savePrefs(prefs);
    });
    document.getElementById('a11y-line-plus').addEventListener('click', function () {
      prefs.lineStep = Math.min(4, prefs.lineStep + 1);
      applyScales(); updateLineLabel(); savePrefs(prefs);
    });

    document.getElementById('a11y-reset-all').addEventListener('click', function () {
      prefs = Object.assign({}, DEFAULTS);
      savePrefs(prefs);
      disableBionic();
      applyAll();
      ['a11y-bionic','a11y-dyslexia','a11y-contrast','a11y-bigcursor','a11y-ruler','a11y-hoverspeak','a11y-reducemotion'].forEach(function (id) {
        var b = document.getElementById(id);
        if (b) b.setAttribute('aria-pressed', 'false');
      });
      updateFontLabel();
      updateLineLabel();
      readBtn.textContent = 'Play';
      readBtn.setAttribute('aria-pressed', 'false');
      speaking = false;
      stopSpeaking();
    });
  }

  function init() {
    var skip = document.querySelector('.skip-link');
    if (!skip) {
      skip = document.createElement('a');
      skip.className = 'skip-link';
      skip.href = '#main-content';
      skip.textContent = 'Skip to content';
      document.body.insertBefore(skip, document.body.firstChild);
    }
    buildToolbar();
    applyAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
