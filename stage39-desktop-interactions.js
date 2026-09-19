/**
 * Stage 39 — Desktop drag scrolling
 * Keeps the phone-style horizontal scrollers usable with a mouse.
 * Container-level listeners continue to work when gallery items are added later.
 */
(function () {
  'use strict';

  const desktop = window.matchMedia('(min-width: 900px)');

  function bindDragScroll(scroller) {
    if (!scroller || scroller.dataset.desktopDragBound === 'true') return;
    scroller.dataset.desktopDragBound = 'true';

    let pointerId = null;
    let startX = 0;
    let startScrollLeft = 0;
    let dragged = false;

    scroller.addEventListener('pointerdown', (event) => {
      if (!desktop.matches || event.pointerType === 'touch') return;
      if (event.button !== 0) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = scroller.scrollLeft;
      dragged = false;

      scroller.classList.add('is-dragging');
      try { scroller.setPointerCapture(pointerId); } catch (_) {}
    });

    scroller.addEventListener('pointermove', (event) => {
      if (pointerId !== event.pointerId) return;

      const dx = event.clientX - startX;
      if (Math.abs(dx) > 5) dragged = true;
      if (!dragged) return;

      event.preventDefault();
      scroller.scrollLeft = startScrollLeft - dx;
    });

    const finish = (event) => {
      if (pointerId !== event.pointerId) return;
      try { scroller.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;
      scroller.classList.remove('is-dragging');
    };

    scroller.addEventListener('pointerup', finish);
    scroller.addEventListener('pointercancel', finish);
    scroller.addEventListener('lostpointercapture', () => {
      pointerId = null;
      scroller.classList.remove('is-dragging');
    });

    // Prevent an image/card click from firing after a real drag.
    scroller.addEventListener('click', (event) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    }, true);
  }

  function init() {
    bindDragScroll(document.getElementById('guestGuideScroller'));
    bindDragScroll(document.getElementById('galleryGrid'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
