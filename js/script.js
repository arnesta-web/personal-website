(() => {
  // ─── Время ──────────────────────────────────────────────────────────────────

  function updateTime() {
    const timeStr = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const liveTime = document.getElementById('live-time');
    const liveTimeMobile = document.getElementById('live-time-mobile');
    if (liveTime) liveTime.textContent = timeStr;
    if (liveTimeMobile) liveTimeMobile.textContent = timeStr;
  }

  updateTime();
  setInterval(updateTime, 1000);

  // ─── Манифест адаптивных изображений ───────────────────────────────────────
  let imagesManifest = null;

  async function loadImagesManifest() {
    if (imagesManifest) return imagesManifest;
    try {
      const res = await fetch('/images-manifest.json');
      if (res.ok) imagesManifest = await res.json();
    } catch (e) {
      console.warn('Манифест изображений не загружен, srcset не будет добавлен.');
    }
    return imagesManifest;
  }

  // ─── Улучшение изображений (srcset из манифеста) ───────────────────────────
  function enhanceImages(container) {
    const imgs = container.querySelectorAll('.slide img');
    if (!imgs.length) return;

    if (!imagesManifest) {
      loadImagesManifest().then(() => enhanceImagesNow(imgs));
    } else {
      enhanceImagesNow(imgs);
    }
  }

  function enhanceImagesNow(imgs) {
    // Собираем все доступные ширины из манифеста
    const allSizes = new Set();
    for (const project in imagesManifest) {
      for (const base in imagesManifest[project]) {
        imagesManifest[project][base].forEach(item => allSizes.add(item.width));
      }
    }
    const sizesArray = [...allSizes].sort((a, b) => a - b);
    if (sizesArray.length === 0) return;

    imgs.forEach(img => {
      const src = img.getAttribute('src');
      if (!src) return;

      // Ищем паттерн: что-то/имя-ЦИФРЫ.webp
      const match = src.match(/^(.+)-(\d+)\.webp$/);
      if (!match) return;

      const basePath = match[1];   // "/images/project/project_N"
      const srcset = sizesArray.map(w => `${basePath}-${w}.webp ${w}w`).join(', ');
      img.setAttribute('srcset', srcset);
      // img.setAttribute('sizes', '(max-width: 768px) 100vw, 2000px');
      img.setAttribute('sizes', '(max-width: 768px) 100vw, calc(60vw - 4rem)');
    });
  }

  // ─── Галерея с непрерывным переключением ────────────────────────────────────

  function initSliders(root = document) {
    root.querySelectorAll('.slider:not([data-initialized])').forEach(slider => {
      const slides = [...slider.querySelectorAll('.slide')];
      const total = slides.length;
      if (total < 2) {
        slider.dataset.initialized = 'true';
        return;
      }

      let current = 0;

      function goTo(index) {
        if (index === current || index < 0 || index >= total) return;
        slides[current].classList.remove('active');
        slides[index].classList.add('active');
        current = index;
      }

      function updateFromPosition(clientX) {
        const rect = slider.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const index = Math.min(total - 1, Math.floor(x * total));
        goTo(index);
      }

      // Движение мыши (без зажатия) — переключение по позиции курсора
      slider.addEventListener('mousemove', (e) => {
        updateFromPosition(e.clientX);
      });

      // Меняем системный курсор для подсказки
      slider.addEventListener('mousemove', (e) => {
        const { left, width } = slider.getBoundingClientRect();
        slider.style.cursor = (e.clientX - left) < width / 2 ? 'w-resize' : 'e-resize';
      });

      slider.addEventListener('mouseleave', () => {
        slider.style.cursor = '';
      });

      // Мобильные: свайп (движение пальца)
      slider.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        updateFromPosition(touch.clientX);
      }, { passive: false });

      // Клавиатура для доступности
      slider.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          goTo((current - 1 + total) % total);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          goTo((current + 1) % total);
        }
      });

      // Запрет перетаскивания картинок
      slider.querySelectorAll('img').forEach(img => {
        img.addEventListener('dragstart', e => e.preventDefault());
      });

      // Адаптивные srcset для картинок в этом слайдере
      enhanceImages(slider);

      slider.dataset.initialized = 'true';
    });
  }

  // ─── SPA-навигация ───────────────────────────────────────────────────────────

  const mainContent = document.getElementById('main-content');
  const homeSnapshot = mainContent.innerHTML;

  const footerHTML = document.querySelector('.page-footer')?.outerHTML ?? '';

  const routes = {
    info: 'info-content.html',
    archive: 'archive-content.html',
  };

  async function navigate(page) {
    if (page === 'home') {
      mainContent.innerHTML = homeSnapshot;
      initSliders(mainContent);
    } else {
      try {
        const res = await fetch(routes[page]);
        if (!res.ok) throw new Error();
        mainContent.innerHTML =
          `<div style="flex:1 0 auto">${await res.text()}</div>${footerHTML}`;
      } catch {
        mainContent.innerHTML = '<p style="padding:2rem">Ошибка загрузки</p>';
      }
      initSliders(mainContent);
    }
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

  window.addEventListener('popstate', e => {
    navigate(e.state?.page ?? 'home');
  });

  // ─── Инициализация ───────────────────────────────────────────────────────────
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