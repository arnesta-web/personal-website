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
      if (img.parentElement.tagName === 'PICTURE') return;

      const src = img.getAttribute('src');
      if (!src) return;

      const match = src.match(/^(.+)-(\d+)\.webp$/);
      if (!match) return;

      const basePath = match[1];
      const src800 = `${basePath}-800.webp`;
      const src2000 = `${basePath}-2000.webp`;

      const picture = document.createElement('picture');

      const sourceMobile = document.createElement('source');
      sourceMobile.media = '(max-width: 768px)';
      sourceMobile.srcset = src800;

      const sourceDesktop = document.createElement('source');
      sourceDesktop.media = '(min-width: 769px)';
      sourceDesktop.srcset = src2000;

      picture.appendChild(sourceMobile);
      picture.appendChild(sourceDesktop);

      img.setAttribute('src', src800);
      picture.appendChild(img.cloneNode());
      img.replaceWith(picture);
    });
  }

  // ─── Галерея с непрерывным переключением (десктоп) / клик по половинам (мобила) ──

  function initSliders(root = document) {
    wrapImagesInPicture(root);

    root.querySelectorAll('.slider:not([data-initialized])').forEach(slider => {
      const slides = [...slider.querySelectorAll('.slide')];
      const total = slides.length;
      if (total < 2) {
        slider.dataset.initialized = 'true';
        return;
      }

      let current = 0;
      const isMobile = window.innerWidth <= 768;

      function goTo(index) {
        if (index === current || index < 0 || index >= total) return;
        slides[current].classList.remove('active');
        slides[index].classList.add('active');
        current = index;
      }

      // ─── Мобильные: клик по левой / правой половине ──────────────────────
      if (isMobile) {
        slider.addEventListener('click', (e) => {
          const rect = slider.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const half = rect.width / 2;
          if (x < half) {
            goTo((current - 1 + total) % total);
          } else {
            goTo((current + 1) % total);
          }
        });
      }
      // ─── Десктоп: непрерывное переключение движением мыши ──────────────
      else {
        slider.addEventListener('mousemove', (e) => {
          const rect = slider.getBoundingClientRect();
          const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const index = Math.min(total - 1, Math.floor(x * total));
          goTo(index);
        });

        slider.addEventListener('mousemove', (e) => {
          const { left, width } = slider.getBoundingClientRect();
          slider.style.cursor = (e.clientX - left) < width / 2 ? 'w-resize' : 'e-resize';
        });

        slider.addEventListener('mouseleave', () => {
          slider.style.cursor = '';
        });
      }

      // ─── Клавиатура и защита от перетаскивания (общие) ──────────────────
      slider.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          goTo((current - 1 + total) % total);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          goTo((current + 1) % total);
        }
      });

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