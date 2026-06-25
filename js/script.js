(() => {
  // ─── Часы ────────────────────────────────────────────────────────
  function updateTime() {
    const t = new Date().toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    ['live-time','live-time-mobile'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = t; });
  }
  updateTime();
  setInterval(updateTime, 1000);

  // ─── <picture> для картинок ────────────────────────────────────
  function wrapImagesInPicture(container) {
    container.querySelectorAll('.slide img').forEach(img => {
      if (img.parentElement.tagName === 'PICTURE') return;
      const src = img.getAttribute('src');
      if (!src) return;
      const m = src.match(/^(.+)-(\d+)\.webp$/);
      if (!m) return;
      const base = m[1];
      const pic = document.createElement('picture');
      ['800','2000'].forEach((size, i) => {
        const source = document.createElement('source');
        source.media = i === 0 ? '(max-width:768px)' : '(min-width:769px)';
        source.srcset = `${base}-${size}.webp`;
        pic.appendChild(source);
      });
      img.setAttribute('src', `${base}-800.webp`);
      pic.appendChild(img.cloneNode());
      img.replaceWith(pic);
    });
  }

  // ─── Слайдеры ──────────────────────────────────────────────────
  function initSliders(root = document) {
    wrapImagesInPicture(root);
    root.querySelectorAll('.slider:not([data-initialized])').forEach(slider => {
      const slides = [...slider.querySelectorAll('.slide')];
      const total = slides.length;
      if (total < 2) { slider.dataset.initialized = 'true'; return; }

      let current = 0;
      const isMobile = window.innerWidth <= 768;

      // Счётчик на мобильных – вставляем сразу после ссылки
      let counter = null;
      if (isMobile) {
        const info = slider.closest('.project')?.querySelector('.project-info');
        if (info) {
          const link = info.querySelector('.project-link');
          if (link) {
            counter = info.querySelector('.slide-counter') || (() => {
              const el = document.createElement('span');
              el.className = 'slide-counter';
              link.after(el); // ← после названия, перед описанием
              return el;
            })();
          }
        }
      }

      const goTo = (index) => {
        if (index === current || index < 0 || index >= total) return;
        slides[current].classList.remove('active');
        slides[index].classList.add('active');
        current = index;
        if (counter) counter.textContent = `${current+1}/${total}`;
      };

      // Мобильные: свайп + клик по половинам
      if (isMobile) {
        let startX = 0, startY = 0, swiping = false;
        slider.addEventListener('touchstart', e => {
          const t = e.touches[0];
          startX = t.clientX; startY = t.clientY;
          swiping = false;
        }, { passive: true });

        slider.addEventListener('touchmove', e => {
          const t = e.touches[0];
          const dx = t.clientX - startX, dy = t.clientY - startY;
          if (Math.abs(dy) > Math.abs(dx)) return;
          e.preventDefault();
          swiping = true;
          if (Math.abs(dx) > 30) {
            goTo(dx < 0 ? (current + 1) % total : (current - 1 + total) % total);
            startX = t.clientX; startY = t.clientY;
          }
        }, { passive: false });

        slider.addEventListener('click', e => {
          if (swiping) { swiping = false; return; }
          const half = slider.getBoundingClientRect().width / 2;
          goTo(e.clientX - slider.getBoundingClientRect().left < half ? (current - 1 + total) % total : (current + 1) % total);
        });

        if (counter) counter.textContent = `1/${total}`;
      } 
      // Десктоп: движение мыши
      else {
        slider.addEventListener('mousemove', e => {
          const rect = slider.getBoundingClientRect();
          const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          goTo(Math.min(total - 1, Math.floor(x * total)));
          slider.style.cursor = (e.clientX - rect.left) < rect.width/2 ? 'w-resize' : 'e-resize';
        });
        slider.addEventListener('mouseleave', () => slider.style.cursor = '');
      }

      // Клавиатура и защита от перетаскивания
      slider.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); goTo((current - 1 + total) % total); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); goTo((current + 1) % total); }
      });
      slider.querySelectorAll('img').forEach(img => img.addEventListener('dragstart', e => e.preventDefault()));

      slider.dataset.initialized = 'true';
    });
  }

  // ─── SPA-навигация ─────────────────────────────────────────────
  const main = document.getElementById('main-content');
  const homeHTML = main.innerHTML;
  const footer = document.querySelector('.page-footer')?.outerHTML || '';

  const routes = { info: 'info-content.html', archive: 'archive-content.html' };

  async function navigate(page) {
    if (page === 'home') {
      main.innerHTML = homeHTML;
    } else {
      try {
        const res = await fetch(routes[page]);
        if (!res.ok) throw new Error();
        main.innerHTML = `<div style="flex:1 0 auto">${await res.text()}</div>${footer}`;
      } catch {
        main.innerHTML = '<p style="padding:2rem">Ошибка загрузки</p>';
      }
    }
    initSliders(main);
    window.scrollTo(0, 0);
  }

  document.querySelector('.sidebar-nav').addEventListener('click', e => {
    const link = e.target.closest('a[data-link]');
    if (!link) return;
    e.preventDefault();
    const page = link.dataset.link;
    history.pushState({ page }, '', page === 'home' ? '/' : `/${page}`);
    navigate(page);
  });

  window.addEventListener('popstate', e => navigate(e.state?.page ?? 'home'));

  const path = window.location.pathname.replace(/\/$/, '');
  const initial = path === '/info' ? 'info' : path === '/archive' ? 'archive' : null;
  if (initial) {
    history.replaceState({ page: initial }, '', `/${initial}`);
    navigate(initial);
  } else {
    history.replaceState({ page: 'home' }, '', '/');
    initSliders(main);
  }
})();