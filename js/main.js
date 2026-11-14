(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* nav */
  var nav = $('#nav');
  var bar = $('#progress');
  var onScroll = function () {
    nav.classList.toggle('is-stuck', window.scrollY > 40);
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
  };
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  var links = $$('.nav__links a[href^="#"]');
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('is-here', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('section[id]').forEach(function (s) { spy.observe(s); });

    /* reveal */
    var targets = $$('.section__head, .split > *, .findings, .explorer, .plate, .stage, .result, .compare, .g, .reels figure, .work__item, .tools > div, .roadmap li, .about > *, .sub');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (t) { t.classList.add('rv'); io.observe(t); });
  }

  /* lightbox */
  var lb = $('#lb'), lbImg = $('img', lb);
  var closeLb = function () { lb.hidden = true; lbImg.src = ''; document.body.style.overflow = ''; };
  $$('a[data-lb]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      lbImg.src = a.getAttribute('href');
      lbImg.alt = ($('img', a) || {}).alt || '';
      lb.hidden = false; document.body.style.overflow = 'hidden';
    });
  });
  lb.addEventListener('click', closeLb);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

  /* scenario explorer */
  var S = window.SCENARIOS || [];
  if (!S.length || !$('#plot')) return;

  var NOTES = {
    S04: 'Finding: at 21 m/s the obstacle sensor cannot give enough warning. New requirement: plan fixed-wing legs at least 50 m clear of known obstacles.',
    S08: 'Finding: a fixed 35% return rule runs an aged battery flat. New requirement: return on estimated energy, with a 1.3x margin and a 15% reserve.',
    S12: 'Finding: without GNSS the terminated descent drifts 14 m against a 10 m limit. Fed back into the flight termination descent requirement.',
    S09: 'The same aged battery as S08, now with the energy-aware rule: the aircraft turns back early and lands with 35% left.'
  };

  var svg = $('#plot'), NS = 'http://www.w3.org/2000/svg';
  var W = 560, H = 380, m = { l: 48, r: 16, t: 30, b: 40 };
  var xMax = 220, yMax = 80;
  var x = function (v) { return m.l + (v / xMax) * (W - m.l - m.r); };
  var y = function (v) { return H - m.b - (v / yMax) * (H - m.t - m.b); };
  var el = function (n, a, txt) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; };

  [0, 50, 100, 150, 200].forEach(function (v) {
    el('line', { x1: x(v), x2: x(v), y1: y(0), y2: y(yMax), class: v ? 'grid' : 'ax' });
    el('text', { x: x(v), y: H - m.b + 18, 'text-anchor': 'middle' }, v);
  });
  [0, 20, 40, 60, 80].forEach(function (v) {
    el('line', { x1: x(0), x2: x(xMax), y1: y(v), y2: y(v), class: v ? 'grid' : 'ax' });
    el('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end' }, v);
  });
  el('text', { x: x(xMax), y: H - 4, 'text-anchor': 'end' }, 'Mission time (s)');
  el('text', { x: m.l - 30, y: 12 }, 'Energy used (Wh)');

  var css = getComputedStyle(document.documentElement);
  var cOk = css.getPropertyValue('--ok').trim(), cBad = css.getPropertyValue('--accent').trim(), cTxt = css.getPropertyValue('--text').trim();
  var label = el('text', { class: 'lbl', x: 0, y: 0 }, '');
  var pts = {}, rows = {}, selected = null, filter = 'all';
  var tbody = $('#scn-table tbody'), detail = $('#detail');
  var fmt = function (v, d, u) { return v == null ? 'n/a' : v.toFixed(d) + (u || ''); };

  var match = function (s) {
    return filter === 'all' || (filter === 'pass' && s.pass) || (filter === 'fail' && !s.pass) || (filter === 'term' && s.term);
  };

  var show = function (s) {
    selected = s.id;
    Object.keys(pts).forEach(function (id) { pts[id].setAttribute('r', id === s.id ? 9 : 6); rows[id].classList.toggle('is-sel', id === s.id); });
    label.setAttribute('x', Math.min(x(s.t) + 12, W - 150)); label.setAttribute('y', y(s.wh) - 12);
    label.textContent = s.id + ' ' + s.name;
    svg.appendChild(label);
    detail.innerHTML =
      '<p class="detail__id">' + s.id + ' · verifies ' + s.reqs + '</p>' +
      '<h4>' + s.name + '</h4>' +
      '<p class="detail__cond">' + s.cond + '.</p>' +
      '<span class="badge' + (s.pass ? '' : ' badge--fail') + '">' + (s.pass ? 'Pass' : 'Design finding') + (s.term ? ' · flight terminated' : '') + '</span>' +
      (NOTES[s.id] ? '<p class="detail__note">' + NOTES[s.id] + '</p>' : '') +
      '<div class="detail__grid">' +
      '<div><span>Mission time</span><b>' + fmt(s.t, 0, ' s') + '</b></div>' +
      '<div><span>Energy used</span><b>' + fmt(s.wh, 1, ' Wh') + '</b></div>' +
      '<div><span>Battery left</span><b>' + s.soc + '%</b></div>' +
      '<div><span>Release error</span><b>' + (s.rel == null ? 'no release' : fmt(s.rel, 2, ' m')) + '</b></div>' +
      '</div>';
  };

  S.forEach(function (s) {
    var c = el('circle', { class: 'pt', cx: x(s.t), cy: y(s.wh), r: 6, fill: s.pass ? cOk : cBad, stroke: s.term ? cTxt : 'none', 'stroke-width': 1.5, tabindex: 0, role: 'button', 'aria-label': s.id + ' ' + s.name });
    c.addEventListener('mouseenter', function () { show(s); });
    c.addEventListener('click', function () { show(s); });
    c.addEventListener('focus', function () { show(s); });
    pts[s.id] = c;

    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + s.id + '</td><td>' + s.name + '</td><td class="r">' + fmt(s.t, 0, ' s') + '</td><td class="r">' + fmt(s.wh, 1, ' Wh') + '</td><td class="r">' + s.soc + '%</td><td class="r">' + (s.rel == null ? 'n/a' : fmt(s.rel, 2, ' m')) + '</td><td><span class="badge' + (s.pass ? '' : ' badge--fail') + '">' + (s.pass ? 'Pass' : 'Finding') + '</span></td>';
    tr.addEventListener('click', function () { show(s); });
    tbody.appendChild(tr); rows[s.id] = tr;
  });

  $$('.chip').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.dataset.f;
      $$('.chip').forEach(function (o) { o.classList.toggle('is-on', o === b); });
      var first = null;
      S.forEach(function (s) {
        var on = match(s);
        pts[s.id].classList.toggle('is-off', !on); rows[s.id].hidden = !on;
        if (on && !first) first = s;
      });
      var cur = S.filter(function (s) { return s.id === selected; })[0];
      if (first && (!cur || !match(cur))) show(first);
    });
  });

  show(S[0]);
})();
