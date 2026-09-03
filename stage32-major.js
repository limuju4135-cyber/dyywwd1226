/**
 * Stage 32 — Major Update
 * Existing core-script.js / script.js are preserved.
 */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /* ------------------------------------------------------------
     Curtain typing
     Wait until core-script has filled curtainNames once,
     then replace it with the requested typing phrase.
     ------------------------------------------------------------ */
  function initCurtainTyping() {
    const target = $('#curtainNames');
    if (!target) return;

    let started = false;

    const start = () => {
      if (started) return;

      const text = '도영 ♥ 여울,\n저희 결혼합니다!';

      target.textContent = '';
      target.classList.remove('is-complete');

      let index = 0;

      window.setTimeout(() => {
        const timer = window.setInterval(() => {
          target.textContent += text.charAt(index);
          index += 1;

          if (index >= text.length) {
            window.clearInterval(timer);
            target.classList.add('is-complete');
          }
        }, 105);
      }, 420);
    };

    /* core-script init is asynchronous because private data loads first */
    const observer = new MutationObserver(() => {
      if (target.textContent.trim()) {
        observer.disconnect();
        start();
      }
    });

    /* core-script가 이미 이름을 채운 경우 즉시 시작,
       아직이면 core-script의 첫 입력을 기다립니다. */
    if (target.textContent.trim()) {
      start();
    } else {
      observer.observe(target, { childList: true, characterData: true, subtree: true });
    }
  }

  /* ------------------------------------------------------------
     Generic horizontal progress bar
     ------------------------------------------------------------ */
  function bindHorizontalProgress(scroller, thumb) {
    if (!scroller || !thumb) return;

    const update = () => {
      const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);

      if (maxScroll <= 1) {
        thumb.style.width = '100%';
        thumb.style.transform = 'translateX(0)';
        return;
      }

      const visibleRatio = Math.min(1, scroller.clientWidth / scroller.scrollWidth);
      const thumbRatio = Math.max(.18, visibleRatio);
      const thumbWidthPct = thumbRatio * 100;
      const progress = Math.min(1, Math.max(0, scroller.scrollLeft / maxScroll));
      const movePct = progress * (100 - thumbWidthPct);

      thumb.style.width = `${thumbWidthPct}%`;
      thumb.style.transform = `translateX(${movePct / thumbRatio}%)`;
    };

    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(update);
    });
    observer.observe(scroller, { childList: true, subtree: false });

    window.requestAnimationFrame(update);
    window.setTimeout(update, 500);
    window.setTimeout(update, 1500);
  }

  function initProgressBars() {
    bindHorizontalProgress(
      $('#galleryGrid'),
      $('#galleryProgressThumb')
    );

    bindHorizontalProgress(
      $('#guestGuideScroller'),
      $('#guestGuideProgressThumb')
    );
  }

  /* ------------------------------------------------------------
     TMAP
     Mobile: app scheme.
     Desktop: TMAP site.
     ------------------------------------------------------------ */
  function initTmap() {
    const btn = $('#tmapBtn');
    if (!btn) return;

    const scheme =
      'tmap://?rGoName=' +
      encodeURIComponent('가천컨벤션센터') +
      '&rGoX=127.12718&rGoY=37.45008';

    btn.setAttribute('href', scheme);

    btn.addEventListener('click', (event) => {
      const isMobile =
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      if (isMobile) {
        event.preventDefault();
        window.location.href = scheme;
        return;
      }

      event.preventDefault();
      window.open('https://www.tmap.co.kr/', '_blank', 'noopener');
    });
  }

  /* ------------------------------------------------------------
     Meal image slot.
     Later, adding MEDIA_CONFIG.media.meal = "guide/meal.webp"
     automatically activates the image.
     ------------------------------------------------------------ */
  function initMealPhoto() {
    const wrap = $('#guestMealPhotoWrap');
    const img = $('#guestMealPhoto');
    const placeholder = $('#guestMealPlaceholder');

    if (!wrap || !img) return;
    if (typeof PRIVATE_WEDDING === 'undefined' || !PRIVATE_WEDDING.mediaUrl) return;

    const configuredPath =
      (typeof MEDIA_CONFIG !== 'undefined') &&
      MEDIA_CONFIG.media &&
      MEDIA_CONFIG.media.meal;

    /*
     * R2 업로드 시 파일명/확장자가 달라 생기는 미표출 문제를 줄이기 위해
     * 설정값을 최우선으로 하고, 일반적인 후보 경로를 순차 확인.
     */
    const candidates = [
      configuredPath,
      'gallery/meal.webp',
      'gallery/meal.jpg',
      'gallery/meal.jpeg',
      'gallery/1000301479.webp',
      'gallery/1000301479.jpg',
      'gallery/1000301479.jpeg'
    ].filter(Boolean);

    const unique = [...new Set(candidates)];

    const tryCandidate = (index) => {
      if (index >= unique.length) {
        wrap.classList.remove('has-image');
        wrap.classList.add('is-image-missing');
        if (placeholder) placeholder.textContent = '식사 한상차림 사진';
        console.warn('[Stage37.4 meal] 사용 가능한 한상차림 이미지를 찾지 못했습니다.', unique);
        return;
      }

      const path = unique[index];
      const src = PRIVATE_WEDDING.mediaUrl(path);
      if (!src) {
        tryCandidate(index + 1);
        return;
      }

      const probe = new Image();
      probe.decoding = 'async';

      probe.addEventListener('load', () => {
        img.src = src;
        img.dataset.mediaPath = path;
        wrap.classList.add('has-image');
        wrap.classList.remove('is-image-missing');
        if (placeholder) placeholder.hidden = true;
        console.info('[Stage37.4 meal] loaded:', path);
      }, { once: true });

      probe.addEventListener('error', () => {
        tryCandidate(index + 1);
      }, { once: true });

      probe.src = src;
    };

    tryCandidate(0);
  }

  /* ------------------------------------------------------------
     Ending image.
     MEDIA_CONFIG.media.ending exists -> use it.
     Otherwise use current Hero image as a temporary preview.
     ------------------------------------------------------------ */
  function initEndingPhoto() {
    const ending = $('#endingPhoto');
    const hero = $('#heroPhoto');
    if (!ending) return;

    const setFromMediaConfig = () => {
      try {
        const endingPath =
          (typeof MEDIA_CONFIG !== 'undefined') &&
          MEDIA_CONFIG.media &&
          MEDIA_CONFIG.media.ending;

        if (
          endingPath &&
          typeof PRIVATE_WEDDING !== 'undefined'
        ) {
          const src = PRIVATE_WEDDING.mediaUrl(endingPath);
          if (src) {
            ending.src = src;
            return true;
          }
        }
      } catch (_) {}
      return false;
    };

    if (setFromMediaConfig()) return;

    const useHero = () => {
      if (hero && hero.src) ending.src = hero.src;
    };

    if (hero) {
      if (hero.complete && hero.src) {
        useHero();
      } else {
        hero.addEventListener('load', useHero, { once: true });
        const observer = new MutationObserver(useHero);
        observer.observe(hero, { attributes: true, attributeFilter: ['src'] });
        window.setTimeout(() => observer.disconnect(), 5000);
      }
    }
  }

  /* ------------------------------------------------------------
     Ensure visible titles do not retain English labels from cache /
     upstream template.
     ------------------------------------------------------------ */
  function enforceKoreanTitles() {
    const heroLabel = $('.hero__label');
    if (heroLabel) heroLabel.textContent = '초대합니다';

    const weddingEyebrow = $('.wedding-day-eyebrow');
    if (weddingEyebrow) weddingEyebrow.textContent = '결혼식 안내';
  }

  onReady(() => {
    initCurtainTyping();
    initProgressBars();
    initTmap();
    initMealPhoto();
    initEndingPhoto();
    enforceKoreanTitles();
  });
})();
