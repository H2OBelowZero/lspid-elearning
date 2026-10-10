// Moves generated pages onto the shared mySDLR chrome (header nav + search,
// breadcrumb in <main>, wave footer, phone tab bar), adds resource counts and
// icon art to tiles and file details to viewers, and rebuilds
// assets/search-index.js. Pages already converted are left alone, so after
// adding documents run:  node tools/site-chrome.js .
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(process.argv[2] || '.');
const SKIP_DIRS = new Set(['android', 'installer', '.agents', '.claude', '.git', '.serena', 'node_modules', 'web icons', 'downloads', 'graphify-out']);
const HAND_WRITTEN = new Set(['index.html', 'get-app.html', 'browse.html', 'about.html', 'search.html']);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out); }
    else if (e.name.endsWith('.html')) out.push(path.join(dir, e.name));
  }
  return out;
}
const files = walk(ROOT, []).filter(f => !(path.dirname(f) === ROOT && HAND_WRITTEN.has(path.basename(f))));

const rel = f => path.relative(ROOT, f).split(path.sep).join('/');
const decodeHtml = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function fmtSize(bytes) {
  if (bytes == null) return '';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}
function sizeOf(fromFile, href) {
  try { return fs.statSync(path.resolve(path.dirname(fromFile), decodeURIComponent(href))).size; } catch (e) { return null; }
}

/* ---------- pass 1: document index + counts per folder ---------- */
const docs = [];
const countByDir = new Map();
for (const f of files) {
  if (!/[\\/]_view[\\/]/.test(f)) continue;
  const html = fs.readFileSync(f, 'utf8');
  const name = (html.match(/class="doc-view__name">([^<]*)</) || [])[1];
  const kind = (html.match(/class="doc-view__kind">([^<]*)</) || [])[1];
  if (!name) continue;
  const open = (html.match(/class="doc-view__open" href="([^"]+)"/) || [])[1];
  const crumbs = [...(html.match(/<nav class="breadcrumb"[\s\S]*?<\/nav>/) || [''])[0].matchAll(/<a [^>]*>([^<]*)<\/a>/g)]
    .map(m => decodeHtml(m[1]).replace(/^🏠\s*/, '')).filter(t => t !== 'Home');
  docs.push([decodeHtml(name), kind, crumbs.join(' › '), rel(f), fmtSize(open ? sizeOf(f, open) : null)]);
  // leaf folder = parent of _view; credit it and every ancestor
  let d = path.dirname(path.dirname(f));
  while (d.length >= ROOT.length) { countByDir.set(d, (countByDir.get(d) || 0) + 1); if (d === ROOT) break; d = path.dirname(d); }
}
fs.writeFileSync(path.join(ROOT, 'assets/search-index.js'),
  '/* Generated list of every document: [name, kind, trail, viewer path, size]. */\nwindow.SDLR_INDEX=' + JSON.stringify(docs) + ';\n');

/* ---------- tile icon mapping ---------- */
const ICONS = [
  [/annual teaching|\batp\b|^term\b|tearm|weekly planner|daily routine/i, 'ico-atp'],
  [/lesson plan|lesson activit|^l p\b/i, 'ico-lesson'],
  [/work ?book|big book|study note|memo|guide/i, 'ico-workbook'],
  [/assess|rubric|checklist|recording|record of/i, 'ico-assessment'],
  [/power ?point|presentation|slide|digital lesson/i, 'ico-slides'],
  [/polic|caps|overview|programme/i, 'ico-policy'],
  [/life skill/i, 'ico-lifeskills'],
  [/creativ|\bart\b|craft/i, 'ico-creative'],
  [/physical|sport/i, 'ico-physical'],
  [/social|well-?being|personal/i, 'ico-social'],
  [/health|beauty|hair|nail/i, 'ico-health'],
  [/english|language|reading|\bfal\b|\bhl\b/i, 'book'],
  [/math|science|number|data handling|measurement|space|pattern|algebra/i, 'ico-cognitive'],
  [/^grade\b/i, 'ico-lesson'],
  [/^year\b|^yrs?\b/i, 'star'],
  [/fundament/i, 'ico-cognitive'],
  [/skills|maintenance|weld|wood|plumb|brick|motor|mechanic|electric|hospitality|food|wholesale|office|agricult/i, 'trophy'],
];
const iconFor = title => { for (const [re, ico] of ICONS) if (re.test(title)) return ico; return null; };

