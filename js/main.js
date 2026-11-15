(function () {
  'use strict';
  var doc = document;
  var body = doc.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function qs(s, c) { return (c || doc).querySelector(s); }
  function qsa(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function visible(el) { return el.offsetParent !== null || getComputedStyle(el).position === 'fixed'; }

  var HOURS = {
    0: [],
    1: [[12, 0, 14, 0], [19, 0, 22, 0]],
    2: [[12, 0, 14, 0], [19, 0, 22, 0]],
    3: [[12, 0, 14, 0], [19, 0, 22, 0]],
    4: [[12, 0, 14, 0], [19, 0, 22, 0]],
    5: [[12, 0, 14, 0], [19, 0, 22, 30]],
    6: [[12, 0, 14, 0], [19, 0, 22, 30]]
  };
  var DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  function parisNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (p) { map[p.type] = p.value; });
      var idx = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[map.weekday];
      return { day: idx, min: (parseInt(map.hour, 10) % 24) * 60 + parseInt(map.minute, 10) };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    }
  }
  function fmt(h, m) { return h + 'h' + (m ? (m < 10 ? '0' + m : m) : '00'); }

  function nextOpening(now) {
    for (var i = 0; i < 8; i++) {
      var d = (now.day + i) % 7;
      var slots = HOURS[d];
      for (var s = 0; s < slots.length; s++) {
        var start = slots[s][0] * 60 + slots[s][1];
        if (i > 0 || start > now.min) return { offset: i, day: d, h: slots[s][0], m: slots[s][1] };
      }
    }
    return null;
  }

  function initStatus() {
    var now = parisNow();
    var open = null;
    HOURS[now.day].forEach(function (s) {
      if (now.min >= s[0] * 60 + s[1] && now.min < s[2] * 60 + s[3]) open = s;
    });
    var text;
    if (open) text = 'Ouvert maintenant · jusqu’à ' + fmt(open[2], open[3]);
    else {
      var n = nextOpening(now);
      if (!n) text = 'Fermé';
      else if (n.offset === 0) text = 'Fermé · ouvre à ' + fmt(n.h, n.m);
      else if (n.offset === 1) text = 'Fermé · ouvre demain à ' + fmt(n.h, n.m);
      else text = 'Fermé · ouvre ' + DAYS[n.day] + ' à ' + fmt(n.h, n.m);
    }
    qsa('[data-open-status]').forEach(function (el) {
      el.classList.toggle('closed', !open);
      var span = qs('span', el);
      if (span) span.textContent = text;
    });
    qsa('.hours tr').forEach(function (tr) {
      tr.classList.toggle('today', parseInt(tr.getAttribute('data-day'), 10) === now.day);
    });
  }

  function splitTitles() {
    qsa('.split').forEach(function (title) {
      var index = 0;
      var label = title.textContent.replace(/\s+/g, ' ').trim();
      function wrap(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var frag = doc.createDocumentFragment();
            child.textContent.split(/( +)/).forEach(function (part) {
              if (!part) return;
              if (/^ +$/.test(part)) { frag.appendChild(doc.createTextNode(' ')); return; }
              var w = doc.createElement('span');
              w.className = 'w';
              var wi = doc.createElement('span');
              wi.className = 'wi';
              wi.style.setProperty('--i', index++);
              wi.textContent = part;
              w.appendChild(wi);
              frag.appendChild(w);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1 && !/^(BR|SVG)$/i.test(child.tagName) && !child.classList.contains('sr')) wrap(child);
        });
      }
      wrap(title);
      title.setAttribute('aria-label', label);
      Array.prototype.forEach.call(title.children, function (c) { if (!c.classList.contains('sr')) c.setAttribute('aria-hidden', 'true'); });
    });
  }

  function initReveal() {
    var els = qsa('.rv, .split, .shot');
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  function initHeader() {
    var header = qs('#header');
    var banner = qs('.proposal');
    function size() { if (banner) doc.documentElement.style.setProperty('--bh', banner.offsetHeight + 'px'); }
    function on() { header.classList.toggle('scrolled', window.scrollY > 40); }
    size(); on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', size);
    var seal = qs('.seal');
    if (seal) {
      var resa = qs('#reservation');
      function sealState() {
        var r = resa && visible(resa) ? resa.getBoundingClientRect() : null;
        var inResa = r && r.top < window.innerHeight * 0.7 && r.bottom > 0;
        var onHome = body.getAttribute('data-page') === 'index';
        seal.classList.toggle('hide', Boolean(inResa) || (onHome && window.scrollY < window.innerHeight * 0.7) || body.classList.contains('menu-open'));
      }
      window.addEventListener('scroll', sealState, { passive: true });
      window.addEventListener('hashchange', sealState);
      doc.addEventListener('click', function () { setTimeout(sealState, 60); });
      sealState();
    }
  }

  function initMenu() {
    var btn = qs('#menuBtn');
    var menu = qs('#menu');
    function set(open) {
      menu.classList.toggle('open', open);
      body.classList.toggle('menu-open', open);
      body.classList.toggle('locked', open);
      btn.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      if (open) { var first = qs('.nav a', menu); if (first) first.focus({ preventScroll: true }); }
      else btn.focus({ preventScroll: true });
    }
    btn.addEventListener('click', function () { set(!menu.classList.contains('open')); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) set(false); });
    menu.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (a) { menu.classList.remove('open'); body.classList.remove('menu-open', 'locked'); btn.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true'); }
    });
    qsa('.nav a[data-img]', menu).forEach(function (a) {
      function show() {
        qsa('.menu-fig img', menu).forEach(function (i) { i.classList.toggle('on', i.id === a.getAttribute('data-img')); });
      }
      a.addEventListener('mouseenter', show);
      a.addEventListener('focus', show);
    });
  }

  function initParallax() {
    var els = qsa('[data-speed]');
    var ticking = false;
    function run() {
      ticking = false;
      var vh = window.innerHeight;
      var small = window.innerWidth < 860;
      els.forEach(function (el) {
        if (!visible(el)) return;
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var speed = parseFloat(el.getAttribute('data-speed'));
        if (small && !el.classList.contains('hero-media')) speed *= 0.5;
        var center = r.top + r.height / 2 - vh / 2;
        if (el.classList.contains('hero-media')) center = window.scrollY;
        el.style.translate = '0 ' + (-center * speed * (el.classList.contains('hero-media') ? -1 : 1)).toFixed(1) + 'px';
      });
    }
    if (reduce) return;
    function req() { if (!ticking) { ticking = true; requestAnimationFrame(run); } }
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    run();
  }

  function initWalk() {
    var track = qs('#walkTrack');
    if (!track) return;
    var bar = qs('#walkBar');
    function upd() {
      var w = track.scrollWidth;
      if (!w) return;
      bar.style.width = (track.clientWidth / w * 100) + '%';
      bar.style.left = (track.scrollLeft / w * 100) + '%';
    }
    track.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    qs('#walkPrev').addEventListener('click', function () { track.scrollBy({ left: -track.clientWidth * 0.7, behavior: 'smooth' }); });
    qs('#walkNext').addEventListener('click', function () { track.scrollBy({ left: track.clientWidth * 0.7, behavior: 'smooth' }); });
    var down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; track.classList.add('drag'); }
      track.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', function () { down = false; track.classList.remove('drag'); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') track.scrollBy({ left: 300, behavior: 'smooth' });
      if (e.key === 'ArrowLeft') track.scrollBy({ left: -300, behavior: 'smooth' });
    });
    upd();
  }

  function initCindex() {
    qsa('.cindex-list a[data-ph]').forEach(function (a) {
      function show() {
        var scope = a.closest('.cindex');
        qsa('.cindex-fig img', scope).forEach(function (i) { i.classList.toggle('on', i.id === a.getAttribute('data-ph')); });
      }
      a.addEventListener('mouseenter', show);
      a.addEventListener('focus', show);
    });
  }

  function initCnav() {
    var secs = qsa('.csec');
    var links = qsa('.cnav a');
    if (!secs.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var act = null;
        links.forEach(function (l) {
          var on = l.getAttribute('href').split('/').pop().replace('#', '') === en.target.id;
          l.classList.toggle('on', on);
          if (on) act = l;
        });
        if (act && visible(act)) act.parentNode.scrollTo({ left: act.offsetLeft - 24, behavior: 'smooth' });
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  }

  function initMarks() {
    var btn = qs('#toggleMarks');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var off = body.classList.toggle('marks-off');
      btn.setAttribute('aria-pressed', String(off));
      btn.textContent = off ? 'Afficher les repères' : 'Masquer les repères';
    });
  }

  function initLightbox() {
    var box = qs('#lightbox');
    if (!box) return;
    var holder = qs('#lbArt');
    var cap = qs('#lbCap');
    var items = [];
    var current = 0;
    var lastFocus = null;
    function show(i) {
      current = (i + items.length) % items.length;
      holder.innerHTML = '';
      var img = qs('img', items[current]).cloneNode(true);
      img.removeAttribute('loading');
      holder.appendChild(img);
      cap.textContent = qs('.cap', items[current]).textContent;
    }
    function open(i) {
      lastFocus = doc.activeElement;
      show(i);
      box.classList.add('open');
      box.setAttribute('aria-hidden', 'false');
      body.classList.add('locked');
      qs('.lb-close', box).focus();
    }
    function close() {
      box.classList.remove('open');
      box.setAttribute('aria-hidden', 'true');
      body.classList.remove('locked');
      if (lastFocus) lastFocus.focus();
    }
    doc.addEventListener('click', function (e) {
      var it = e.target.closest ? e.target.closest('.g-item') : null;
      if (!it) return;
      var scope = qs('.page:not([hidden])') || doc;
      items = qsa('.g-item', scope).filter(function (x) { return !x.hidden; });
      var idx = items.indexOf(it);
      if (idx > -1) open(idx);
    });
    qs('.lb-close', box).addEventListener('click', close);
    qs('.lb-prev', box).addEventListener('click', function () { show(current - 1); });
    qs('.lb-next', box).addEventListener('click', function () { show(current + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    doc.addEventListener('keydown', function (e) {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
      if (e.key === 'Tab') {
        var f = qsa('button', box);
        if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    var startX = null;
    box.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  function initFilters() {
    doc.addEventListener('click', function (e) {
      var chip = e.target.closest ? e.target.closest('.chip[data-filter]') : null;
      if (!chip) return;
      var scope = chip.closest('.page') || doc;
      var cat = chip.getAttribute('data-filter');
      qsa('.chip', scope).forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      qsa('[data-cat]', scope).forEach(function (it) { it.hidden = !(cat === 'all' || it.getAttribute('data-cat') === cat); });
    });
  }

  function initResa() {
    var form = qs('#resa');
    if (!form) return;
    var date = qs('#r-date');
    var people = qs('#r-people');
    var out = qs('#r-out');
    var radios = qsa('input[name="service"]', form);
    var now = parisNow();
    function iso(d) {
      var m = d.getMonth() + 1;
      var day = d.getDate();
      return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
    }
    var today = new Date();
    date.min = iso(today);
    var first = new Date(today);
    for (var i = 0; i < 7 && first.getDay() === 0; i++) first.setDate(first.getDate() + 1);
    date.value = iso(first);
    function dayOf(value) {
      var p = value.split('-');
      return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    }
    function longDate(d) {
      return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][d.getMonth()];
    }
    var ARROW = '<span class="ba"><svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></span>';
    function render() {
      if (!date.value) { out.className = 'resa-out'; out.innerHTML = '<p>Choisissez une date pour voir les horaires.</p>'; return; }
      var d = dayOf(date.value);
      var slots = HOURS[d.getDay()];
      var lunch = slots[0];
      var dinner = slots[1];
      qs('#r-lunch').textContent = lunch ? fmt(lunch[0], lunch[1]) + ' – ' + fmt(lunch[2], lunch[3]) : 'Fermé';
      qs('#r-dinner').textContent = dinner ? fmt(dinner[0], dinner[1]) + ' – ' + fmt(dinner[2], dinner[3]) : 'Fermé';
      radios.forEach(function (r) { r.disabled = !slots.length; });
      var n = parseInt(people.value, 10);
      var persons = n >= 9 ? '9 personnes ou plus' : n + (n > 1 ? ' personnes' : ' personne');
      if (!slots.length) {
        out.className = 'resa-out closed';
        out.innerHTML = '<div><b>Fermé le dimanche</b>Le restaurant ouvre du lundi au samedi. Choisissez une autre date.</div><div class="resa-actions"><a class="btn btn-fill" href="tel:+33248682270"><span class="bt">Appeler le 02 48 68 22 70</span></a></div>';
        return;
      }
      var service = qs('input[name="service"]:checked', form).value;
      var slot = service === 'midi' ? lunch : dinner;
      var msg = 'Bonjour, je souhaite réserver une table pour ' + persons + ' le ' + longDate(d) + ' (' + (service === 'midi' ? 'déjeuner' : 'dîner') + ').';
      out.className = 'resa-out';
      out.innerHTML = '<div><b>' + persons.charAt(0).toUpperCase() + persons.slice(1) + ', ' + longDate(d) + '</b>' + (service === 'midi' ? 'Déjeuner' : 'Dîner') + ' · service de ' + fmt(slot[0], slot[1]) + ' à ' + fmt(slot[2], slot[3]) + '. Confirmez votre table par téléphone ou en ligne.</div>' +
        '<div class="resa-actions"><a class="btn btn-fill" href="tel:+33248682270"><span class="bt">Appeler pour réserver</span></a>' +
        '<a class="btn btn-ghost-d" href="https://www.chezpopote.fr/" target="_blank" rel="noopener"><span class="bt">Réserver en ligne</span></a>' +
        '<button class="btn btn-ghost-d" type="button" id="r-copy"><span class="bt">Copier ma demande</span></button></div>';
      var copy = qs('#r-copy');
      copy.addEventListener('click', function () {
        var label = qs('.bt', copy);
        function done(ok) { label.textContent = ok ? 'Demande copiée' : 'Copie impossible'; setTimeout(function () { label.textContent = 'Copier ma demande'; }, 2200); }
        try { navigator.clipboard.writeText(msg).then(function () { done(true); }, function () { done(false); }); }
        catch (e) { done(false); }
      });
    }
    form.addEventListener('change', render);
    form.addEventListener('input', render);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    if (HOURS[now.day].length && qs('input[value="soir"]', form) && now.min >= 14 * 60) qs('input[value="soir"]', form).checked = true;
    render();
  }

  function initForm() {
    var form = qs('#contact-form');
    if (!form) return;
    var phoneRe = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.\-]*\d{2}){4}$/;
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var rules = {
      nom: function (v) { return v.trim().length >= 2 ? '' : 'Indiquez votre nom.'; },
      tel: function (v) { return !v.trim() || phoneRe.test(v.trim()) ? '' : 'Indiquez un numéro valide (ex. 02 48 68 22 70).'; },
      email: function (v) { return emailRe.test(v.trim()) ? '' : 'Indiquez une adresse e-mail valide.'; },
      sujet: function (v) { return v ? '' : 'Choisissez l’objet de votre demande.'; },
      message: function (v) { return v.trim().length >= 10 ? '' : 'Écrivez votre message (10 caractères minimum).'; }
    };
    function setError(name, msg) {
      var input = form.elements[name];
      var field = input.closest('.field');
      if (field) field.classList.toggle('invalid', Boolean(msg));
      qs('#' + name + '-err').textContent = msg;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    function validate(name) {
      var el = form.elements[name];
      var msg = name === 'consent' ? (el.checked ? '' : 'Votre accord est nécessaire pour traiter la demande.') : rules[name](el.value);
      setError(name, msg);
      return !msg;
    }
    var names = Object.keys(rules).concat(['consent']);
    names.forEach(function (n) {
      var el = form.elements[n];
      ['blur', 'input', 'change'].forEach(function (ev) {
        el.addEventListener(ev, function () { if (ev === 'blur' || el.getAttribute('aria-invalid') === 'true') validate(n); });
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.elements.website.value) return;
      var firstInvalid = null;
      names.forEach(function (n) { if (!validate(n) && !firstInvalid) firstInvalid = form.elements[n]; });
      if (firstInvalid) { firstInvalid.focus(); return; }
      var endpoint = form.getAttribute('data-endpoint');
      function finish() { form.classList.remove('sending'); form.classList.add('done'); qs('#formOk').focus(); }
      form.classList.add('sending');
      if (!endpoint) { setTimeout(finish, 800); return; }
      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('send'); finish(); })
        .catch(function () {
          form.classList.remove('sending');
          qs('#consent-err').textContent = 'L’envoi a échoué. Appelez-nous au 02 48 68 22 70.';
        });
    });
  }


  function initCookies() {
    var KEY = 'cp_consent';
    var box = qs('#ck');
    if (!box) return;
    var main = qs('.ck-main', box), set = qs('.ck-set', box), cb = qs('#ck-maps');
    function read() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
    function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
    function show(panel) {
      main.hidden = panel === 'set';
      set.hidden = panel !== 'set';
      var c = read(); cb.checked = !!(c && c.maps);
      box.hidden = false; box.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(function () { box.classList.add('show'); });
      var f = qs(panel === 'set' ? '.ck-set .ck-btn' : '.ck-main .ck-btn', box); if (f) f.focus();
    }
    function hide() {
      box.classList.remove('show'); box.setAttribute('aria-hidden', 'true');
      setTimeout(function () { if (!box.classList.contains('show')) box.hidden = true; }, 600);
    }
    function apply(c) {
      qsa('iframe[data-consent]').forEach(function (f) {
        var on = !!c[f.getAttribute('data-consent')];
        var wrap = f.parentNode;
        if (on) { if (f.getAttribute('src') !== f.getAttribute('data-src')) f.setAttribute('src', f.getAttribute('data-src')); wrap.classList.add('on'); }
        else { f.removeAttribute('src'); wrap.classList.remove('on'); }
      });
    }
    function save(c) { write({ maps: !!c.maps, t: Date.now() }); apply(c); hide(); }
    box.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      if (t.hasAttribute('data-ck-all')) save({ maps: true });
      else if (t.hasAttribute('data-ck-none')) save({ maps: false });
      else if (t.hasAttribute('data-ck-custom')) show('set');
      else if (t.hasAttribute('data-ck-back')) show('main');
      else if (t.hasAttribute('data-ck-save')) save({ maps: cb.checked });
    });
    document.addEventListener('click', function (e) {
      var o = e.target.closest('[data-ck-open]');
      if (o) { show('main'); return; }
      var a = e.target.closest('[data-ck-allow]');
      if (a) { var c = read() || {}; c.maps = true; save(c); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('show') && read()) hide(); });
    var c0 = read();
    if (c0) apply(c0); else { apply({}); setTimeout(function () { show('main'); }, 900); }
  }

  splitTitles();
  initReveal();
  initStatus();
  initHeader();
  initMenu();
  initParallax();
  initWalk();
  initCindex();
  initCnav();
  initMarks();
  initLightbox();
  initFilters();
  initResa();
  initForm();
  initCookies();
})();
