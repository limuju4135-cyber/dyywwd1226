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

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationId = null;

    const flakes = [];

    const isMobile = document.documentElement.clientWidth <= 768;
    const NORMAL_FLAKE_COUNT = isMobile ? 20 : 30;
    const SPECIAL_FLAKE_COUNT = isMobile ? 110 : 150;
    let lastSpecialSnowMode = null;

    function isSpecialSnowMode() {
      return document.body.classList.contains('special-mode');
    }

    function targetFlakeCount() {
      return isSpecialSnowMode()
        ? SPECIAL_FLAKE_COUNT
        : NORMAL_FLAKE_COUNT;
    }

    /**
     * 핀치 줌 대응 핵심:
     * visualViewport의 확대/축소에 따라 canvas 내부 좌표계를
     * 다시 만들지 않는다.
     *
     * documentElement.clientWidth/Height는 레이아웃 viewport 기준이므로
     * 핀치 줌 중 visual viewport 크기 변화에 덜 영향을 받는다.
     */
    function getLayoutViewport() {
      return {
        width: document.documentElement.clientWidth || window.innerWidth,
        height: document.documentElement.clientHeight || window.innerHeight
      };
    }

    function applyCanvasSize(preservePositions = false) {
      const oldWidth = width || 1;
      const oldHeight = height || 1;

      const viewport = getLayoutViewport();
      width = viewport.width;
      height = viewport.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 실제 화면 크기가 바뀐 경우에도 눈 위치가 갑자기 랜덤 재배치되지 않도록
      // 상대 위치를 그대로 유지
      if (preservePositions && flakes.length) {
        const ratioX = width / oldWidth;
        const ratioY = height / oldHeight;

        flakes.forEach((flake) => {
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
        const crystal = Math.random() < (special ? 0.30 : 0.16);

        this.type = crystal ? 'crystal' : 'soft';
        this.goldSeed = Math.random();

        this.size = special
          ? (crystal
              ? 3.8 + Math.random() * 2.8
              : 1.7 + Math.random() * 2.5)
          : (crystal
              ? 2.7 + Math.random() * 1.7
              : 0.8 + Math.random() * 1.6);

        this.x = Math.random() * width;
        this.y = initial
          ? Math.random() * height
          : -18 - Math.random() * 55;

        this.baseOpacity = special
          ? (crystal
              ? 0.42 + Math.random() * 0.26
              : 0.31 + Math.random() * 0.25)
          : (crystal
              ? 0.15 + Math.random() * 0.085
              : 0.10 + Math.random() * 0.075);

        this.opacity = this.baseOpacity;

        this.speedY = special
          ? (crystal
              ? 0.42 + Math.random() * 0.44
              : 0.34 + Math.random() * 0.50)
          : (crystal
              ? 0.24 + Math.random() * 0.28
              : 0.18 + Math.random() * 0.34);

        this.speedX = special
          ? -0.10 + Math.random() * 0.20
          : -0.045 + Math.random() * 0.09;

        this.swing = Math.random() * Math.PI * 2;
        this.swingSpeed = 0.003 + Math.random() * 0.006;
        this.swingAmp = 0.10 + Math.random() * 0.25;

        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed =
          (-0.0015 + Math.random() * 0.003) *
          (crystal ? 1 : 0.4);

        this.twinkle = Math.random() * Math.PI * 2;
        this.twinkleSpeed = 0.006 + Math.random() * 0.007;
      }

      update() {
        this.y += this.speedY;

        this.swing += this.swingSpeed;
        this.x +=
          this.speedX +
          Math.sin(this.swing) * this.swingAmp * 0.08;

        this.rotation += this.rotationSpeed;

        // 반짝임을 거의 느껴지지 않을 정도로만
        this.twinkle += this.twinkleSpeed;
        this.opacity =
          this.baseOpacity *
          (1 + Math.sin(this.twinkle) * 0.035);

        if (
          this.y > height + 25 ||
          this.x < -25 ||
          this.x > width + 25
        ) {
          this.reset(false);
        }
      }

      isSpecialGold() {
        return isSpecialSnowMode() &&
          this.goldSeed < 0.36;
      }

      drawSoft() {
        const glow = this.size * 1.75;
        const gold = this.isSpecialGold();

        const grad = ctx.createRadialGradient(
          0, 0, 0,
          0, 0, glow
        );

        if (gold) {
          grad.addColorStop(0, 'rgba(255,231,174,0.98)');
          grad.addColorStop(0.48, 'rgba(224,184,108,0.64)');
          grad.addColorStop(1, 'rgba(224,184,108,0)');
        } else {
          grad.addColorStop(0, 'rgba(255,255,255,0.96)');
          grad.addColorStop(0.48, 'rgba(249,250,255,0.58)');
          grad.addColorStop(1, 'rgba(249,250,255,0)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, glow, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = gold
          ? 'rgba(248,215,150,0.92)'
          : 'rgba(255,255,255,0.88)';
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }

      drawCrystal() {
        const outer = this.size;
        const gold = this.isSpecialGold();
        const branchStart = outer * 0.58;
        const branchLength = outer * 0.20;

        // 아주 약한 halo
        const grad = ctx.createRadialGradient(
          0, 0, 0,
          0, 0, outer * 2.1
        );
        if (gold) {
          grad.addColorStop(0, 'rgba(245,210,143,0.58)');
          grad.addColorStop(1, 'rgba(224,184,108,0)');
        } else {
          grad.addColorStop(0, 'rgba(255,255,255,0.46)');
          grad.addColorStop(1, 'rgba(255,255,255,0)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, outer * 2.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = gold
          ? 'rgba(242,206,136,0.92)'
          : 'rgba(255,255,255,0.84)';
        ctx.lineWidth = Math.max(0.55, outer * 0.12);
        ctx.lineCap = 'round';

        // 6축 결정
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(cos * outer, sin * outer);
          ctx.stroke();

          const px = cos * branchStart;
          const py = sin * branchStart;

          const leftAngle = angle - 0.48;
          const rightAngle = angle + 0.48;

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(
            px + Math.cos(leftAngle) * branchLength,
            py + Math.sin(leftAngle) * branchLength
          );
          ctx.moveTo(px, py);
          ctx.lineTo(
            px + Math.cos(rightAngle) * branchLength,
            py + Math.sin(rightAngle) * branchLength
          );
          ctx.stroke();
        }

        ctx.fillStyle = gold
          ? 'rgba(248,215,150,0.94)'
          : 'rgba(255,255,255,0.88)';
        ctx.beginPath();
        ctx.arc(0, 0, outer * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;

        if (this.type === 'crystal') {
          this.drawCrystal();
        } else {
          this.drawSoft();
        }

        ctx.restore();
      }
    }

    function populate() {
      flakes.length = 0;
      const count = targetFlakeCount();

      for (let i = 0; i < count; i++) {
        flakes.push(new Snowflake());
      }

      lastSpecialSnowMode = isSpecialSnowMode();
    }

    function syncSnowMode() {
      const special = isSpecialSnowMode();

      if (special === lastSpecialSnowMode) return;

      populate();
    }

    function animate() {
      syncSnowMode();
      ctx.clearRect(0, 0, width, height);

      flakes.forEach((flake) => {
        flake.update();
        flake.draw();
      });

      animationId = requestAnimationFrame(animate);
    }

    // 최초 한 번만 canvas 기준 좌표계 설정
    applyCanvasSize(false);
    populate();
    animate();

    /**
     * 핀치 줌은 visualViewport.scale 값만 변하므로
     * resize 이벤트에서 canvas를 재설정하지 않는다.
     *
     * 실제 기기 회전처럼 layout viewport 자체가 바뀌었을 때만
     * 기존 눈송이의 상대 위치를 보존하며 재계산한다.
     */
    let resizeTimer;

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);

      resizeTimer = setTimeout(() => {
        if (
          window.visualViewport &&
          Math.abs(window.visualViewport.scale - 1) > 0.01
        ) {
          return;
        }

        const viewport = getLayoutViewport();

        const widthDiff = Math.abs(viewport.width - width);
        const heightDiff = Math.abs(viewport.height - height);

        // 주소창 숨김/표시 같은 작은 변화는 무시
        if (widthDiff < 40 && heightDiff < 120) {
          return;
        }

        applyCanvasSize(true);
      }, 180);
    });

    // 방향 전환은 실제 레이아웃 변화이므로 별도로 반영
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        applyCanvasSize(true);
      }, 350);
    });

    window.addEventListener('beforeunload', () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    });
  }

  function initSnowPlayground() {
    const canvas = document.getElementById('snowPlayCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const reduceMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) return;

    const IDLE_BEFORE_ACCUMULATION = 4000;
    const MOBILE_HEIGHT = 96;
    const DESKTOP_HEIGHT = 112;
    const MAX_PILE_RATIO = 0.72;
    const CLEAR_RADIUS = 34;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let binCount = 0;
    let pile = new Float32Array(0);
    let nextPile = new Float32Array(0);
    let puffs = [];
    let animationId = null;
    let lastFrame = performance.now();
    let lastActivity = performance.now();
    let lastScrollY = window.scrollY || 0;
    let maxPile = 0;

    let touchActive = false;
    let touchClearing = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchLastX = 0;

    let mouseActive = false;
    let mouseClearing = false;
    let mouseStartX = 0;
    let mouseStartY = 0;
    let mouseLastX = 0;

    function isSpecial() {
      return document.body.classList.contains('special-mode');
    }

    function layoutViewport() {
      return {
        width: document.documentElement.clientWidth || window.innerWidth,
        height: document.documentElement.clientHeight || window.innerHeight
      };
    }

    function playgroundHeight() {
      return (document.documentElement.clientWidth || window.innerWidth) <= 768
        ? MOBILE_HEIGHT
        : DESKTOP_HEIGHT;
    }

    function resizeCanvas(preserve = true) {
      const oldPile = pile;
      const oldCount = binCount;

      width = layoutViewport().width;
      height = playgroundHeight();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      binCount = Math.max(52, Math.min(110, Math.round(width / 5.2)));

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      pile = new Float32Array(binCount);
      nextPile = new Float32Array(binCount);

      if (preserve && oldCount > 1 && oldPile.length) {
        for (let i = 0; i < binCount; i += 1) {
          const t = i / Math.max(1, binCount - 1);
          const oldIndex = t * (oldCount - 1);
          const left = Math.floor(oldIndex);
          const right = Math.min(oldCount - 1, left + 1);
          const mix = oldIndex - left;
          pile[i] = oldPile[left] * (1 - mix) + oldPile[right] * mix;
        }
      }
    }

    function markActivity() {
      lastActivity = performance.now();
    }

    function smoothPile() {
      if (pile.length < 3) return;

      nextPile[0] = pile[0];
      nextPile[pile.length - 1] = pile[pile.length - 1];

      for (let i = 1; i < pile.length - 1; i += 1) {
        nextPile[i] =
          pile[i] * 0.58 +
          pile[i - 1] * 0.21 +
          pile[i + 1] * 0.21;
      }

      const temp = pile;
      pile = nextPile;
      nextPile = temp;
    }

    function accumulate(dt) {
      if (!isSpecial()) return;
      if (performance.now() - lastActivity < IDLE_BEFORE_ACCUMULATION) return;

      const maxHeight = height * MAX_PILE_RATIO;
      const additions = Math.max(2, Math.round(binCount * 0.045));
      const amount = dt * 0.0064;

      for (let n = 0; n < additions; n += 1) {
        const center = Math.floor(Math.random() * binCount);
        const spread = 1 + Math.floor(Math.random() * 3);

        for (let j = -spread; j <= spread; j += 1) {
          const idx = center + j;
          if (idx < 0 || idx >= binCount) continue;

          const weight = 1 - Math.abs(j) / (spread + 1);
          pile[idx] = Math.min(
            maxHeight,
            pile[idx] + amount * weight * (0.72 + Math.random() * 0.7)
          );
        }
      }

      smoothPile();
    }

    function spawnPuffs(x, y, strength = 1) {
      const count = Math.min(14, 5 + Math.round(strength * 5));

      for (let i = 0; i < count; i += 1) {
        puffs.push({
          x: x + (Math.random() - 0.5) * 18,
          y: y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * (1.2 + strength * 1.2),
          vy: -0.45 - Math.random() * (1.0 + strength * 0.8),
          size: 1.2 + Math.random() * 2.8,
          life: 1,
          decay: 0.018 + Math.random() * 0.022
        });
      }

      if (puffs.length > 180) {
        puffs.splice(0, puffs.length - 180);
      }
    }

    function clearSnowAt(clientX, strength = 1) {
      if (!pile.length) return;

      const localX = Math.max(0, Math.min(width, clientX));
      const center = Math.round((localX / Math.max(1, width)) * (binCount - 1));
      const binsPerPx = binCount / Math.max(1, width);
      const radiusBins = Math.max(3, Math.round(CLEAR_RADIUS * binsPerPx));
      let removed = 0;

      for (let j = -radiusBins; j <= radiusBins; j += 1) {
        const idx = center + j;
        if (idx < 0 || idx >= binCount) continue;

        const normalized = Math.abs(j) / Math.max(1, radiusBins);
        const carve = (1 - normalized * normalized) * (12 + 16 * strength);
        const before = pile[idx];
        pile[idx] = Math.max(0, pile[idx] - carve);
        removed += before - pile[idx];
      }

      smoothPile();

      if (removed > 1) {
        const y = height - Math.min(maxPile, height * MAX_PILE_RATIO) * 0.45;
        spawnPuffs(localX, Math.max(12, y), Math.min(1.8, removed / 38));
      }
    }

    function clearStroke(fromX, toX) {
      const distance = Math.abs(toX - fromX);
      const steps = Math.max(1, Math.ceil(distance / 12));

      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const x = fromX + (toX - fromX) * t;
        clearSnowAt(x, Math.min(1.7, 0.8 + distance / 80));
      }
    }

    function drawPile() {
      if (!pile.length || maxPile < 0.5) return;

      const step = width / Math.max(1, binCount - 1);
      const gradient = ctx.createLinearGradient(0, height - maxPile, 0, height);
      gradient.addColorStop(0, 'rgba(255,255,255,.98)');
      gradient.addColorStop(.45, 'rgba(252,248,238,.98)');
      gradient.addColorStop(1, 'rgba(232,219,191,.97)');

      ctx.save();
      ctx.shadowColor = 'rgba(112,91,55,.14)';
      ctx.shadowBlur = 9;
      ctx.shadowOffsetY = -2;

      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, height - pile[0]);

      for (let i = 1; i < binCount; i += 1) {
        const x = i * step;
        const y = height - pile[i];
        const prevX = (i - 1) * step;
        const prevY = height - pile[i - 1];
        const midX = (prevX + x) / 2;
        const midY = (prevY + y) / 2;

        ctx.quadraticCurveTo(prevX, prevY, midX, midY);
      }

      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height - pile[0]);
      for (let i = 1; i < binCount; i += 1) {
        const x = i * step;
        const y = height - pile[i];
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,.88)';
      ctx.lineWidth = 1.25;
      ctx.shadowColor = 'rgba(255,255,255,.70)';
      ctx.shadowBlur = 5;
      ctx.stroke();
      ctx.restore();
    }

    function updateAndDrawPuffs() {
      if (!puffs.length) return;

      ctx.save();

      for (let i = puffs.length - 1; i >= 0; i -= 1) {
        const p = puffs[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.018;
        p.life -= p.decay;

        if (p.life <= 0) {
          puffs.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = 'rgba(255,252,244,.96)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function updateInteractiveState() {
      maxPile = pile.length ? Math.max(...pile) : 0;
      canvas.classList.toggle('is-visible', isSpecial() && maxPile > 0.8);
    }

    function animate(now) {
      const dt = Math.min(48, Math.max(0, now - lastFrame));
      lastFrame = now;

      if (!isSpecial()) {
        ctx.clearRect(0, 0, width, height);
        canvas.classList.remove('is-visible');
        animationId = requestAnimationFrame(animate);
        return;
      }

      accumulate(dt);
      updateInteractiveState();

      ctx.clearRect(0, 0, width, height);
      drawPile();
      updateAndDrawPuffs();

      animationId = requestAnimationFrame(animate);
    }

    function bottomZone(clientY) {
      const viewportHeight =
        window.visualViewport?.height ||
        window.innerHeight ||
        document.documentElement.clientHeight;

      return clientY >= viewportHeight - height - 8;
    }

    document.addEventListener('touchstart', event => {
      if (!isSpecial() || maxPile < 4 || event.touches.length !== 1) {
        touchActive = false;
        return;
      }

      const touch = event.touches[0];

      if (!bottomZone(touch.clientY)) {
        touchActive = false;
        return;
      }

      touchActive = true;
      touchClearing = false;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchLastX = touch.clientX;
      markActivity();
    }, { passive: true, capture: true });

    document.addEventListener('touchmove', event => {
      if (!touchActive || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      if (!touchClearing) {
        if (Math.abs(dx) < 9 && Math.abs(dy) < 9) return;

        if (Math.abs(dx) > Math.abs(dy) * 1.15) {
          touchClearing = true;
        } else {
          touchActive = false;
          return;
        }
      }

      if (touchClearing) {
        event.preventDefault();
        clearStroke(touchLastX, touch.clientX);
        touchLastX = touch.clientX;
        markActivity();
      }
    }, { passive: false, capture: true });

    document.addEventListener('touchend', () => {
      touchActive = false;
      touchClearing = false;
    }, { passive: true, capture: true });

    document.addEventListener('mousedown', event => {
      if (!isSpecial() || maxPile < 4 || event.button !== 0 || !bottomZone(event.clientY)) {
        mouseActive = false;
        return;
      }

      mouseActive = true;
      mouseClearing = false;
      mouseStartX = event.clientX;
      mouseStartY = event.clientY;
      mouseLastX = event.clientX;
      markActivity();
    }, true);

    document.addEventListener('mousemove', event => {
      if (!mouseActive) return;

      const dx = event.clientX - mouseStartX;
      const dy = event.clientY - mouseStartY;

      if (!mouseClearing) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;

        if (Math.abs(dx) > Math.abs(dy)) {
          mouseClearing = true;
        } else {
          mouseActive = false;
          return;
        }
      }

      if (mouseClearing) {
        clearStroke(mouseLastX, event.clientX);
        mouseLastX = event.clientX;
        markActivity();
      }
    }, true);

    document.addEventListener('mouseup', () => {
      mouseActive = false;
      mouseClearing = false;
    }, true);

    window.addEventListener('scroll', () => {
      const current = window.scrollY || 0;

      if (Math.abs(current - lastScrollY) > 1) {
        markActivity();
        lastScrollY = current;
      }
    }, { passive: true });

    window.addEventListener('pointerdown', event => {
      if (!bottomZone(event.clientY)) {
        markActivity();
      }
    }, { passive: true });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => resizeCanvas(true), 180);
    }, { passive: true });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => resizeCanvas(true), 320);
    });

    window.addEventListener('beforeunload', () => {
      if (animationId) cancelAnimationFrame(animationId);
    });

    resizeCanvas(false);
    animationId = requestAnimationFrame(animate);
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