/* ---------- shared chrome ---------- */
function header(P, active) {
  const link = (href, label, key) =>
    `<a href="${P}${href}"${active === key ? ' class="is-active"' : ''}${key === 'app' ? ' data-get-app' : ''}>${label}</a>`;
  return `<header class="site-header" id="top">
    <div class="site-header__inner">
      <a class="site-logo" href="${P}index.html">
        <img class="site-logo__img" src="${P}img/logo.png" width="440" height="124" alt="mySDLR - my Supplementary Digital Learning Resources">
      </a>
      <nav class="site-nav" aria-label="Main">
        ${link('index.html', 'Home', 'home')}
        ${link('browse.html', 'Browse', 'browse')}
        ${link('get-app.html', 'Get the App', 'app')}
        ${link('about.html', 'About', 'about')}
      </nav>
      <form class="site-search" action="${P}search.html" role="search">
        <input type="search" name="q" placeholder="Search resources..." aria-label="Search resources" autocomplete="off">
        <button type="submit" class="ico" aria-label="Search"><img src="${P}img/ui/search.png" alt="" width="113" height="103"></button>
      </form>
      <button class="theme-toggle" type="button" data-theme-toggle aria-pressed="false" aria-label="Dark mode"><span class="theme-toggle__sun" aria-hidden="true"><img src="${P}img/ui/sun.png" alt="" width="165" height="144"></span><span class="theme-toggle__moon" aria-hidden="true"></span></button>
      <button class="site-a11y ico" type="button" data-a11y-open aria-label="Open reading and accessibility tools" aria-expanded="false" aria-controls="a11y-panel"><img src="${P}img/ui/a11y.png" alt="" width="121" height="101"></button>
    </div>
  </header>`;
}
function footer(P) {
  return `<footer class="site-footer">
    <div class="site-footer__inner">
      <p class="site-footer__brand"><strong>mySDLR</strong><span class="site-footer__sep" aria-hidden="true">|</span>Supporting inclusive education in South Africa<span class="site-footer__flag" role="img" aria-label="South African flag"></span></p>
      <p class="site-footer__links"><a href="${P}index.html">Home</a><a href="${P}browse.html">Browse</a><a href="${P}about.html">About</a><a class="site-footer__top" href="#top">Back to top</a></p>
    </div>
  </footer>
  <nav class="tabbar" aria-label="Quick navigation">
    <a href="${P}index.html"><span class="ico"><img src="${P}img/ui/home.png" alt="" width="105" height="106"></span>Home</a>
    <a href="${P}browse.html"><span class="ico"><img src="${P}img/ui/book.png" alt="" width="120" height="99"></span>Browse</a>
    <a href="${P}get-app.html" data-get-app><span class="ico"><img src="${P}img/ui/down.png" alt="" width="114" height="96"></span>App</a>
    <a href="${P}about.html"><span class="ico ico--free"><img src="${P}img/ui/chat.png" alt="" width="81" height="73"></span>More</a>
  </nav>`;
}
/* ---------- pass 2: rewrite pages ---------- */
let changed = 0, skipped = 0;
for (const f of files) {
  let html = fs.readFileSync(f, 'utf8');
  if (html.includes('class="site-nav"')) { skipped++; continue; }
  const P = (html.match(/<a class="site-logo" href="((?:\.\.\/)*)index\.html"/) || [])[1];
  if (P === undefined) continue;
  const isView = /[\\/]_view[\\/]/.test(f);

  // header → new chrome; breadcrumb moves to the top of <main>
  const crumb = (html.match(/<nav class="breadcrumb"[\s\S]*?<\/nav>/) || [''])[0];
  html = html.replace(/<header class="site-header">[\s\S]*?<\/header>/, header(P, 'browse'));
  html = html.replace(/(<main id="main-content" class="ag-format-container">)/,
    `$1\n    ${crumb.replace('<nav class="breadcrumb"', '<nav class="breadcrumb crumbs"')}`);
  html = html.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, footer(P));

  // tiles: icon art, resource counts, document metadata
  html = html.replace(/<div class="ag-courses_item([^"]*)">\s*<a href="([^"]+)" class="ag-courses-item_link">([\s\S]*?)<\/a>\s*<\/div>/g,
    (all, mod, href, inner) => {
      const title = decodeHtml((inner.match(/ag-courses-item_title">([^<]*)</) || [])[1] || '');
      const tag = (inner.match(/ag-courses-item_tag">([^<]*)</) || [])[1];
      let attrs = '';
      if (tag) {
        const size = fmtSize(sizeOf(f, href.replace(/(?:^|\/)_view\/([^/]+)\.html$/, (m, n) => m.startsWith('/') ? '/' + n : n)));
        attrs = ` data-kind="${tag.toLowerCase()}"`;
        if (size) inner = inner.replace(/(<span class="ag-courses-item_tag">[^<]*<\/span>)/, `$1<span class="ag-courses-item_meta">${size}</span>`);
      } else if (!/--soon/.test(inner)) {
        const ico = iconFor(title);
        if (ico) inner = inner.replace(/<span class="ag-courses-item_icon" aria-hidden="true">[^<]*<\/span>/,
          `<span class="ag-courses-item_icon ag-courses-item_icon--art ico" aria-hidden="true"><img src="${P}img/ui/${ico}.png" alt="" width="128" height="128" loading="lazy"></span>`);
        const n = countByDir.get(path.resolve(path.dirname(f), decodeURIComponent(path.dirname(href))));
        if (n) inner = inner.replace(/(ag-courses-item_title">[^<]*<\/div>)/, `$1\n          <span class="ag-courses-item_meta">${n} resource${n === 1 ? '' : 's'}</span>`);
      }
      return `<div class="ag-courses_item${mod}"${attrs}>\n        <a href="${href}" class="ag-courses-item_link">${inner}</a>\n      </div>`;
    });

  // listing hero: subtitle + count line
  const n = countByDir.get(path.dirname(f));
  const depth = P.length / 3;
  if (!isView && html.includes('class="page-hero"')) {
    const sub = depth === 1 ? '\n      <p class="page-hero__sub">CAPS / SID Curriculum</p>' : '';
    const title = decodeHtml((html.match(/page-hero__title">([^<]*)</) || [])[1] || '');
    const lead = n ? `\n      <p class="page-hero__lead">${depth === 1
      ? `Explore ${n} lesson plans, workbooks, assessments and more for ${esc(title)}. All resources are aligned with the South African CAPS / SID curriculum.`
      : `${n} resource${n === 1 ? '' : 's'} to explore in this section.`}</p>` : '';
    html = html.replace(/(<h1 class="page-hero__title">[^<]*<\/h1>)/, `$1${sub}${lead}`);
  }

  // empty state art
  html = html.replace(/<div class="empty-state__emoji">[^<]*<\/div>/,
    `<img class="empty-state__img" src="${P}img/ui/tablet-buddy.png" alt="" width="216" height="176">`);

  // viewer: title becomes the page h1, plus type · format · size
  if (isView) {
    const kind = (html.match(/class="doc-view__kind">([^<]*)</) || [])[1];
    const open = (html.match(/class="doc-view__open" href="([^"]+)"/) || [])[1];
    const section = decodeHtml((html.match(/class="doc-view__back" href="[^"]*">Back to ([^<]*)</) || [])[1] || '');
    const meta = [section, kind, open ? fmtSize(sizeOf(f, open)) : ''].filter(Boolean).map(esc).join(' • ');
    const label = { PDF: 'Download PDF', Word: 'Download Word file', Slides: 'Download slides' }[kind] || 'Save a copy';
    html = html.replace(/<span class="doc-view__name">([^<]*)<\/span>/,
      `<div class="doc-view__text"><h1 class="doc-view__name">$1</h1><span class="doc-view__meta">${meta}</span></div>`);
    html = html.replace(/(class="doc-view__open"[^>]*>)Save a copy</, `$1${label}<`);
    html = html.replace(/<div class="doc-view">/, `<div class="doc-view" data-kind="${(kind || '').toLowerCase()}">`);
  }

  fs.writeFileSync(f, html);
  changed++;
}
const top = [...countByDir].filter(([d]) => path.dirname(d) === ROOT).map(([d, c]) => path.basename(d) + '=' + c);
console.log({ pages: files.length, changed, skipped, docs: docs.length, top });
