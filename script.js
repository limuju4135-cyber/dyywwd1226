(function () {
  'use strict';

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
    const FLAKE_COUNT = isMobile ? 16 : 24;

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
          ? 0.16 + Math.random() * 0.11
          : 0.11 + Math.random() * 0.10;

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
          (1 + Math.sin(this.twinkle) * 0.025);

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
    replaceSmallOrnaments();
    initSnowflakes();
  });
})();
