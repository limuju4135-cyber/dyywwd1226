/**
 * Stage 33
 * - Android/iOS image long-press/context-menu deterrence
 * - dynamic gallery image draggable=false
 * - mobile/desktop ending source support
 */
(function () {
  'use strict';

  const PROTECTED_SELECTOR = [
    '#heroPhoto',
    '#galleryGrid img',
    '#galleryGrid .gallery__item',
    '#photoModal img',
    '#endingPhoto',
    '#guestMealPhoto'
  ].join(',');

  function isProtectedTarget(target) {
    if (!(target instanceof Element)) return false;
    return !!target.closest(PROTECTED_SELECTOR);
  }

  function protectImages(root = document) {
    const images = root.querySelectorAll
      ? root.querySelectorAll(
          '#heroPhoto, #galleryGrid img, #photoModal img, #endingPhoto, #guestMealPhoto'
        )
      : [];

    images.forEach((img) => {
      img.draggable = false;
      img.setAttribute('draggable', 'false');
      img.setAttribute('oncontextmenu', 'return false;');
    });
  }

  function initImageProtection() {
    protectImages(document);

    /* Android Chrome의 길게 누르기 이미지 메뉴 포함 */
    document.addEventListener(
      'contextmenu',
      (event) => {
        if (isProtectedTarget(event.target)) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true
    );

    document.addEventListener(
      'dragstart',
      (event) => {
        if (isProtectedTarget(event.target)) {
          event.preventDefault();
        }
      },
      true
    );

    document.addEventListener(
      'selectstart',
      (event) => {
        if (isProtectedTarget(event.target)) {
          event.preventDefault();
        }
      },
      true
    );

    /* Gallery는 R2 manifest 로딩 후 동적으로 생성됨 */
    const gallery = document.getElementById('galleryGrid');
    if (gallery) {
      const observer = new MutationObserver(() => protectImages(gallery));
      observer.observe(gallery, { childList: true, subtree: true });
    }

    const modal = document.getElementById('photoModal');
    if (modal) {
      const observer = new MutationObserver(() => protectImages(modal));
      observer.observe(modal, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
      });
    }
  }

  /* ----------------------------------------------------------
     Ending image source
     Optional future media-config.js:
       media: {
         endingMobile: "ending/mobile.webp",
         endingDesktop: "ending/desktop.webp"
       }

     Priority:
     mobile  -> endingMobile -> ending -> Hero
     desktop -> endingDesktop -> ending -> Hero
     ---------------------------------------------------------- */
  function initResponsiveEnding() {
    const ending = document.getElementById('endingPhoto');
    const hero = document.getElementById('heroPhoto');
    if (!ending) return;

    let currentKey = '';

    const resolveMedia = (path) => {
      if (!path) return '';
      try {
        if (typeof PRIVATE_WEDDING !== 'undefined' && PRIVATE_WEDDING.mediaUrl) {
          return PRIVATE_WEDDING.mediaUrl(path) || '';
        }
      } catch (_) {}
      return '';
    };

    const update = () => {
      const desktop = window.matchMedia('(min-width: 900px)').matches;
      const media =
        (window.MEDIA_CONFIG && MEDIA_CONFIG.media) || {};

      const path = desktop
        ? (media.endingDesktop || media.ending || '')
        : (media.endingMobile || media.ending || '');

      const key = `${desktop ? 'desktop' : 'mobile'}:${path}`;
      if (key === currentKey && ending.src) return;
      currentKey = key;

      const resolved = resolveMedia(path);

      if (resolved) {
        ending.src = resolved;
        ending.dataset.endingVariant = desktop ? 'desktop' : 'mobile';
        return;
      }

      /* 별도 엔딩 이미지가 없으면 현재 Hero를 fallback */
      if (hero && hero.src) {
        ending.src = hero.src;
        ending.dataset.endingVariant = desktop ? 'desktop-fallback' : 'mobile-fallback';
      }
    };

    if (hero) {
      hero.addEventListener('load', update, { passive: true });
      const heroObserver = new MutationObserver(update);
      heroObserver.observe(hero, {
        attributes: true,
        attributeFilter: ['src']
      });
    }

    const desktopQuery = window.matchMedia('(min-width: 900px)');
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener('change', update);
    } else if (desktopQuery.addListener) {
      desktopQuery.addListener(update);
    }

    update();
    window.setTimeout(update, 600);
    window.setTimeout(update, 1600);
  }

  function init() {
    initImageProtection();
    initResponsiveEnding();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
