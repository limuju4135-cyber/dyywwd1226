(function () {
  'use strict';

  /* ═══════════════════════════════════════════
     Stage 19 — basic content protection
     - Desktop right-click disabled
     - Image dragging disabled
     ※ 브라우저 개발자도구/스크린샷까지 막는 보안 기능은 아님
     ═══════════════════════════════════════════ */
  function initBasicContentProtection() {
    document.addEventListener('contextmenu', (event) => {
      const finePointer =
        window.matchMedia &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches;

      if (finePointer || event.button === 2 || event.pointerType === 'mouse') {
        event.preventDefault();
      }
    });

    document.addEventListener('dragstart', (event) => {
      if (event.target instanceof HTMLImageElement) {
        event.preventDefault();
      }
    });
  }



  /* ═══════════════════════════════════════════
     Hero Quick Navigation
     ═══════════════════════════════════════════ */
  function initHeroQuickNavigation() {
    document.querySelectorAll('[data-scroll-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = document.getElementById(button.dataset.scrollTarget);
        if (!target) return;

        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      });
    });
  }

  /* ═══════════════════════════════════════════
     Mobile Zoom Lock
     사용자 요청: 청첩장 자체 핀치/더블탭 확대 방지
     ═══════════════════════════════════════════ */
  function initMobileZoomLock() {
    // iOS Safari gesture events
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
      document.addEventListener(type, (event) => {
        event.preventDefault();
      }, { passive: false });
    });

    // Multi-touch pinch fallback
    document.addEventListener('touchmove', (event) => {
      if (event.touches && event.touches.length > 1) {
        event.preventDefault();
      }
    }, { passive: false });

    // Double tap zoom fallback
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
  }

  function applyExternalHeroMedia() {
    const hero = document.getElementById('heroPhoto');

    if (!hero ||
        typeof MEDIA_CONFIG === 'undefined' ||
        !MEDIA_CONFIG.baseUrl ||
        !MEDIA_CONFIG.hero ||
        !MEDIA_CONFIG.hero.primary) {
      return;
    }

    const base = MEDIA_CONFIG.baseUrl.replace(/\/+$/, '');
    const path = String(MEDIA_CONFIG.hero.primary).replace(/^\/+/, '');
    const externalUrl = `${base}/${path}`;

    hero.dataset.mediaResolved = 'worker-r2';

    // 실제 이미지를 Worker URL로 교체
    if (hero.src !== externalUrl) {
      hero.src = externalUrl;
    }

    hero.addEventListener('load', () => {
      hero.classList.add('is-media-loaded');
      hero.classList.remove('is-media-error');
    }, { once: true });

    hero.addEventListener('error', () => {
      hero.classList.add('is-media-error');
      hero.classList.remove('is-media-loaded');
      console.warn('[Wedding Media] Hero image could not be loaded from Worker/R2.');
    }, { once: true });
  }

  /*
   * 원본 classic-elegant가 DOMContentLoaded에서
   * images/hero/1.jpg를 지정하므로,
   * 같은 DOMContentLoaded 큐의 다음 순서에서 Worker URL로 다시 지정합니다.
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyExternalHeroMedia);
  } else {
  }


  function normalizeHeroNames() {
    const el = document.getElementById('heroNames');
    if (!el || typeof CONFIG === 'undefined') return;

    const groom = CONFIG.groom?.name || '';
    const bride = CONFIG.bride?.name || '';

    // 원본의 middle-dot 대신 일반 glyph인 & 사용.
    // 실제 이름 입력 후에도 동일하게 유지됨.
    el.textContent = `${groom}  &  ${bride}`;
  }


  /* ═══════════════════════════════════════════
     Photo Modal Scroll / Browser Back Fix
     - 사진을 연 위치를 기억
     - 모달 종료 후 원래 위치 복원
     - 모바일 브라우저 뒤로가기는 페이지 이탈보다 먼저 모달을 닫음
     ═══════════════════════════════════════════ */
  function initPhotoModalScrollFix() {
    const modal = document.getElementById('photoModal');
    if (!modal) return;

    let savedScrollY = 0;
    let modalHistoryActive = false;
    let restoringFromPopState = false;
    let pendingHistoryScrollRestore = false;

    function rememberScrollPosition() {
      savedScrollY = window.scrollY || window.pageYOffset || 0;
    }

    // 원본 gallery/story click handler보다 먼저 현재 위치 저장
    document.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.gallery__item, .story__photo-item, #galleryRandomBtn')) {
        rememberScrollPosition();
      }
    }, true);

    document.addEventListener('click', (event) => {
      if (event.target.closest('.gallery__item, .story__photo-item, #galleryRandomBtn')) {
        rememberScrollPosition();

        if (!history.state || !history.state.__weddingPhotoModal) {
          history.pushState(
            { ...(history.state || {}), __weddingPhotoModal: true },
            '',
            location.href
          );
          modalHistoryActive = true;
        }
      }
    }, true);

    function lockAtSavedPosition() {
      document.body.style.top = `-${savedScrollY}px`;
    }

    function restoreScrollPosition() {
      document.body.style.top = '';

      const restore = () => {
        window.scrollTo({
          top: savedScrollY,
          left: 0,
          behavior: 'auto'
        });
      };

      // fixed body 해제 직후 + history 이동 직후 모두 안정적으로 복원
      requestAnimationFrame(() => {
        restore();
        requestAnimationFrame(restore);
      });
      window.setTimeout(restore, 80);
    }

    const observer = new MutationObserver(() => {
      const isOpen = modal.classList.contains('is-open');

      if (isOpen) {
        lockAtSavedPosition();
        return;
      }

      restoreScrollPosition();

      // X 버튼/배경 클릭 등으로 닫은 경우, 우리가 추가한 모달용 history만 제거
      if (modalHistoryActive && !restoringFromPopState &&
          history.state && history.state.__weddingPhotoModal) {
        modalHistoryActive = false;
        pendingHistoryScrollRestore = true;
        history.back();
      }
    });

    observer.observe(modal, {
      attributes: true,
      attributeFilter: ['class']
    });

    window.addEventListener('popstate', () => {
      // X/배경 닫기 후 synthetic history entry를 제거한 경우:
      // 브라우저가 history 복원값으로 스크롤을 덮어쓴 뒤 최종적으로 갤러리 위치 재복원.
      if (!modal.classList.contains('is-open')) {
        if (pendingHistoryScrollRestore) {
          pendingHistoryScrollRestore = false;
          restoreScrollPosition();
        }

        restoringFromPopState = false;
        return;
      }

      restoringFromPopState = true;
      modalHistoryActive = false;
      pendingHistoryScrollRestore = false;

      modal.classList.remove('is-open');
      document.body.classList.remove('no-scroll');
      restoreScrollPosition();

      setTimeout(() => {
        restoringFromPopState = false;
      }, 0);
    });
  }


  function enhanceWeddingDayStage1() {
    const grid = document.getElementById('calendarGrid');
    const dateEl = document.getElementById('weddingDayDate');

    if (!grid || typeof CONFIG === 'undefined' || !CONFIG.wedding) return;

    const dt = new Date(`${CONFIG.wedding.date}T${CONFIG.wedding.time || '00:00'}:00`);
    const year = dt.getFullYear();
    const month = dt.getMonth() + 1;
    const weddingDate = dt.getDate();

    const [hourString, minuteString] = String(CONFIG.wedding.time || '00:00').split(':');
    let hour = Number(hourString || 0);
    const minute = Number(minuteString || 0);
    const period = hour < 12 ? '오전' : '오후';
    const displayHour = hour % 12 || 12;
    const minuteText = minute === 0 ? '' : ` ${minute}분`;

    if (dateEl) {
      const weekdayText = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
      dateEl.textContent =
        `${year}년 ${month}월 ${weddingDate}일(${weekdayText}) ${period} ${displayHour}시${minuteText}`;
    }

    const header = grid.querySelector('.calendar__header');
    if (header) {
      header.innerHTML = `
        <span class="calendar__month-name">${month}월</span>
        <span class="calendar__year">${year}</span>
      `;
    }

    const weekdayEls = grid.querySelectorAll('.calendar__weekday');
    const weekdayLetters = ['일', '월', '화', '수', '목', '금', '토'];

    weekdayEls.forEach((el, index) => {
      if (weekdayLetters[index]) el.textContent = weekdayLetters[index];
    });

    if (month === 12 && weddingDate === 26) {
      grid.querySelectorAll('.calendar__day:not(.is-empty)').forEach((el) => {
        if (el.textContent.trim() === '25') {
          el.classList.add('is-christmas');
        }
      });
    }
  }

  function initSnowflakes() {
    const canvas = document.getElementById('snowCanvas');
    if (!canvas) return;

    const reduceMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) return;

    const ctx = canvas.getContext('2d');
    const flakes = [];

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationId = null;
    let lastFrame = 0;
    let running = false;
    let lastSpecialSnowMode = null;

    const NORMAL_FLAKE_COUNT =
      (document.documentElement.clientWidth || window.innerWidth) <= 768
        ? 20
        : 30;
    const SPECIAL_FLAKE_COUNT = 80;
    const FRAME_MS = 1000 / 30;

    function isSpecialSnowMode() {
      return document.body.classList.contains('special-mode');
    }

    function targetFlakeCount() {
      return isSpecialSnowMode()
        ? SPECIAL_FLAKE_COUNT
        : NORMAL_FLAKE_COUNT;
    }

    function viewport() {
      return {
        width: document.documentElement.clientWidth || window.innerWidth,
        height: document.documentElement.clientHeight || window.innerHeight
      };
    }

    function applyCanvasSize(preserve = false) {
      const oldWidth = width || 1;
      const oldHeight = height || 1;
      const next = viewport();

      width = next.width;
      height = next.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (preserve && flakes.length) {
        const ratioX = width / oldWidth;
        const ratioY = height / oldHeight;
        flakes.forEach(flake => {
          flake.x *= ratioX;
          flake.y *= ratioY;
        });
      }
    }

    class Snowflake {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        const special = isSpecialSnowMode();
        this.crystal = Math.random() < (special ? .24 : .14);
        this.gold = special && Math.random() < .30;

        this.size = special
          ? (this.crystal ? 3.4 + Math.random() * 2.4 : 1.5 + Math.random() * 2.1)
          : (this.crystal ? 2.4 + Math.random() * 1.4 : .8 + Math.random() * 1.3);

        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : -20 - Math.random() * 45;
        this.opacity = special
          ? .30 + Math.random() * .30
          : .10 + Math.random() * .08;
        this.speedY = special
          ? .36 + Math.random() * .44
          : .18 + Math.random() * .28;
        this.speedX = -.08 + Math.random() * .16;
        this.phase = Math.random() * Math.PI * 2;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (-.002 + Math.random() * .004) * (this.crystal ? 1 : .3);
      }

      update() {
        this.phase += .018;
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.phase) * .025;
        this.rotation += this.rotationSpeed;

        if (this.y > height + 24 || this.x < -24 || this.x > width + 24) {
          this.reset(false);
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;

        if (this.crystal) {
          const radius = this.size;
          ctx.strokeStyle = this.gold
            ? 'rgba(216,192,138,.95)'
            : 'rgba(255,255,255,.88)';
          ctx.lineWidth = Math.max(.55, radius * .11);
          ctx.lineCap = 'round';

          for (let i = 0; i < 6; i += 1) {
            const angle = Math.PI * i / 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            ctx.stroke();
          }
        } else {
          const glow = this.size * 1.55;
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glow);

          if (this.gold) {
            gradient.addColorStop(0, 'rgba(216,192,138,.98)');
            gradient.addColorStop(.48, 'rgba(216,192,138,.55)');
            gradient.addColorStop(1, 'rgba(216,192,138,0)');
          } else {
            gradient.addColorStop(0, 'rgba(255,255,255,.96)');
            gradient.addColorStop(.48, 'rgba(255,255,255,.50)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
          }

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, glow, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    function populate() {
      flakes.length = 0;
      for (let i = 0; i < targetFlakeCount(); i += 1) {
        flakes.push(new Snowflake());
      }
      lastSpecialSnowMode = isSpecialSnowMode();
    }

    function syncMode() {
      const special = isSpecialSnowMode();
      if (special !== lastSpecialSnowMode) {
        populate();
      }
    }

    function frame(now) {
      if (!running) return;
      animationId = requestAnimationFrame(frame);

      if (document.hidden || now - lastFrame < FRAME_MS) return;
      lastFrame = now;

      syncMode();
      ctx.clearRect(0, 0, width, height);

      flakes.forEach(flake => {
        flake.update();
        flake.draw();
      });
    }

    function start() {
      if (running) return;
      running = true;
      lastFrame = 0;
      animationId = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (animationId) cancelAnimationFrame(animationId);
      animationId = null;
    }

    applyCanvasSize(false);
    populate();
    start();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const next = viewport();
        if (Math.abs(next.width - width) < 40 && Math.abs(next.height - height) < 120) return;
        applyCanvasSize(true);
      }, 180);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });

    window.addEventListener('beforeunload', stop);
  }

  function initSnowPlayground() {
    const canvas = document.getElementById('snowPlayCanvas');
    if (!canvas) return;

    const reduceMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) return;

    const ctx = canvas.getContext('2d');
    const IDLE_BEFORE_ACCUMULATION = 3500;
    const PLAYGROUND_HEIGHT = 92;
    const MAX_PILE_RATIO = .68;
    const FRAME_MS = 1000 / 15;

    let width = 0;
    let height = PLAYGROUND_HEIGHT;
    let dpr = 1;
    let pile = new Float32Array(0);
    let nextPile = new Float32Array(0);
    let binCount = 0;
    let lastActivity = performance.now();
    let lastFrame = 0;
    let animationId = null;
    let running = false;

    function isSpecial() {
      return document.body.classList.contains('special-mode');
    }

    function resizeCanvas(preserve = true) {
      const oldPile = pile;
      const oldCount = binCount;

      width = document.documentElement.clientWidth || window.innerWidth;
      height = PLAYGROUND_HEIGHT;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      binCount = Math.max(48, Math.min(78, Math.round(width / 6)));

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      pile = new Float32Array(binCount);
      nextPile = new Float32Array(binCount);

      if (preserve && oldCount > 1) {
        for (let i = 0; i < binCount; i += 1) {
          const source = (i / Math.max(1, binCount - 1)) * (oldCount - 1);
          const low = Math.floor(source);
          const high = Math.min(oldCount - 1, low + 1);
          const t = source - low;
          pile[i] = oldPile[low] * (1 - t) + oldPile[high] * t;
        }
      }
    }

    function smooth() {
      if (pile.length < 3) return;
      nextPile[0] = pile[0];
      nextPile[pile.length - 1] = pile[pile.length - 1];

      for (let i = 1; i < pile.length - 1; i += 1) {
        nextPile[i] =
          pile[i] * .64 +
          pile[i - 1] * .18 +
          pile[i + 1] * .18;
      }

      const swap = pile;
      pile = nextPile;
      nextPile = swap;
    }

    function accumulate() {
      if (!isSpecial() || performance.now() - lastActivity < IDLE_BEFORE_ACCUMULATION) return;

      const maxHeight = height * MAX_PILE_RATIO;
      const additions = 3;

      for (let n = 0; n < additions; n += 1) {
        const center = Math.floor(Math.random() * binCount);
        const spread = 1 + Math.floor(Math.random() * 2);

        for (let j = -spread; j <= spread; j += 1) {
          const index = center + j;
          if (index < 0 || index >= binCount) continue;
          const weight = 1 - Math.abs(j) / (spread + 1);
          pile[index] = Math.min(maxHeight, pile[index] + .30 * weight);
        }
      }

      smooth();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      if (!isSpecial() || !pile.length) {
        canvas.classList.remove('is-visible');
        return;
      }

      const maxPile = Math.max(...pile);
      canvas.classList.toggle('is-visible', maxPile > 4);
      if (maxPile < .5) return;

      const step = width / Math.max(1, binCount - 1);
      const gradient = ctx.createLinearGradient(0, height - maxPile, 0, height);
      gradient.addColorStop(0, 'rgba(255,255,255,.99)');
      gradient.addColorStop(.55, 'rgba(248,242,229,.99)');
      gradient.addColorStop(1, 'rgba(224,211,182,.98)');

      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, height - pile[0]);

      for (let i = 1; i < binCount; i += 1) {
        const x = i * step;
        const y = height - pile[i];
        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,.92)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height - pile[0]);
      for (let i = 1; i < binCount; i += 1) {
        ctx.lineTo(i * step, height - pile[i]);
      }
      ctx.stroke();
    }

    function frame(now) {
      if (!running) return;
      animationId = requestAnimationFrame(frame);

      if (document.hidden || now - lastFrame < FRAME_MS) return;
      lastFrame = now;

      accumulate();
      draw();
    }

    function start() {
      if (running) return;
      running = true;
      lastFrame = 0;
      animationId = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (animationId) cancelAnimationFrame(animationId);
      animationId = null;
    }

    window.addEventListener('wedding-mode-change', () => {
      lastActivity = performance.now();
    });

    document.addEventListener('pointerdown', () => {
      lastActivity = performance.now();
    }, { passive: true });

    resizeCanvas(false);
    start();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => resizeCanvas(true), 200);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });

    window.addEventListener('beforeunload', stop);
  }

  function replaceSmallOrnaments() {
    document.querySelectorAll('.ornament').forEach((el) => {
      el.textContent = '❄';
    });
  }

  window.addEventListener('load', function () {
    initBasicContentProtection();
    initHeroQuickNavigation();
    initMobileZoomLock();
    enhanceWeddingDayStage1();
    normalizeHeroNames();
    initPhotoModalScrollFix();
    initSnowflakes();
    initSnowPlayground();
  });
})();
