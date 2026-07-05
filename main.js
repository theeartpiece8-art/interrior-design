/* MAC SPACE STUDIO — shared site JS v3
   Handles: dark/light theme, full-screen nav overlay, contact form,
   regional clock ticker, scroll-reveal, custom cursor, horizontal-scroll
   drag galleries, hover-preview service list, portfolio/blog filters,
   mock shopping cart, mock checkout. */

/* =========================================================
   SUPABASE BACKEND CONNECTION
   Fill in backend-config.js with the two public values from:
   Supabase Dashboard > Project Settings > API.
   The anon key is safe to expose only because Row Level
   Security allows inserts, never reads/updates/deletes.
   ========================================================= */
var BACKEND_CONFIG = window.STUDIO_BACKEND_CONFIG || {};
var SUPABASE_URL = (BACKEND_CONFIG.supabaseUrl || '').replace(/\/$/, '');
var SUPABASE_ANON_KEY = BACKEND_CONFIG.supabaseAnonKey || '';
var BACKEND_SETUP_MESSAGE = 'Backend setup is not complete yet. Please add your Supabase URL and anon key in backend-config.js.';

function backendReady() {
  return /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 40;
}

var SUPABASE_CLIENT = null;
var SUPABASE_CLIENT_PROMISE = null;

function loadSupabaseClientScript() {
  if (window.supabase && window.supabase.createClient) return Promise.resolve();
  if (SUPABASE_CLIENT_PROMISE) return SUPABASE_CLIENT_PROMISE;

  SUPABASE_CLIENT_PROMISE = new Promise(function (resolve, reject) {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async = true;
    script.onload = function () { resolve(); };
    script.onerror = function () { reject(new Error('Could not load Supabase client')); };
    document.head.appendChild(script);
  });

  return SUPABASE_CLIENT_PROMISE;
}

function getSupabaseClient() {
  if (!backendReady()) return Promise.reject(new Error('Supabase config missing'));
  if (SUPABASE_CLIENT) return Promise.resolve(SUPABASE_CLIENT);

  return loadSupabaseClientScript().then(function () {
    SUPABASE_CLIENT = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return SUPABASE_CLIENT;
  });
}

