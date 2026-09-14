/* ============================================================
   FAM — логика сайта: попапы по адресу #popup:id, фильтр
   каталога, галерея товара, слайдер отзывов, формы.
   Зависимость: js/catalog-data.js (window.PRODUCTS, window.CATEGORIES)
   ============================================================ */
(function () {
  'use strict';

  var PRODUCTS = window.PRODUCTS || [];
  var CATEGORIES = window.CATEGORIES || [];
  var CAT_TITLE = {};
  CATEGORIES.forEach(function (c) { CAT_TITLE[c.id] = c.title; });

  // артикул вида КХ-01 — считается от порядка товаров внутри категории
  var CAT_CODE = { kitchen:'КХ', wardrobe:'ШК', living:'ГС', bedroom:'СП', kids:'ДТ', hallway:'ПР', sofa:'МГ', office:'КБ' };
  var CODE = {};
  (function () {
    var seen = {};
    PRODUCTS.forEach(function (p) {
      seen[p.cat] = (seen[p.cat] || 0) + 1;
      CODE[p.id] = (CAT_CODE[p.cat] || 'ПЗ') + '-' + ('0' + seen[p.cat]).slice(-2);
    });
  })();

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ——————————————————— ПОПАПЫ ———————————————————
     Адрес вида #popup:order — как на референсе. Попап можно
     открыть ссылкой, кнопкой с data-popup или прямой ссылкой
     из соцсетей: site.ru/#popup:order                        */
  var Popup = (function () {
    var openEl = null;
    function nav(state, url) { try { history.pushState(state, '', url); } catch (e) {} }
    var lastFocus = null;
    var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

    function byId(id) { return $('.popup[data-popup-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]'); }

    function lock() { document.body.classList.add('is-locked'); }
    function unlock() { if (!$('.popup.is-open') && !$('#sidemenu.is-open') && !$('#lightbox.is-open')) document.body.classList.remove('is-locked'); }

    function open(id, opts) {
      opts = opts || {};
      var el = byId(id);
      if (!el) return false;
      if (openEl && openEl !== el) close(openEl, true);
      lastFocus = document.activeElement;
      el.hidden = false;
      lock();
      requestAnimationFrame(function () { el.classList.add('is-open'); });
      openEl = el;
      var focusTarget = el.querySelector('input:not([type=hidden]):not([type=checkbox]), textarea, .btn') || el.querySelector('.popup__close');
      setTimeout(function () { if (focusTarget) { try { focusTarget.focus({ preventScroll: true }); } catch (e) { focusTarget.focus(); } } }, 240);
      if (!opts.silent) nav({ popup: id }, '#popup:' + id);
      document.dispatchEvent(new CustomEvent('popup:open', { detail: { id: id, el: el } }));
      return true;
    }

    function close(el, quiet) {
      el = el || openEl;
      if (!el) return;
      el.classList.remove('is-open');
      var done = function () { el.hidden = true; unlock(); };
      setTimeout(done, 330);
      if (openEl === el) openEl = null;
      if (!quiet) {
        if (location.hash.indexOf('#popup:') === 0) nav('', location.pathname + location.search);
        if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
      }
    }

    // клики: ссылка #popup:xxx, кнопка data-popup, закрытие
    document.addEventListener('click', function (e) {
      var closer = e.target.closest('[data-close]');
      if (closer && closer.closest('.popup')) {
        var win = closer.closest('.popup');
        // «Вернуться к каталогу» — закрыть и проскроллить
        var href = closer.getAttribute('href');
        e.preventDefault();
        close(win);
        if (href && href.charAt(0) === '#' && href.length > 1) {
          var target = document.getElementById(href.slice(1));
          if (target) setTimeout(function () { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
        }
        return;
      }
      var trigger = e.target.closest('.js-popup, [data-popup]');
      if (!trigger) return;
      var id = trigger.dataset.popup ? trigger.dataset.popup.replace('popup:', '') : null;
      if (!id) {
        var h = trigger.getAttribute('href') || '';
        if (h.indexOf('#popup:') === 0) id = h.slice(7);
      }
      if (!id) return;
      e.preventDefault();
      if (trigger.dataset.formTopic) pendingTopic = trigger.dataset.formTopic;
      if (id.indexOf('product-') === 0) openProduct(id.slice(8));
      else open(id);
    });

    document.addEventListener('keydown', function (e) {
      if (!openEl) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') {                       // фокус не уходит из попапа
        var items = $$(FOCUSABLE, openEl).filter(function (el) { return el.offsetParent !== null; });
        if (!items.length) return;
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    window.addEventListener('popstate', function () { route(true); });

    function route(silent) {
      var h = location.hash;
      if (h.indexOf('#popup:') === 0) {
        var id = h.slice(7);
        if (id.indexOf('product-') === 0) openProduct(id.slice(8), true);
        else open(id, { silent: true });
      } else if (openEl) {
        close(openEl, true);
      }
    }

    return { open: open, close: close, route: route, nav: nav, current: function () { return openEl; } };
  })();

  var pendingTopic = '';

  /* ——————————————————— КАТЕГОРИИ ——————————————————— */
  function countIn(cat) { return PRODUCTS.filter(function (p) { return p.cat === cat; }).length; }

  function renderCats() {
    var box = $('#catsGrid');
    if (!box) return;
    box.innerHTML = CATEGORIES.map(function (c, i) {
      var n = countIn(c.id);
      return '<li><button class="dirs__row" type="button" data-cat="' + esc(c.id) + '" data-cover="' + esc(c.cover) + '">' +
        '<span class="dirs__num">' + ('0' + (i + 1)).slice(-2) + '</span>' +
        '<span><span class="dirs__name">' + esc(c.title) + '</span>' +
        '<span class="dirs__note">' + esc(c.note) + '</span></span>' +
        '<span class="dirs__count">' + n + ' ' + plural(n, ['работа', 'работы', 'работ']) + '</span>' +
        '</button></li>';
    }).join('');

    var img = $('#dirsPreview'), cap = $('#dirsPreviewCap');
    box.addEventListener('mouseover', function (e) {
      var b = e.target.closest('[data-cover]');
      if (!b || !img) return;
      img.src = b.dataset.cover;
      if (cap) cap.textContent = $('.dirs__name', b).textContent;
      $$('.dirs__row', box).forEach(function (r) { r.classList.toggle('is-hot', r === b); });
    });
    box.addEventListener('mouseleave', function () {
      $$('.dirs__row', box).forEach(function (r) { r.classList.remove('is-hot'); });
    });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      applyFilter(b.dataset.cat);
      var t = $('#catalog');
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function plural(n, forms) {
    var n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return forms[0];
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
    return forms[2];
  }

  /* ——————————————————— КАТАЛОГ ——————————————————— */
  var PAGE = 5;
  var state = { cat: 'all', shown: PAGE };

  function renderFilters() {
    var box = $('#filters');
    if (!box) return;
    var items = [{ id: 'all', title: 'Все работы', n: PRODUCTS.length }].concat(
      CATEGORIES.map(function (c) { return { id: c.id, title: c.title, n: countIn(c.id) }; })
    ).filter(function (i) { return i.n > 0; });

    box.innerHTML = items.map(function (i) {
      return '<button class="chip' + (i.id === state.cat ? ' is-active' : '') + '" type="button" role="tab" ' +
        'aria-selected="' + (i.id === state.cat) + '" data-filter="' + esc(i.id) + '">' +
        esc(i.title) + '<span>' + i.n + '</span></button>';
    }).join('');

    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]');
      if (b) applyFilter(b.dataset.filter);
    });
  }

  function applyFilter(cat) {
    state.cat = cat;
    state.shown = PAGE;
    $$('#filters .chip').forEach(function (c) {
      var on = c.dataset.filter === cat;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-selected', String(on));
    });
    renderGrid();
  }

  function visible() {
    return state.cat === 'all' ? PRODUCTS : PRODUCTS.filter(function (p) { return p.cat === state.cat; });
  }

  function renderGrid() {
    var grid = $('#grid');
    if (!grid) return;
    var list = visible();
    var slice = list.slice(0, state.shown);

    grid.innerHTML = slice.map(function (p) {
      return '<button class="work" type="button" data-product="' + esc(p.id) + '">' +
        '<span class="work__sheet">' +
          '<img src="' + esc(p.images[0]) + '" alt="' + esc(p.title) + '" loading="lazy" width="1200" height="962">' +
          '<span class="work__open">Смотреть проект</span>' +
        '</span>' +
        '<span class="work__head">' +
          '<span class="work__code">' + esc(CODE[p.id]) + '</span>' +
          '<span class="work__cat">' + esc(CAT_TITLE[p.cat] || '') + '</span>' +
        '</span>' +
        '<span class="work__title">' + esc(p.title) + '</span>' +
        '<span class="work__tag">' + esc(p.tagline) + '</span>' +
        '<span class="work__spec">' + p.badges.map(function (b) { return '<span>' + esc(b) + '</span>'; }).join('') + '</span>' +
        '<span class="work__price">Цена по проекту</span>' +
      '</button>';
    }).join('');

    var empty = $('#gridEmpty');
    if (empty) empty.hidden = list.length !== 0;
    var more = $('#moreBtn');
    if (more) {
      var rest = list.length - slice.length;
      more.hidden = rest <= 0;
      more.textContent = 'Показать ещё ' + Math.min(rest, PAGE) + ' ' + plural(Math.min(rest, PAGE), ['работу', 'работы', 'работ']);
    }
  }

  function initCatalog() {
    renderFilters();
    renderGrid();
    var grid = $('#grid');
    if (grid) grid.addEventListener('click', function (e) {
      var c = e.target.closest('[data-product]');
      if (c) openProduct(c.dataset.product);
    });
    var more = $('#moreBtn');
    if (more) more.addEventListener('click', function () { state.shown += PAGE; renderGrid(); });
  }

  /* ——————————————————— ПОПАП ТОВАРА ——————————————————— */
  var gallery = { images: [], index: 0 };

  function openProduct(id, silent) {
    var p = PRODUCTS.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var body = $('#productBody');
    gallery = { images: p.images.slice(), index: 0 };

    body.innerHTML =
      '<div class="product__gallery">' +
        '<button class="product__stage" id="ppStage" type="button" aria-label="Открыть эскиз во весь экран">' +
          '<img src="' + esc(p.images[0]) + '" alt="' + esc(p.title) + '" width="1200" height="962">' +
        '</button>' +
        '<div class="product__thumbs">' +
          p.images.map(function (src, i) {
            return '<button type="button" class="' + (i === 0 ? 'is-active' : '') + '" data-thumb="' + i + '" aria-label="Изображение ' + (i + 1) + '">' +
              '<img src="' + esc(src) + '" alt="" loading="lazy"></button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="product__info">' +
        '<div class="product__meta"><span>' + esc(CODE[p.id]) + '</span><span>' + esc(CAT_TITLE[p.cat] || '') + '</span></div>' +
        '<h2 class="product__title" id="pp-title">' + esc(p.title) + '</h2>' +
        '<p class="product__tagline">' + esc(p.tagline) + '</p>' +
        '<div class="product__badges">' + p.badges.map(function (b) { return '<span>' + esc(b) + '</span>'; }).join('') + '</div>' +
        '<p class="product__text">' + esc(p.text) + '</p>' +
        '<table class="product__specs"><tbody>' +
          p.specs.map(function (sp) { return '<tr><th>' + esc(sp[0]) + '</th><td>' + esc(sp[1]) + '</td></tr>'; }).join('') +
        '</tbody></table>' +
        '<p class="product__note">Размеры и наполнение в примере — под конкретное помещение. Ваш проект пересчитаем по вашим стенам; стоимость назовём после бесплатного замера.</p>' +
        '<div class="product__cta">' +
          '<button class="btn btn--solid js-popup" data-popup="popup:order" data-form-topic="Заявка по проекту: ' + esc(p.title) + '">Рассчитать под мои размеры</button>' +
          '<a class="btn btn--line" href="https://t.me/family_furnituremsk" target="_blank" rel="noopener">Спросить в Telegram</a>' +
        '</div>' +
      '</div>';

    var stage = $('#ppStage');
    if (stage) {
      stage.addEventListener('click', function () { openLightbox(gallery.index); });
      stage.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(gallery.index); } });
    }
    body.addEventListener('click', function (e) {
      var t = e.target.closest('[data-thumb]');
      if (t) setStage(parseInt(t.dataset.thumb, 10));
    });

    Popup.open('product', { silent: true });
    if (!silent) Popup.nav({ popup: 'product-' + id }, '#popup:product-' + id);
  }

  function setStage(i) {
    gallery.index = i;
    var img = $('#ppStage img');
    if (img) img.src = gallery.images[i];
    $$('#productBody [data-thumb]').forEach(function (b, k) { b.classList.toggle('is-active', k === i); });
  }

  /* ——————————————————— ЛАЙТБОКС ——————————————————— */
  function openLightbox(i) {
    var lb = $('#lightbox');
    if (!lb || !gallery.images.length) return;
    gallery.index = i;
    $('#lightboxImg').src = gallery.images[i];
    lb.hidden = false;
    lb.classList.add('is-open');
    document.body.classList.add('is-locked');
  }
  function closeLightbox() {
    var lb = $('#lightbox');
    if (!lb) return;
    lb.hidden = true;
    lb.classList.remove('is-open');
    if (!$('.popup.is-open')) document.body.classList.remove('is-locked');
  }
  function stepLightbox(d) {
    if (!gallery.images.length) return;
    gallery.index = (gallery.index + d + gallery.images.length) % gallery.images.length;
    $('#lightboxImg').src = gallery.images[gallery.index];
    setStage(gallery.index);
  }
  (function initLightbox() {
    var lb = $('#lightbox');
    if (!lb) return;
    lb.addEventListener('click', function (e) {
      if (e.target.closest('[data-lb-close]') || e.target === lb) return closeLightbox();
      if (e.target.closest('[data-lb-prev]')) return stepLightbox(-1);
      if (e.target.closest('[data-lb-next]')) return stepLightbox(1);
    });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    });
  })();

  /* ——————————————————— БОКОВОЕ МЕНЮ ——————————————————— */
  (function initMenu() {
    var menu = $('#sidemenu'), burger = $('#burger');
    if (!menu || !burger) return;
    function open() {
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
      burger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-locked');
    }
    function close() {
      menu.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      setTimeout(function () {
        menu.hidden = true;
        if (!$('.popup.is-open')) document.body.classList.remove('is-locked');
      }, 380);
    }
    burger.addEventListener('click', function () {
      burger.getAttribute('aria-expanded') === 'true' ? close() : open();
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('[data-close-menu]')) close();
      else if (e.target.closest('a')) setTimeout(close, 60);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) close(); });
  })();

  /* ——————————————————— СЛАЙДЕР ОТЗЫВОВ ——————————————————— */
  (function initSlider() {
    var root = $('#reviewsSlider');
    if (!root) return;
    var track = $('#reviewsTrack'), dots = $('#reviewsDots');
    var slides = $$('.review', track);
    var i = 0, timer;

    function perView() { return 1; }
    function maxIndex() { return Math.max(0, slides.length - perView()); }

    function layout() {
      var w = track.parentElement.clientWidth;
      slides.forEach(function (s) { s.style.flex = '0 0 ' + w + 'px'; });
      go(Math.min(i, maxIndex()));
      renderDots();
    }
    function go(n) {
      i = Math.max(0, Math.min(n, maxIndex()));
      var s = slides[0];
      var step = s.getBoundingClientRect().width;
      track.style.transform = 'translateX(' + (-i * step) + 'px)';
      $$('button', dots).forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
    }
    function renderDots() {
      dots.innerHTML = '';
      for (var k = 0; k <= maxIndex(); k++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Отзыв ' + (k + 1));
        if (k === i) b.className = 'is-active';
        (function (n) { b.addEventListener('click', function () { go(n); restart(); }); })(k);
        dots.appendChild(b);
      }
    }
    function restart() { clearInterval(timer); timer = setInterval(function () { go(i >= maxIndex() ? 0 : i + 1); }, 7000); }

    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-slide]');
      if (!b) return;
      go(b.dataset.slide === 'next' ? i + 1 : i - 1);
      restart();
    });
    // свайп
    var x0 = null;
    track.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) { go(dx < 0 ? i + 1 : i - 1); restart(); }
      x0 = null;
    });
    window.addEventListener('resize', debounce(layout, 150));
    layout();
    restart();
  })();

  /* ——————————————————— ФОРМЫ ——————————————————— */
  function fillSelects() {
    var opts = '<option value="">Не определился — подскажите</option>' +
      CATEGORIES.map(function (c) { return '<option value="' + esc(c.title) + '">' + esc(c.title) + '</option>'; }).join('');
    $$('select[name="category"]').forEach(function (s) { s.innerHTML = opts; });
  }

  function maskPhone(input) {
    input.addEventListener('input', function () {
      var d = input.value.replace(/\D/g, '');
      if (d[0] === '8') d = '7' + d.slice(1);
      if (d[0] !== '7') d = '7' + d;
      d = d.slice(0, 11);
      var out = '+7';
      if (d.length > 1) out += ' (' + d.slice(1, 4);
      if (d.length >= 5) out += ') ' + d.slice(4, 7);
      if (d.length >= 8) out += '-' + d.slice(7, 9);
      if (d.length >= 10) out += '-' + d.slice(9, 11);
      input.value = out;
    });
    input.addEventListener('focus', function () { if (!input.value) input.value = '+7 ('; });
    input.addEventListener('blur', function () { if (input.value.replace(/\D/g, '').length < 2) input.value = ''; });
  }

  function fieldError(input, msg) {
    var field = input.closest('.field');
    if (!field) return;
    field.classList.toggle('has-error', !!msg);
    var box = $('[data-err]', field);
    if (box) box.textContent = msg || '';
  }

  function validate(form) {
    var ok = true;
    $$('input,select,textarea', form).forEach(function (el) {
      if (el.type === 'checkbox') {
        if (el.required && !el.checked) { ok = false; el.closest('.check').style.color = '#c0442e'; }
        else if (el.closest('.check')) el.closest('.check').style.color = '';
        return;
      }
      if (!el.required) return;
      var v = el.value.trim();
      if (el.name === 'phone') {
        if (v.replace(/\D/g, '').length !== 11) { fieldError(el, 'Укажите номер полностью'); ok = false; }
        else fieldError(el, '');
      } else if (!v) {
        fieldError(el, 'Заполните поле'); ok = false;
      } else if (el.name === 'name' && v.length < 2) {
        fieldError(el, 'Слишком короткое имя'); ok = false;
      } else fieldError(el, '');
    });
    return ok;
  }

  function initForms() {
    fillSelects();
    $$('input[type=tel]').forEach(maskPhone);

    $$('form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validate(form)) {
          var bad = $('.has-error input, .has-error select', form);
          if (bad) bad.focus();
          return;
        }
        var btn = $('button[type=submit]', form);
        var label = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Отправляем…'; }

        var data = {
          topic: form.dataset.formTopic || pendingTopic || 'Заявка с сайта',
          page: location.href,
          sentAt: new Date().toISOString()
        };
        new FormData(form).forEach(function (v, k) { if (typeof v === 'string') data[k] = v; });

        /* ————————————————————————————————————————————————
           ЗДЕСЬ ПОДКЛЮЧАЕТСЯ ОТПРАВКА.
           Пример для своего бэкенда / Telegram-бота / CRM:

           fetch('/api/lead', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(data)
           }).then(...)

           Пока заявка просто логируется в консоль.
           ———————————————————————————————————————————————— */
        console.log('Заявка:', data);

        setTimeout(function () {
          if (btn) { btn.disabled = false; btn.textContent = label; }
          form.reset();
          $$('.field', form).forEach(function (f) { f.classList.remove('has-error'); });
          var no = $('#thanksNo');
          if (no) no.textContent = String(Date.now()).slice(-5);
          var t = $('#thanksText');
          if (t) t.textContent = data.name
            ? data.name + ', спасибо! Заявку получили — свяжемся в течение 15 минут в рабочее время.'
            : 'Спасибо! Заявку получили — свяжемся в течение 15 минут в рабочее время.';
          Popup.open('thanks');
        }, 600);
      });

      $$('input,select,textarea', form).forEach(function (el) {
        el.addEventListener('input', function () { if (el.closest('.field.has-error')) fieldError(el, ''); });
      });
    });
  }

  /* ——————————————————— МЕЛОЧИ ——————————————————— */
  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); var a = arguments, c = this; t = setTimeout(function () { fn.apply(c, a); }, ms); };
  }

  function initHeader() {
    var header = $('#header');
    var sections = $$('main section[id]');
    var links = $$('.nav__link');
    function onScroll() {
      var y = window.pageYOffset;
      if (header) header.classList.toggle('is-stuck', y > 20);
      var cur = '';
      sections.forEach(function (s) { if (s.offsetTop - 140 <= y) cur = s.id; });
      links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + cur); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ——————————————————— СТАРТ ——————————————————— */
  document.addEventListener('DOMContentLoaded', function () {
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
    renderCats();
    initCatalog();
    initForms();
    initHeader();
    Popup.route(true);          // открыть попап, если в адресе #popup:xxx
  });

  window.FormaSite = { Popup: Popup, openProduct: openProduct, applyFilter: applyFilter };
})();
