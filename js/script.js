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

  // ─── Автоматическая обёртка <img> в <picture> ─────────────────────────────

  function wrapImagesInPicture(container) {
    const images = container.querySelectorAll('.slide img');
    images.forEach(img => {
      // Проверяем, не обёрнут ли уже (чтобы не делать дважды)
      if (img.parentElement.tagName === 'PICTURE') return;

      const src = img.getAttribute('src');
      if (!src) return;

      // Должен подходить под паттерн имя-800.webp
      const match = src.match(/^(.+)-(\d+)\.webp$/);
      if (!match) return;

      const basePath = match[1];   // "/images/terrasport/terrasport_1"
      const src800 = `${basePath}-800.webp`;
      const src2000 = `${basePath}-2000.webp`;

      // Создаём <picture>
      const picture = document.createElement('picture');

      const sourceMobile = document.createElement('source');
      sourceMobile.media = '(max-width: 768px)';
      sourceMobile.srcset = src800;

      const sourceDesktop = document.createElement('source');
      sourceDesktop.media = '(min-width: 769px)';
      sourceDesktop.srcset = src2000;

      picture.appendChild(sourceMobile);
      picture.appendChild(sourceDesktop);

      // Переносим оригинальный <img> внутрь <picture>
      img.setAttribute('src', src800); // fallback
      picture.appendChild(img.cloneNode()); // Клонируем, чтобы избежать конфликтов
      img.replaceWith(picture);
    });
  }

  // ─── Галерея с непрерывным переключением ────────────────────────────────────

  function initSliders(root = document) {
    // Сначала оборачиваем все картинки в <picture>
    wrapImagesInPicture(root);

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