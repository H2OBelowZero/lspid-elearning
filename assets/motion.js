/* ============================================================
   motion.js - shared interaction and motion layer
   E-Learning for LSPID

   Loaded synchronously in <head> so the "js-motion" flag lands before
   first paint and reveal targets never flash in and back out.

   Design rules this file follows:
   - Only transform and opacity are animated on page elements. The hero
     shader and confetti draw on their own canvases and pause off screen.
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

  /* ----------------------------------------------------------
     Light / dark theme
     The learner's choice is remembered; with no choice the page
     follows the device. Set here, before first paint, so a dark
     page never flashes white. The Android app is told too, so the
     status bar and the WebView behind the page match.
     ---------------------------------------------------------- */
  var THEME_KEY = 'lspid-theme';
  var darkQuery = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : { matches: false };

  function storedTheme() {
    try {
      var t = window.localStorage.getItem(THEME_KEY);
      return t === 'dark' || t === 'light' ? t : null;
    } catch (e) {
      return null;
    }
  }

  function applyTheme() {
    var theme = storedTheme() || (darkQuery.matches ? 'dark' : 'light');
    root.setAttribute('data-theme', theme);
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', theme === 'dark' ? '#0c1620' : '#ffffff');
    var toggles = document.querySelectorAll('[data-theme-toggle]');
    for (var j = 0; j < toggles.length; j++) {
      toggles[j].setAttribute('aria-pressed', String(theme === 'dark'));
    }
    if (window.SDLRApp && window.SDLRApp.setTheme) {
      try { window.SDLRApp.setTheme(theme === 'dark'); } catch (e) { /* older app build */ }
    }
    if (typeof window.CustomEvent === 'function') {
      document.dispatchEvent(new CustomEvent('sdlr-theme', { detail: theme }));
    }
    return theme;
  }

  /* A soft circle of the new background grows from the button that was
     pressed, then the page switches underneath it and the circle fades. */
  function themeWipe(theme, origin, done) {
    if (!root.classList.contains('js-motion') || !origin || !document.body) { done(); return; }
    var rect = origin.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    var veil = document.createElement('div');
    veil.className = 'theme-veil';
    veil.setAttribute('aria-hidden', 'true');
    veil.style.setProperty('--x', x + 'px');
    veil.style.setProperty('--y', y + 'px');
    veil.style.background = theme === 'dark' ? '#0c1620' : '#eaf6fc';
    document.body.appendChild(veil);
    veil.getBoundingClientRect(); /* commit the start frame */
    veil.classList.add('is-growing');
    window.setTimeout(function () {
      done();
      veil.classList.add('is-fading');
      window.setTimeout(function () { veil.remove(); }, 420);
    }, 460);
  }

  window.sdlrTheme = {
    get: function () { return root.getAttribute('data-theme'); },
    /* 'dark', 'light', or null to follow the device again */
    set: function (theme, origin) {
      var next = theme || (darkQuery.matches ? 'dark' : 'light');
      themeWipe(next, origin, function () {
        try {
          if (theme) window.localStorage.setItem(THEME_KEY, theme);
          else window.localStorage.removeItem(THEME_KEY);
        } catch (e) { /* storage blocked: still switch for this page */ root.setAttribute('data-theme', next); return; }
        applyTheme();
      });
    },
    toggle: function (origin) {
      this.set(this.get() === 'dark' ? 'light' : 'dark', origin);
    }
  };

  applyTheme();
  if (darkQuery.addEventListener) {
    darkQuery.addEventListener('change', function () { if (!storedTheme()) applyTheme(); });
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
      ['.hero__copy > *', ''],
      ['.app-hero', 'soft'],
      ['.page-hero', 'soft'],
      ['.section-title', ''],
      ['.res-tile', ''],
      ['.quick-card', ''],
      ['.ag-courses_item', ''],
      ['.list-row', ''],
      ['.app-card', ''],
      ['.journey', 'soft'],
      ['.prose-card', ''],
      ['.doc-view__id', ''],
      ['.empty-state', 'soft'],
      ['.site-footer__inner', '']
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
      var card = e.target.closest && e.target.closest('.ag-courses-item_link, .res-tile');
      if (!card) return;
      pending = { card: card, x: e.clientX, y: e.clientY };
      if (!frame) frame = window.requestAnimationFrame(paint);
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     Page chrome: tab bar state, viewer actions, offline-app flag.
     Runs whether or not motion is on.
     ---------------------------------------------------------- */
  function enhanceChrome() {
    /* Theme buttons; aria-pressed is synced now that they exist */
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-theme-toggle]');
      if (btn) window.sdlrTheme.toggle(btn);
    });
    applyTheme();

    /* The full offline app hides links to the download page */
    if (location.hostname === 'appassets.androidplatform.net') root.classList.add('in-app');

    /* Highlight the tab for this page; anything deeper sits under Browse */
    var tabs = document.querySelectorAll('.tabbar a');
    if (tabs.length) {
      var norm = function (u) { return u.split(/[?#]/)[0].replace(/index\.html$/, ''); };
      var here = norm(location.href);
      var active = tabs[1];
      for (var i = 0; i < tabs.length; i++) if (norm(tabs[i].href) === here) active = tabs[i];
      active.classList.add('is-active');
      active.setAttribute('aria-current', 'page');
    }

    /* Viewer: gather the download button with "open in new tab" (PDFs)
       and "share" into one action row under the document.
       Inside the Android app (window.SDLRApp) the WebView can neither draw
       a PDF nor open a new tab, so the PDF frame becomes a card that hands
       the file to the phone's own viewer, and sharing goes through the app. */
    var app = window.SDLRApp;
    var open = document.querySelector('.doc-view__open');
    var view = document.querySelector('.doc-view');
    if (open && view && !view.querySelector('.doc-view__actions')) {
      var kind = view.getAttribute('data-kind');
      var row = document.createElement('div');
      row.className = 'doc-view__actions';
      row.appendChild(open);
      if (app) {
        open.removeAttribute('download');
        open.textContent = { pdf: 'Open PDF', word: 'Open Word file', slides: 'Open slides' }[kind] || 'Open document';
        var frame = view.querySelector('iframe.doc-view__frame');
        if (frame) {
          var card = document.createElement('div');
          card.className = 'doc-view__app';
          var badge = document.createElement('span');
          badge.className = 'doc-view__kind';
          badge.textContent = kind === 'pdf' ? 'PDF' : 'DOC';
          var note = document.createElement('p');
          note.textContent = 'This document opens in your phone\'s own reader app.';
          var go = document.createElement('a');
          go.className = 'btn';
          go.href = frame.getAttribute('src');
          go.textContent = open.textContent;
          card.appendChild(badge);
          card.appendChild(note);
          card.appendChild(go);
          frame.parentNode.replaceChild(card, frame);
        }
      } else if (kind === 'pdf') {
        var tab = document.createElement('a');
        tab.className = 'doc-view__action';
        tab.href = open.href;
        tab.target = '_blank';
        tab.rel = 'noopener';
        tab.textContent = 'Open in New Tab';
        row.appendChild(tab);
      }
      var share = document.createElement('button');
      share.type = 'button';
      share.className = 'doc-view__action doc-view__action--share';
      share.textContent = 'Share';
      share.addEventListener('click', function () {
        var url = location.href;
        if (app && app.share) {
          app.share(document.title, url);
        } else if (navigator.share) {
          navigator.share({ title: document.title, url: url }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function () {
            share.textContent = 'Link copied!';
            setTimeout(function () { share.textContent = 'Share'; }, 2000);
          }, function () { window.prompt('Copy this link:', url); });
        } else {
          window.prompt('Copy this link:', url);
        }
      });
      row.appendChild(share);
      view.appendChild(row);
    }
  }

  /* ----------------------------------------------------------
     Hero effects: a WebGL "liquid colour" shader behind the home
     hero and a drifting confetti layer. Both pause when the hero is
     off screen or the tab is hidden, and render at reduced resolution
     so low-end phones stay smooth. Without WebGL the CSS gradient
     underneath is the fallback.
     ---------------------------------------------------------- */
  var heroCtl = { visible: true, loops: [] };

  function makeLoop(step, fps, onStop) {
    var running = false;
    var last = 0;
    function frame(now) {
      if (!heroCtl.visible || document.hidden || !root.classList.contains('js-motion')) {
        running = false;
        if (onStop) onStop();
        return;
      }
      if (now - last >= 1000 / fps - 2) { last = now; step(now); }
      window.requestAnimationFrame(frame);
    }
    function kick() {
      if (running) return;
      running = true;
      window.requestAnimationFrame(frame);
    }
    heroCtl.loops.push(kick);
    kick();
  }
  function kickLoops() { heroCtl.loops.forEach(function (k) { k(); }); }

  var SHADER_FRAG = [
    'precision mediump float;',
    'uniform vec2 r;uniform float t;uniform float m;',
    'const vec3 c1=vec3(.72,.19,.10),c2=vec3(.88,.29,.11),c3=vec3(.95,.51,.10),c4=vec3(.99,.72,.08),c5=vec3(.91,.21,.37);',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int k=0;k<4;k++){v+=a*n(p);p*=2.03;a*=.5;}return v;}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/r;',
    ' vec2 p=uv*vec2(r.x/r.y,1.)*1.7;',
    ' float s=t*.07;',
    ' vec2 q=vec2(fbm(p+s),fbm(p+vec2(5.2,1.3)-s));',
    ' float f=fbm(p+2.2*q+vec2(s*.7,-s*.4));',
    /* m = 1 on narrow screens: text sits on top, so the deep colour runs top to bottom */
    ' float x=mix(uv.x,(1.-uv.y)*.75,m)+(f-.5)*.4;',
    ' vec3 col=mix(c1,c2,smoothstep(0.,.35,x));',
    ' col=mix(col,c3,smoothstep(.36,.62,x));',
    ' col=mix(col,c4,smoothstep(.62,.92,x));',
    ' col=mix(col,c5,smoothstep(.5,.85,q.y)*smoothstep(.45,.95,x)*.5);',
    ' col+=vec3(1.,.95,.8)*pow(max(0.,1.-length(uv-vec2(.94,.96))*1.5),2.)*.5;',
    /* keep the text side deep enough for white text */
    ' col*=mix(.84,1.,smoothstep(0.,.55,x));',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');

  function startShader(canvas, still) {
    var gl;
    try { gl = canvas.getContext('webgl', { antialias: false, depth: false, powerPreference: 'low-power' }); } catch (e) { return; }
    if (!gl) return;
    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = compile(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}');
    var fs = compile(gl.FRAGMENT_SHADER, SHADER_FRAG);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uR = gl.getUniformLocation(prog, 'r');
    var uT = gl.getUniformLocation(prog, 't');
    var uM = gl.getUniformLocation(prog, 'm');
    var narrow = window.matchMedia ? window.matchMedia('(max-width: 860px)') : { matches: false };
    var t0 = performance.now() - 40000;

    /* Half resolution: the image is soft by design, so it costs a quarter */
    function fit() {
      var w = Math.max(1, Math.round(canvas.clientWidth * 0.5));
      var h = Math.max(1, Math.round(canvas.clientHeight * 0.5));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
    }
    function draw(now) {
      fit();
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, (now - t0) / 1000);
      gl.uniform1f(uM, narrow.matches ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    draw(performance.now());
    canvas.classList.add('is-live');
    /* a paused or still shader must still follow the hero size */
    window.addEventListener('resize', function () { draw(performance.now()); }, { passive: true });
    if (!still) makeLoop(draw, 30);
  }

  var CONFETTI = ['#ffffff', '#ffd84a', '#7ac142', '#2aa9e0', '#e8365d', '#fdb813'];

  function startParticles(canvas, hero) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, parts = [], pointer = null;

    function spawn(anywhere) {
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + 24,
        r: 2.5 + Math.random() * 4.5,
        len: Math.random() < 0.5 ? 9 + Math.random() * 14 : 0,  /* paint splash or dot */
        a: Math.random() * 6.283,
        va: (Math.random() - 0.5) * 0.03,
        vy: 0.25 + Math.random() * 0.6,
        sway: Math.random() * 6.283,
        c: CONFETTI[(Math.random() * CONFETTI.length) | 0],
        o: 0.35 + Math.random() * 0.5
      };
    }
    function fit() {
      if (canvas.clientWidth === w && canvas.clientHeight === h) return;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.max(14, Math.min(42, Math.round(w * h / 13000)));
      while (parts.length < count) parts.push(spawn(true));
      parts.length = count;
    }
    function draw() {
      fit();
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.sway += 0.012;
        p.y -= p.vy;
        p.x += Math.sin(p.sway) * 0.35;
        p.a += p.va;
        if (pointer) {
          /* gentle push away from the finger or cursor */
          var dx = p.x - pointer.x, dy = p.y - pointer.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100 && d > 0.5) { var f = (1 - d / 100) * 2.2; p.x += dx / d * f; p.y += dy / d * f; }
        }
        if (p.y < -30) parts[i] = p = spawn(false);
        ctx.globalAlpha = p.o;
        if (p.len) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.a);
          ctx.strokeStyle = p.c;
          ctx.lineWidth = p.r;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-p.len / 2, 0);
          ctx.lineTo(p.len / 2, 0);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.fillStyle = p.c;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.6, 0, 6.283);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    hero.addEventListener('pointermove', function (e) {
      var rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { pointer = null; });
    makeLoop(draw, 60, function () { if (!root.classList.contains('js-motion')) ctx.clearRect(0, 0, w, h); });
  }

  function startHeroFx(still) {
    var hero = document.querySelector('[data-fx]');
    if (!hero) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        heroCtl.visible = entries[0].isIntersecting;
        if (heroCtl.visible) kickLoops();
      }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kickLoops(); });
    var shader = hero.querySelector('.hero__shader');
    var dots = hero.querySelector('.hero__particles');
    if (shader) startShader(shader, still);
    if (dots && !still) startParticles(dots, hero);
  }

  /* ----------------------------------------------------------
     Tap bursts: a small spray of confetti where a tile or button is
     pressed. One shared overlay canvas, created on demand and removed
     as soon as the last particle fades.
     ---------------------------------------------------------- */
  function startBursts() {
    var canvas = null, ctx = null, parts = [], raf = 0, dpr = 1;

    function frame() {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      parts = parts.filter(function (p) { return p.life > 0; });
      parts.forEach(function (p) {
        p.life--;
        p.vx *= 0.9;
        p.vy = p.vy * 0.9 + 0.28;
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.va;
        var k = p.life / p.max;
        ctx.globalAlpha = k;
        ctx.fillStyle = p.c;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.scale(0.6 + k * 0.4, 0.6 + k * 0.4);
        ctx.fillRect(-p.s, -p.s / 2.5, p.s * 2, p.s / 1.25);
        ctx.restore();
      });
      ctx.globalAlpha = 1;
      if (parts.length) { raf = window.requestAnimationFrame(frame); return; }
      canvas.remove();
      canvas = null;
      raf = 0;
    }

    document.addEventListener('pointerdown', function (e) {
      if (!root.classList.contains('js-motion')) return;
      if (!(e.target.closest && e.target.closest('.ag-courses-item_link, .res-tile, .btn, .btn-home, .quick-card, .list-row, .app-card .btn, .tabbar a'))) return;
      if (!canvas) {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas = document.createElement('canvas');
        canvas.className = 'fx-burst';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.width = Math.round(window.innerWidth * dpr);
        canvas.height = Math.round(window.innerHeight * dpr);
        ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        document.body.appendChild(canvas);
      }
      for (var i = 0; i < 16; i++) {
        var ang = Math.random() * 6.283, sp = 3 + Math.random() * 5, life = 34 + (Math.random() * 22 | 0);
        parts.push({
          x: e.clientX, y: e.clientY,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2.5,
          a: ang, va: (Math.random() - 0.5) * 0.4,
          s: 3 + Math.random() * 3,
          c: CONFETTI[1 + (Math.random() * (CONFETTI.length - 1) | 0)],
          life: life, max: life
        });
      }
      if (!raf) raf = window.requestAnimationFrame(frame);
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     Live response to the in-page "Reduce motion" toggle
     ---------------------------------------------------------- */
  function watchManualToggle() {
    if (!('MutationObserver' in window)) return;
    new MutationObserver(function () {
      var off = document.body.classList.contains('a11y-reduce-motion');
      root.classList.toggle('js-motion', !off);
      if (off) revealAll(); else kickLoops();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  /* ----------------------------------------------------------
     Boot
     ---------------------------------------------------------- */
  function init() {
    enhanceChrome();
    startHeroFx(motionOff);

    if (motionOff) {
      markRevealTargets();
      revealAll();
      return;
    }

    markRevealTargets();
    startRevealObserver();
    startHeaderObserver();
    startSpotlight();
    startBursts();
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
