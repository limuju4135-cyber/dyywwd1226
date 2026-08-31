(function () {
  'use strict';


  /* ═══════════════════════════════════════════
     External Media — Private R2 via Worker
     Hero Stage
     ═══════════════════════════════════════════ */
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
    applyExternalHeroMedia();
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

    function rememberScrollPosition() {
      savedScrollY = window.scrollY || window.pageYOffset || 0;
    }

    // 원본 gallery/story click handler보다 먼저 현재 위치 저장
    document.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.gallery__item, .story__photo-item')) {
        rememberScrollPosition();
      }
    }, true);

    document.addEventListener('click', (event) => {
      if (event.target.closest('.gallery__item, .story__photo-item')) {
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
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollY);
      });
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
        history.back();
      }
    });

    observer.observe(modal, {
      attributes: true,
      attributeFilter: ['class']
    });

    window.addEventListener('popstate', () => {
      if (!modal.classList.contains('is-open')) {
        restoringFromPopState = false;
        return;
      }

      restoringFromPopState = true;
      modalHistoryActive = false;

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
    const monthName = dt.toLocaleString('en-US', { month: 'long' });
    const year = dt.getFullYear();
    const weddingDate = dt.getDate();

    if (dateEl) {
      dateEl.textContent = `${monthName} ${weddingDate}, ${year}`;
    }

    const header = grid.querySelector('.calendar__header');
    if (header) {
      header.innerHTML = `
        <span class="calendar__month-name">${monthName}</span>
        <span class="calendar__year">${year}</span>
      `;
    }

    const weekdayEls = grid.querySelectorAll('.calendar__weekday');
    const weekdayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    weekdayEls.forEach((el, index) => {
      if (weekdayLetters[index]) el.textContent = weekdayLetters[index];
    });

    if (dt.getMonth() === 11 && weddingDate === 26) {
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

    // 이전 버전보다 확실히 적게
    const isMobile = document.documentElement.clientWidth <= 768;
    const FLAKE_COUNT = isMobile ? 8 : 12;

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
        const crystal = Math.random() < 0.12; // 결정형 비율 축소

        this.type = crystal ? 'crystal' : 'soft';

        // 전체 크기 축소
        this.size = crystal
          ? 2.3 + Math.random() * 1.5
          : 0.65 + Math.random() * 1.45;

        this.x = Math.random() * width;
        this.y = initial
          ? Math.random() * height
          : -18 - Math.random() * 55;

        // 전체적으로 더 은은하게
        this.baseOpacity = crystal
          ? 0.08 + Math.random() * 0.055
          : 0.055 + Math.random() * 0.05;

        this.opacity = this.baseOpacity;

        // 느리게 낙하
        this.speedY = crystal
          ? 0.24 + Math.random() * 0.28
          : 0.18 + Math.random() * 0.34;

        this.speedX = -0.045 + Math.random() * 0.09;

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
          (1 + Math.sin(this.twinkle) * 0.012);

        if (
          this.y > height + 25 ||
          this.x < -25 ||
          this.x > width + 25
        ) {
          this.reset(false);
        }
      }

      drawSoft() {
        const glow = this.size * 1.75;

        const grad = ctx.createRadialGradient(
          0, 0, 0,
          0, 0, glow
        );

        grad.addColorStop(0, 'rgba(255,255,255,0.96)');
        grad.addColorStop(0.48, 'rgba(249,250,255,0.58)');
        grad.addColorStop(1, 'rgba(249,250,255,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, glow, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }

      drawCrystal() {
        const outer = this.size;
        const branchStart = outer * 0.58;
        const branchLength = outer * 0.20;

        // 아주 약한 halo
        const grad = ctx.createRadialGradient(
          0, 0, 0,
          0, 0, outer * 2.1
        );
        grad.addColorStop(0, 'rgba(255,255,255,0.46)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, outer * 2.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.84)';
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

        ctx.fillStyle = 'rgba(255,255,255,0.88)';
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

      for (let i = 0; i < FLAKE_COUNT; i++) {
        flakes.push(new Snowflake());
      }
    }

    function animate() {
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

  function replaceSmallOrnaments() {
    document.querySelectorAll('.ornament').forEach((el) => {
      el.textContent = '❄';
    });
  }

  window.addEventListener('load', function () {
    enhanceWeddingDayStage1();
    normalizeHeroNames();
    initPhotoModalScrollFix();
    initSnowflakes();
  });
})();