function sbInsert(table, row, options) {
  return getSupabaseClient().then(function (client) {
    var query = client.from(table);
    var request = options && options.ignoreDuplicates
      ? query.upsert(row, { onConflict: options.onConflict, ignoreDuplicates: true })
      : query.insert(row);

    return request.then(function (result) {
      if (result.error) throw result.error;
      return result.data;
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {

  /* =========================================================
     THEME TOGGLE (dark default, light optional, persisted)
     ========================================================= */
  var root = document.documentElement;
  var THEME_KEY = 'studioTheme';
  try {
    var savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light') root.setAttribute('data-theme', 'light');
  } catch (e) {}

  function syncThemeLabel() {
    var isLight = root.getAttribute('data-theme') === 'light';
    document.querySelectorAll('.theme-toggle-label').forEach(function (label) {
      label.textContent = isLight ? 'Light mode' : 'Dark mode';
    });
  }
  syncThemeLabel();

  document.querySelectorAll('.theme-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var isLight = root.getAttribute('data-theme') === 'light';
      if (isLight) {
        root.removeAttribute('data-theme');
        try { localStorage.setItem(THEME_KEY, 'dark'); } catch (e) {}
      } else {
        root.setAttribute('data-theme', 'light');
        try { localStorage.setItem(THEME_KEY, 'light'); } catch (e) {}
      }
      syncThemeLabel();
    });
  });

  /* =========================================================
     CUSTOM CURSOR
     ========================================================= */
  var cursor = document.querySelector('.cursor-dot');
  if (cursor && window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('mousemove', function (e) {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      cursor.classList.add('active');
    });
    document.querySelectorAll('a, button, .filter-btn, .hover-list li').forEach(function (el) {
      el.addEventListener('mouseenter', function () { cursor.classList.add('grow'); });
      el.addEventListener('mouseleave', function () { cursor.classList.remove('grow'); });
    });
    document.addEventListener('mouseleave', function () { cursor.classList.remove('active'); });
  }

  /* =========================================================
     FULL-SCREEN NAV OVERLAY
     ========================================================= */
  var menuTrigger = document.querySelector('.menu-trigger');
  var navOverlay = document.querySelector('.nav-overlay');
  var navOverlayClose = document.querySelector('.nav-overlay-close');

  function openNavOverlay() {
    if (!navOverlay) return;
    navOverlay.classList.add('open');
    if (menuTrigger) menuTrigger.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeNavOverlay() {
    if (!navOverlay) return;
    navOverlay.classList.remove('open');
    if (menuTrigger) menuTrigger.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (menuTrigger) {
    menuTrigger.addEventListener('click', function () {
      if (navOverlay.classList.contains('open')) closeNavOverlay();
      else openNavOverlay();
    });
  }
  if (navOverlayClose) navOverlayClose.addEventListener('click', closeNavOverlay);
  if (navOverlay) {
    navOverlay.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNavOverlay);
    });
  }

  /* Close the nav overlay with the Escape key */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeNavOverlay(); }
  });

  /* =========================================================
     LET'S TALK FORM (contact.html)
     ========================================================= */
  var talkForm = document.querySelector('.talk-form');
  if (talkForm) {
    talkForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var confirmationEl = document.querySelector('.talk-confirmation');
      var talkBtn = talkForm.querySelector('button[type="submit"]');

      function showTalkConfirmation() {
        talkForm.style.display = 'none';
        if (confirmationEl) confirmationEl.style.display = 'block';
      }

      if (!backendReady()) { alert(BACKEND_SETUP_MESSAGE); return; }

      var row = {
        name: (talkForm.querySelector('input[type="text"]') || {}).value || '',
        email: (talkForm.querySelector('input[type="email"]') || {}).value || '',
        message: (talkForm.querySelector('textarea') || {}).value || ''
      };

      if (!row.name.trim() || !row.email.trim() || !row.message.trim()) {
        alert('Please fill in your name, email and message.');
        return;
      }

      if (talkBtn) { talkBtn.disabled = true; talkBtn.textContent = 'Sending…'; }
      sbInsert('messages', row)
        .then(showTalkConfirmation)
        .catch(function () {
          if (talkBtn) { talkBtn.disabled = false; talkBtn.textContent = 'Send Message'; }
          alert('Sorry — your message could not be sent. Please try again, or email info@macspace.studio.');
        });
    });
  }

  /* =========================================================
     REGIONAL CLOCK TICKER — Kampala / Nairobi / Kigali / Dar es Salaam
     ========================================================= */
  var clockZones = [
    { city: 'Kampala', tz: 'Africa/Kampala' },
    { city: 'Nairobi', tz: 'Africa/Nairobi' },
    { city: 'Kigali', tz: 'Africa/Kigali' },
    { city: 'Dar es Salaam', tz: 'Africa/Dar_es_Salaam' }
  ];
  var clockTracks = document.querySelectorAll('.clock-track');
  function updateClocks() {
    clockTracks.forEach(function (track) {
      var html = '';
      // repeat twice for seamless marquee loop
      for (var r = 0; r < 2; r++) {
        clockZones.forEach(function (zone) {
          var time;
          try {
            time = new Intl.DateTimeFormat('en-GB', {
              hour: '2-digit', minute: '2-digit', timeZone: zone.tz
            }).format(new Date());
          } catch (e) {
            time = new Date().toLocaleTimeString();
          }
          html += '<span class="clock-item"><span class="city">' + zone.city + '</span><span class="time">' + time + '</span></span>';
        });
      }
      track.innerHTML = html;
    });
  }
  if (clockTracks.length) {
    updateClocks();
    setInterval(updateClocks, 30000);
  }

  /* =========================================================
     HERO KINETIC TEXT REVEAL
     ========================================================= */
  document.querySelectorAll('.reveal-line').forEach(function (line, i) {
    setTimeout(function () { line.classList.add('in'); }, 150 + i * 110);
  });

  /* =========================================================
     SCROLL REVEAL (IntersectionObserver)
     ========================================================= */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) {
          setTimeout(function () { entry.target.classList.add('visible'); }, i * 60);
          io.unobserve(entry.target);
        }
      });
    /* threshold 0 + bottom rootMargin: fires once a section's top edge is
       ~60px into view. A percentage threshold can never fire for sections
       taller than the viewport (e.g. the shop grid on phones), which left
       them permanently invisible. */
    }, { threshold: 0, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* =========================================================
     HORIZONTAL SCROLL GALLERIES (drag + wheel)
     ========================================================= */
  document.querySelectorAll('.hscroll:not(.hscroll-auto)').forEach(function (container) {
    var isDown = false, startX, scrollLeft;
    container.addEventListener('mousedown', function (e) {
      isDown = true;
      container.classList.add('dragging');
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });
    ['mouseleave', 'mouseup'].forEach(function (evt) {
      container.addEventListener(evt, function () {
        isDown = false;
        container.classList.remove('dragging');
      });
    });
    container.addEventListener('mousemove', function (e) {
      if (!isDown) return;
      e.preventDefault();
      var x = e.pageX - container.offsetLeft;
      container.scrollLeft = scrollLeft - (x - startX) * 1.4;
    });
    container.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        container.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
  });

  /* =========================================================
     LOOP GALLERY (.hscroll-loop) — auto-scrolls continuously,
     pauses while the visitor hovers/drags/wheels, and the arrow
     buttons step one card forward or back. The track's second
     half duplicates the first (aria-hidden), so wrapping the
     scroll position by half the track width is invisible.
     ========================================================= */
  document.querySelectorAll('.hscroll-loop').forEach(function (gallery) {
    var track = gallery.querySelector('.hscroll-track');
    if (!track || !track.children.length) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var paused = false, gliding = false, resumeTimer = null;

    function gapPx() {
      var g = parseFloat(getComputedStyle(track).columnGap);
      return isNaN(g) ? 0 : g;
    }
    function wrapWidth() { return (track.scrollWidth + gapPx()) / 2; }

    function pauseFor(ms) {
      paused = true;
      if (resumeTimer) clearTimeout(resumeTimer);
      if (ms) resumeTimer = setTimeout(function () { paused = false; }, ms);
    }

    /* before any backwards movement at the left edge, silently jump
       one loop forward so there is always room to scroll back */
    function ensureBackroom() {
      if (gallery.scrollLeft < 4) gallery.scrollLeft += wrapWidth();
    }

    /* only animate while the gallery is actually on screen — a rAF
       loop that writes scrollLeft every frame is wasted work (and
       forces layout) whenever the gallery is scrolled out of view */
    var galleryOnScreen = true;
    if ('IntersectionObserver' in window) {
      galleryOnScreen = false;
      new IntersectionObserver(function (entries) {
        galleryOnScreen = entries[0].isIntersecting;
      }, { rootMargin: '120px' }).observe(gallery);
    }

    if (!reduceMotion) {
      (function step() {
        if (galleryOnScreen && !paused && !gliding && !document.hidden) {
          gallery.scrollLeft += 0.7;
          if (gallery.scrollLeft >= wrapWidth()) gallery.scrollLeft -= wrapWidth();
        }
        requestAnimationFrame(step);
      })();
    }

    gallery.addEventListener('mouseenter', function () { pauseFor(0); });
    gallery.addEventListener('mouseleave', function () {
      if (resumeTimer) clearTimeout(resumeTimer);
      paused = false;
    });
    gallery.addEventListener('mousedown', ensureBackroom);
    gallery.addEventListener('wheel', function () { ensureBackroom(); pauseFor(2500); }, { passive: true });
    gallery.addEventListener('touchstart', function () { ensureBackroom(); pauseFor(3500); }, { passive: true });

    var controls = gallery.parentElement.querySelector('.hscroll-controls');
    if (controls) {
      controls.querySelectorAll('.hscroll-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var dir = parseInt(btn.getAttribute('data-dir'), 10) || 1;
          var card = track.querySelector('.card');
          var stepX = (card ? card.getBoundingClientRect().width : 420) + gapPx();
          ensureBackroom();
          pauseFor(3000);
          gliding = true;
          gallery.scrollTo({ left: gallery.scrollLeft + dir * stepX, behavior: 'smooth' });
          setTimeout(function () {
            gliding = false;
            if (gallery.scrollLeft >= wrapWidth()) gallery.scrollLeft -= wrapWidth();
          }, 650);
        });
      });
    }
  });

  /* =========================================================
     HOVER-PREVIEW SERVICES LIST
     ========================================================= */
  var hoverPreview = document.querySelector('.hover-preview');
  var hoverPreviewImg = hoverPreview ? hoverPreview.querySelector('img') : null;
  document.querySelectorAll('.hover-list li[data-preview]').forEach(function (li) {
    li.addEventListener('mouseenter', function () {
      if (!hoverPreview) return;
      hoverPreviewImg.src = li.getAttribute('data-preview');
      hoverPreview.classList.add('visible');
    });
    li.addEventListener('mousemove', function (e) {
      if (!hoverPreview) return;
      hoverPreview.style.left = e.clientX + 'px';
      hoverPreview.style.top = e.clientY + 'px';
    });
    li.addEventListener('mouseleave', function () {
      if (!hoverPreview) return;
      hoverPreview.classList.remove('visible');
    });
  });

  /* =========================================================
     MOBILE NAV FALLBACK (legacy toggle, kept for no-overlay case)
     ========================================================= */
  var navToggle = document.querySelector('.nav-toggle');
  var mainNav = document.querySelector('.main-nav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      mainNav.classList.toggle('open');
    });
  }

  /* =========================================================
     FILTER BUTTONS (Interiors / Gardens / Journal)
     ========================================================= */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var filterables = document.querySelectorAll('[data-category]');
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var filter = btn.getAttribute('data-filter');
      filterables.forEach(function (item) {
        if (filter === 'all' || item.getAttribute('data-category') === filter) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  /* =========================================================
     NEWSLETTER FORMS — stored in Supabase, duplicates ignored
     ========================================================= */
  document.querySelectorAll('.newsletter form, .signup-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button');
      var emailInput = form.querySelector('input[type="email"]');
      var email = emailInput ? emailInput.value.trim().toLowerCase() : '';
      var original = btn.textContent;

      function thank() {
        btn.textContent = 'Thank you!';
        setTimeout(function () { btn.textContent = original; }, 2500);
        form.reset();
      }

      if (!email) return;
      if (!backendReady()) { alert(BACKEND_SETUP_MESSAGE); return; }

      btn.disabled = true;
      /* Plain insert; the table's UNIQUE email constraint rejects
         duplicates with code 23505, which we treat as success so
         re-subscribing silently thanks the visitor. (Upsert would
         need a public SELECT policy, which RLS deliberately denies.) */
      sbInsert('newsletter', { email: email })
        .then(function () { btn.disabled = false; thank(); })
        .catch(function (err) {
          btn.disabled = false;
          if (err && err.code === '23505') { thank(); return; }
          btn.textContent = 'Try again';
          setTimeout(function () { btn.textContent = original; }, 2500);
        });
    });
  });

  /* =========================================================
     PRODUCT PHOTOS & DETAIL VIEW
     Up to 3 photos per product via data-photos="a|b|c" on
     .product-card. Card photos cycle automatically (paused on
     hover) so customers see every photo without clicking.
     Clicking a card opens a detail view: auto-cycling photo with
     dot indicators, description (data-description), price and an
     Add to Cart button.
     ========================================================= */
  var reduceMotionPref = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lightboxEl = null, lbImgEl, lbNameEl, lbDescEl, lbPriceEl, lbDotsEl, lbAddBtn;
  var lbPhotos = [], lbIndex = 0, lbProduct = null, lbTimer = null;

  /* Gentle crossfade: the incoming photo fades in on a ghost layer
     over the current one, then becomes the real image. No blink. */
  function crossfade(container, img, src) {
    if (!container || img.getAttribute('src') === src) return;
    if (container.querySelector('.xfade-ghost')) return; /* one fade at a time */
    var ghost = document.createElement('img');
    ghost.className = 'xfade-ghost';
    ghost.alt = '';
    ghost.src = src;
    container.appendChild(ghost);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { ghost.style.opacity = '1'; });
    });
    setTimeout(function () {
      /* if finishFade() already completed this fade (manual swipe),
         do nothing — otherwise we would overwrite the newer photo */
      if (!ghost.parentNode) return;
      img.src = src;
      ghost.parentNode.removeChild(ghost);
    }, 980);
  }

  function preloadPhotos(photos) {
    photos.forEach(function (src) { var im = new Image(); im.src = src; });
  }

  /* if a crossfade is mid-flight, complete it instantly so a manual
     swipe always responds right away */
  function finishFade(container, img) {
    var ghost = container && container.querySelector('.xfade-ghost');
    if (!ghost) return;
    img.src = ghost.src;
    ghost.parentNode.removeChild(ghost);
  }

  function buildLightbox() {
    if (lightboxEl) return;
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'product-lightbox';
    lightboxEl.innerHTML =
      '<button class="lb-close">Close</button>' +
      '<div class="lb-inner">' +
        '<div class="lb-media"><img alt=""></div>' +
        '<div class="lb-dots"></div>' +
        '<div class="lb-name"></div>' +
        '<p class="lb-desc"></p>' +
        '<div class="lb-price"></div>' +
        '<button class="btn btn-solid lb-add">Add to Cart</button>' +
      '</div>';
    document.body.appendChild(lightboxEl);
    lbImgEl = lightboxEl.querySelector('img');
    lbNameEl = lightboxEl.querySelector('.lb-name');
    lbDescEl = lightboxEl.querySelector('.lb-desc');
    lbPriceEl = lightboxEl.querySelector('.lb-price');
    lbDotsEl = lightboxEl.querySelector('.lb-dots');
    lbAddBtn = lightboxEl.querySelector('.lb-add');
    lightboxEl.querySelector('.lb-close').addEventListener('click', closeLightbox);
    lightboxEl.addEventListener('click', function (e) {
      if (e.target === lightboxEl) closeLightbox();
    });
    lbAddBtn.addEventListener('click', function () {
      if (!lbProduct || !lbProduct.id) return;
      addToCart(lbProduct.id, lbProduct.cartName, lbProduct.price, lbProduct.cartImage);
      closeLightbox();
    });

    /* manual scroll on the photo: swipe (touch) or click-drag (mouse)
       moves to the next/previous photo and restarts the auto timer */
    var lbMediaEl = lightboxEl.querySelector('.lb-media');
    var swipeX = null;
    function endSwipe(x) {
      if (swipeX === null) return;
      var dx = x - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 40) {
        finishFade(lbMediaEl, lbImgEl); /* make rapid swipes responsive */
        showLightboxPhoto(lbIndex + (dx < 0 ? 1 : -1), true);
      }
    }
    lbMediaEl.addEventListener('touchstart', function (e) {
      swipeX = e.touches[0].clientX;
    }, { passive: true });
    lbMediaEl.addEventListener('touchend', function (e) {
      endSwipe(e.changedTouches[0].clientX);
    }, { passive: true });
    lbMediaEl.addEventListener('mousedown', function (e) {
      swipeX = e.clientX;
      e.preventDefault();
    });
    document.addEventListener('mouseup', function (e) {
      if (lightboxEl.classList.contains('open')) endSwipe(e.clientX);
      else swipeX = null;
    });
    document.addEventListener('keydown', function (e) {
      if (!lightboxEl.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showLightboxPhoto(lbIndex - 1, true);
      if (e.key === 'ArrowRight') showLightboxPhoto(lbIndex + 1, true);
    });
  }

  function renderLbDots() {
    lbDotsEl.innerHTML = '';
    lbDotsEl.style.display = lbPhotos.length > 1 ? 'flex' : 'none';
    lbPhotos.forEach(function (_, i) {
      var d = document.createElement('button');
      d.className = 'lb-dot' + (i === lbIndex ? ' active' : '');
      d.setAttribute('aria-label', 'Photo ' + (i + 1));
      d.addEventListener('click', function () { showLightboxPhoto(i, true); });
      lbDotsEl.appendChild(d);
    });
  }

  function showLightboxPhoto(i, manual) {
    lbIndex = (i + lbPhotos.length) % lbPhotos.length;
    crossfade(lbImgEl.parentNode, lbImgEl, lbPhotos[lbIndex]);
    lbDotsEl.querySelectorAll('.lb-dot').forEach(function (d, j) {
      d.classList.toggle('active', j === lbIndex);
    });
    if (manual) restartLbTimer();
  }

  function restartLbTimer() {
    if (lbTimer) clearInterval(lbTimer);
    lbTimer = null;
    if (lbPhotos.length > 1 && !reduceMotionPref) {
      lbTimer = setInterval(function () { showLightboxPhoto(lbIndex + 1); }, 4600);
    }
  }

  function openLightbox(product) {
    buildLightbox();
    lbProduct = product;
    lbPhotos = product.photos;
    lbIndex = 0;
    lbImgEl.src = lbPhotos[0];
    preloadPhotos(lbPhotos);
    lbNameEl.textContent = product.name;
    lbDescEl.textContent = product.desc;
    lbPriceEl.textContent = product.priceText;
    lbAddBtn.style.display = product.id ? '' : 'none';
    renderLbDots();
    restartLbTimer();
    lightboxEl.classList.add('open');
  }

  function closeLightbox() {
    if (lightboxEl) lightboxEl.classList.remove('open');
    if (lbTimer) { clearInterval(lbTimer); lbTimer = null; }
  }

  document.querySelectorAll('.product-card').forEach(function (cardEl) {
    var img = cardEl.querySelector('.card-media img');
    var link = cardEl.querySelector('a.card');
    var addBtn = cardEl.querySelector('.add-to-cart');
    var photos = (cardEl.getAttribute('data-photos') || '').split('|')
      .map(function (s) { return s.trim(); })
      .filter(Boolean)
      .slice(0, 3); /* max 3 photos per product */
    if (!photos.length && img) photos = [img.getAttribute('src')];
    if (!photos.length) return;

    var product = {
      photos: photos,
      name: (cardEl.querySelector('h3') || {}).textContent || '',
      desc: cardEl.getAttribute('data-description') || '',
      priceText: (cardEl.querySelector('.price') || {}).textContent || '',
      id: addBtn ? addBtn.getAttribute('data-id') : null,
      cartName: addBtn ? addBtn.getAttribute('data-name') : '',
      price: addBtn ? parseFloat(addBtn.getAttribute('data-price')) : 0,
      cartImage: addBtn ? addBtn.getAttribute('data-image') : photos[0]
    };

    /* automatic photo cycling on the card: slow crossfade, paused
       while hovered, and only while the card is actually on screen */
    if (img && photos.length > 1 && !reduceMotionPref) {
      var idx = 0, hovered = false, onScreen = true;
      cardEl.addEventListener('mouseenter', function () { hovered = true; });
      cardEl.addEventListener('mouseleave', function () { hovered = false; });
      if ('IntersectionObserver' in window) {
        onScreen = false;
        new IntersectionObserver(function (entries) {
          onScreen = entries[0].isIntersecting;
        }, { rootMargin: '80px' }).observe(cardEl);
      }
      setTimeout(function () { preloadPhotos(photos); }, 1500);
      setInterval(function () {
        if (hovered || document.hidden || !onScreen) return;
        idx = (idx + 1) % photos.length;
        crossfade(img.parentNode, img, photos[idx]);
      }, 4800 + Math.floor(Math.random() * 1200)); /* offset so cards don't flip in sync */
    }

    if (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        openLightbox(product);
      });
    }
  });

  /* =========================================================
     MOCK SHOPPING CART — demo only, no real payments/backend
     ========================================================= */
  var CART_KEY = 'studioCartDemo';
  var cart = readCart();

  function readCart() {
    try {
      var raw = sessionStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function saveCart() {
    try { sessionStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    renderCart();
    updateCartCount();
  }

  function updateCartCount() {
    var count = cart.reduce(function (sum, i) { return sum + i.qty; }, 0);
    document.querySelectorAll('.cart-count').forEach(function (el) {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  function currency(n) {
    return 'USh ' + Number(n).toLocaleString('en-US');
  }

  function addToCart(id, name, price, image) {
    var existing = cart.find(function (i) { return i.id === id; });
    if (existing) { existing.qty += 1; }
    else { cart.push({ id: id, name: name, price: price, image: image, qty: 1 }); }
    saveCart();
    openCart();
  }

  function removeFromCart(id) {
    cart = cart.filter(function (i) { return i.id !== id; });
    saveCart();
  }

  function changeQty(id, delta) {
    var item = cart.find(function (i) { return i.id === id; });
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) { removeFromCart(id); return; }
    saveCart();
  }

  function renderCart() {
    var itemsEl = document.querySelector('.cart-items');
    var subtotalEl = document.querySelector('.cart-subtotal .amount');
    if (!itemsEl) return;
    itemsEl.innerHTML = '';
    if (cart.length === 0) {
      itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty. Browse the Shop to add products.</p>';
    } else {
      cart.forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML =
          '<img src="' + item.image + '" alt="' + item.name + '">' +
          '<div>' +
            '<div>' + item.name + '</div>' +
            '<div class="meta">' + currency(item.price) + '</div>' +
            '<div class="qty-row">' +
              '<button class="qty-btn" data-action="dec" data-id="' + item.id + '">-</button>' +
              '<span>' + item.qty + '</span>' +
              '<button class="qty-btn" data-action="inc" data-id="' + item.id + '">+</button>' +
              '<button class="remove" data-action="remove" data-id="' + item.id + '">Remove</button>' +
            '</div>' +
          '</div>';
        itemsEl.appendChild(row);
      });
    }
    if (subtotalEl) {
      var subtotal = cart.reduce(function (sum, i) { return sum + i.price * i.qty; }, 0);
      subtotalEl.textContent = currency(subtotal);
    }
  }

  function openCart() {
    var drawer = document.querySelector('.cart-drawer');
    var ov = document.querySelector('.overlay');
    if (drawer) drawer.classList.add('open');
    if (ov) ov.classList.add('open');
  }
  function closeCart() {
    var drawer = document.querySelector('.cart-drawer');
    var ov = document.querySelector('.overlay');
    if (drawer) drawer.classList.remove('open');
    if (ov) ov.classList.remove('open');
  }

  document.querySelectorAll('.add-to-cart').forEach(function (btn) {
    btn.addEventListener('click', function () {
      addToCart(
        btn.getAttribute('data-id'),
        btn.getAttribute('data-name'),
        parseFloat(btn.getAttribute('data-price')),
        btn.getAttribute('data-image')
      );
    });
  });

  var cartOpenBtn = document.querySelector('.cart-open-btn');
  var cartCloseBtn = document.querySelector('.cart-close-btn');
  var overlay = document.querySelector('.overlay');
  if (cartOpenBtn) cartOpenBtn.addEventListener('click', function (e) { e.preventDefault(); openCart(); });
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
  if (overlay) overlay.addEventListener('click', function () { closeCart(); });

  var cartItemsContainer = document.querySelector('.cart-items');
  if (cartItemsContainer) {
    cartItemsContainer.addEventListener('click', function (e) {
      var target = e.target;
      if (!target.matches('button')) return;
      var id = target.getAttribute('data-id');
      var action = target.getAttribute('data-action');
      if (action === 'inc') changeQty(id, 1);
      if (action === 'dec') changeQty(id, -1);
      if (action === 'remove') removeFromCart(id);
    });
  }

  var checkoutBtn = document.querySelector('.go-to-checkout');
  var checkoutPanel = document.querySelector('.checkout-panel');
  if (checkoutBtn && checkoutPanel) {
    checkoutBtn.addEventListener('click', function () {
      closeCart();
      checkoutPanel.classList.add('open');
      checkoutPanel.scrollIntoView({ behavior: 'smooth' });
    });
  }

  var checkoutForm = document.querySelector('.checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var confirmationEl = document.querySelector('.checkout-confirmation');
      var orderBtn = checkoutForm.querySelector('button[type="submit"]');

      function confirmOrder() {
        checkoutForm.style.display = 'none';
        if (confirmationEl) confirmationEl.style.display = 'block';
        cart = [];
        saveCart();
      }

      if (!cart.length) {
        alert('Your cart is empty. Please add at least one item before placing an order.');
        return;
      }

      if (!backendReady()) { alert(BACKEND_SETUP_MESSAGE); return; }

      /* Card number and expiry/CVC are intentionally never read
         or transmitted — this is a mock order, no payment data. */
      var order = {
        customer_name: (checkoutForm.querySelector('input[type="text"]') || {}).value || '',
        email: (checkoutForm.querySelector('input[type="email"]') || {}).value || '',
        phone: (checkoutForm.querySelector('input[type="tel"]') || {}).value || '',
        city: (checkoutForm.querySelector('select') || {}).value || '',
        delivery_address: (checkoutForm.querySelector('.full input') || {}).value || '',
        items: cart.map(function (i) {
          return { id: i.id, name: i.name, price: i.price, qty: i.qty };
        }),
        total: cart.reduce(function (sum, i) { return sum + i.price * i.qty; }, 0)
      };

      if (orderBtn) { orderBtn.disabled = true; orderBtn.textContent = 'Placing order…'; }
      sbInsert('orders', order)
        .then(confirmOrder)
        .catch(function () {
          if (orderBtn) { orderBtn.disabled = false; orderBtn.textContent = 'Place Order'; }
          alert('Sorry — your order could not be placed. Please try again.');
        });
    });
  }

  renderCart();
  updateCartCount();
});
