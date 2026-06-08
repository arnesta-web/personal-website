(() => {
  // ─── Время ──────────────────────────────────────────────────────────────────

  function updateTime() {
    const timeStr = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    document.getElementById('live-time')?.textContent !== undefined &&
      (document.getElementById('live-time').textContent = timeStr);
    document.getElementById('live-time-mobile')?.textContent !== undefined &&
      (document.getElementById('live-time-mobile').textContent = timeStr);
  }

  updateTime();
  setInterval(updateTime, 1000);

  // ─── Слайдеры ────────────────────────────────────────────────────────────────

  function initSliders(root = document) {
    root.querySelectorAll('.slider:not([data-initialized])').forEach(slider => {
      const slides = [...slider.querySelectorAll('.slide')];
      const total = slides.length;
      let current = 0;
      let pointerStartX = 0;
      let didSwipe = false;

      // Точки-навигаторы (только на мобиле через CSS)
      const dotsContainer = Object.assign(document.createElement('div'), {
        className: 'dots-container',
      });
      slides.forEach((_, i) => {
        const dot = Object.assign(document.createElement('button'), {
          className: `dot${i === 0 ? ' active' : ''}`,
          type: 'button',
        });
        dot.setAttribute('aria-label', `Перейти к слайду ${i + 1}`);
        dot.addEventListener('click', e => { e.stopPropagation(); goTo(i); });
        dotsContainer.appendChild(dot);
      });
      slider.appendChild(dotsContainer);
      const dots = [...dotsContainer.querySelectorAll('.dot')];

      function goTo(index) {
        if (index === current) return;
        slides[current].classList.remove('active');
        dots[current].classList.remove('active');
        current = index;
        slides[current].classList.add('active');
        dots[current].classList.add('active');
      }

      const prev = () => goTo((current - 1 + total) % total);
      const next = () => goTo((current + 1) % total);

      // Курсор (десктоп)
      slider.addEventListener('mousemove', e => {
        const { left, width } = slider.getBoundingClientRect();
        slider.style.cursor = (e.clientX - left) < width / 2 ? 'w-resize' : 'e-resize';
      });
      slider.addEventListener('mouseleave', () => { slider.style.cursor = ''; });

      // Клик (десктоп)
      slider.addEventListener('click', e => {
        if (didSwipe) { didSwipe = false; return; }
        const { left, width } = slider.getBoundingClientRect();
        (e.clientX - left) < width / 2 ? prev() : next();
      });

      // Свайп (pointer events — работает и на тач и на мышке)
      slider.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        pointerStartX = e.clientX;
        didSwipe = false;
        slider.setPointerCapture(e.pointerId);
        if (e.pointerType === 'mouse') e.preventDefault();
      });

      slider.addEventListener('pointerup', e => {
        const delta = e.clientX - pointerStartX;
        if (Math.abs(delta) > 30) {
          didSwipe = true;
          delta < 0 ? next() : prev();
        }
      });

      slider.addEventListener('pointercancel', () => { didSwipe = false; });

      // Клавиатура
      slider.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      });

      // Запрет перетаскивания картинок
      slider.querySelectorAll('img').forEach(img => {
        img.addEventListener('dragstart', e => e.preventDefault());
      });

      slider.dataset.initialized = 'true';
    });
  }

  // ─── SPA-навигация ───────────────────────────────────────────────────────────

  const mainContent = document.getElementById('main-content');
  const homeSnapshot = mainContent.innerHTML;

  // Сохраняем футер отдельно, чтобы вставлять его в загружаемые страницы
  const footerHTML = document.querySelector('.page-footer')?.outerHTML ?? '';

  const routes = {
    info: 'info-content.html',
    archive: 'archive-content.html',
  };

  async function navigate(page) {
    if (page === 'home') {
      mainContent.innerHTML = homeSnapshot;
    } else {
      try {
        const res = await fetch(routes[page]);
        if (!res.ok) throw new Error();
        mainContent.innerHTML =
          `<div style="flex:1 0 auto">${await res.text()}</div>${footerHTML}`;
      } catch {
        mainContent.innerHTML = '<p style="padding:2rem">Ошибка загрузки</p>';
      }
    }
    initSliders(mainContent);
    window.scrollTo(0, 0);
  }

  // Делегирование: один обработчик на все ссылки меню
  document.querySelector('.sidebar-nav').addEventListener('click', e => {
    const link = e.target.closest('a[data-link]');
    if (!link) return;
    e.preventDefault();
    const page = link.dataset.link;
    history.pushState({ page }, '', page === 'home' ? '/' : `/${page}`);
    navigate(page);
  });

  window.addEventListener('popstate', e => {
    navigate(e.state?.page ?? 'home');
  });

  // ─── Инициализация ───────────────────────────────────────────────────────────

  // Восстанавливаем страницу при прямом заходе на /info или /archive
  const path = window.location.pathname.replace(/\/$/, '');
  const initialPage = path === '/info' ? 'info' : path === '/archive' ? 'archive' : null;

  if (initialPage) {
    history.replaceState({ page: initialPage }, '', `/${initialPage}`);
    navigate(initialPage);
  } else {
    history.replaceState({ page: 'home' }, '', '/');
    initSliders(mainContent);
  }
})();