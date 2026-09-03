/**
 * Stage 34
 * - stronger long-press deterrence for Kakao in-app browser
 * - ending media resolver for background-based ending
 */
(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);

  const PROTECTED = [
    '#heroPhoto',
    '#galleryGrid .gallery__item',
    '#modalImg',
    '#endingPhoto'
  ].join(',');

  function protectedTarget(target) {
    return target instanceof Element && !!target.closest(PROTECTED);
  }

  function initHardProtection() {
    /* Context menus / drag / selection */
    ['contextmenu', 'dragstart', 'selectstart'].forEach((type) => {
      document.addEventListener(type, (event) => {
        if (protectedTarget(event.target)) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }, true);
    });

    /*
     * Some Android/Kakao WebViews expose a long-press menu before
     * normal bubbling handlers. We still cancel the long-press
     * gesture on protected visual surfaces while preserving taps
     * and horizontal swipes on gallery buttons.
     */
    let startX = 0;
    let startY = 0;
    let timer = null;
    let active = null;

    document.addEventListener('touchstart', (event) => {
      if (!protectedTarget(event.target) || !event.touches || event.touches.length !== 1) return;

      active = event.target.closest(PROTECTED);
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;

      clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (active) {
          /* Prevent WebView from treating this visual as a selectable image. */
          active.classList.add('is-longpress-guard');
        }
      }, 360);
    }, { passive: true, capture: true });

    document.addEventListener('touchmove', (event) => {
      if (!active || !event.touches || !event.touches.length) return;
      const dx = Math.abs(event.touches[0].clientX - startX);
      const dy = Math.abs(event.touches[0].clientY - startY);
      if (dx > 8 || dy > 8) {
        clearTimeout(timer);
        active.classList.remove('is-longpress-guard');
        active = null;
      }
    }, { passive: true, capture: true });

    const endGuard = () => {
      clearTimeout(timer);
      if (active) active.classList.remove('is-longpress-guard');
      active = null;
    };

    document.addEventListener('touchend', endGuard, { passive: true, capture: true });
    document.addEventListener('touchcancel', endGuard, { passive: true, capture: true });
  }

  function mediaUrl(path) {
    if (!path) return '';
    try {
      if (typeof PRIVATE_WEDDING !== 'undefined' && PRIVATE_WEDDING.mediaUrl) {
        return PRIVATE_WEDDING.mediaUrl(path) || '';
      }
    } catch (_) {}
    return '';
  }

  /*
   * Ending media structure
   *
   * Recommended media-config.js:
   * MEDIA_CONFIG.media.ending = "ending/1.webp"
   *
   * Optional per-device:
   * MEDIA_CONFIG.media.endingMobile  = "ending/mobile.webp"
   * MEDIA_CONFIG.media.endingDesktop = "ending/desktop.webp"
   *
   * Priority:
   * mobile  : endingMobile -> ending -> Hero
   * desktop : endingDesktop -> ending -> Hero
   */
  function initEndingMedia() {
    const ending = $('#endingPhoto');
    const hero = $('#heroPhoto');
    if (!ending) return;

    const query = window.matchMedia('(min-width: 900px)');

    const apply = () => {
      const desktop = query.matches;
      const media = (window.MEDIA_CONFIG && MEDIA_CONFIG.media) || {};

      const path = desktop
        ? (media.endingDesktop || media.ending || '')
        : (media.endingMobile || media.ending || '');

      let src = mediaUrl(path);

      if (!src && hero) {
        src = hero.dataset.protectedSrc || '';
      }

      if (src) {
        ending.dataset.protectedSrc = src;
        ending.style.backgroundImage = `url("${src.replace(/"/g, '%22')}")`;
        ending.classList.add('is-media-loaded');
      } else {
        ending.style.backgroundImage = '';
        ending.classList.remove('is-media-loaded');
      }
    };

    if (query.addEventListener) query.addEventListener('change', apply);
    else if (query.addListener) query.addListener(apply);

    if (hero) {
      const obs = new MutationObserver(apply);
      obs.observe(hero, {
        attributes: true,
        attributeFilter: ['data-protected-src', 'class']
      });
    }

    apply();
    window.setTimeout(apply, 500);
    window.setTimeout(apply, 1400);
  }

  function init() {
    initHardProtection();
    initEndingMedia();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
