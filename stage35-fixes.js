/**
 * Stage 35
 * iOS Safari Hero long-press protection.
 *
 * Hero photo itself has pointer-events:none.
 * A transparent non-image shield receives touch/context-menu events instead.
 */
(function () {
  'use strict';

  function initHeroShield() {
    const hero = document.getElementById('hero');
    const shield = document.getElementById('heroTouchShield');

    if (!hero || !shield) return;

    const stopCallout = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    shield.addEventListener('contextmenu', stopCallout, { capture: true });
    shield.addEventListener('dragstart', stopCallout, { capture: true });
    shield.addEventListener('selectstart', stopCallout, { capture: true });

    /*
     * iOS Safari의 길게 누르기 이미지 액션을 피하기 위해
     * shield에는 이미지 URL / 링크 / draggable 요소를 두지 않는다.
     * 스크롤은 touch-action: pan-y로 유지.
     */
    shield.setAttribute('draggable', 'false');

    /* Hero 영역에서 발생하는 contextmenu도 마지막으로 한 번 더 차단 */
    hero.addEventListener('contextmenu', (event) => {
      if (
        event.target === shield ||
        event.target === hero ||
        event.target.id === 'heroPhoto'
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroShield, { once: true });
  } else {
    initHeroShield();
  }
})();
