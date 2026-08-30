(function () {
  'use strict';

  function enhanceWeddingCalendar() {
    const dateEl = document.getElementById('weddingDayDate');
    const header = document.querySelector('#calendarGrid .calendar__header');
    const weekdayEls = document.querySelectorAll('#calendarGrid .calendar__weekday');
    const dayEls = document.querySelectorAll('#calendarGrid .calendar__day:not(.is-empty)');

    if (typeof CONFIG !== 'undefined' && CONFIG.wedding) {
      const dt = new Date(`${CONFIG.wedding.date}T${CONFIG.wedding.time || '00:00'}:00`);
      const monthName = dt.toLocaleString('en-US', { month: 'long' });
      const day = dt.getDate();
      const year = dt.getFullYear();

      if (dateEl) dateEl.textContent = `${monthName} ${day}, ${year}`;

      if (header) {
        header.innerHTML = `<span class="calendar__month-name">${monthName}</span><span class="calendar__year">${year}</span>`;
      }

      const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      weekdayEls.forEach((el, i) => {
        if (letters[i]) el.textContent = letters[i];
      });

      // 12월 26일 예식일 때 Christmas Day를 아주 은은하게 강조
      if (dt.getMonth() === 11 && day === 26) {
        dayEls.forEach((el) => {
          if (el.textContent.trim() === '25') el.classList.add('is-christmas');
        });
      }
    }
  }

  function initSnowflakes() {
    const canvas = document.getElementById('snowCanvas');
    if (!canvas) return;

    const reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationId = null;
    const flakes = [];

    // v3보다 더 적게: 모바일 10 / 데스크톱 15
    const isMobile = document.documentElement.clientWidth <= 768;
    const FLAKE_COUNT = isMobile ? 10 : 15;

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
      constructor() { this.reset(true); }

      reset(initial = false) {
        const crystal = Math.random() < 0.10;
        this.type = crystal ? 'crystal' : 'soft';

        this.size = crystal
          ? 2.1 + Math.random() * 1.25
          : 0.58 + Math.random() * 1.25;

        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : -18 - Math.random() * 55;

        // v3 대비 대략 50% 수준의 밝기
        this.baseOpacity = crystal
          ? 0.080 + Math.random() * 0.055
          : 0.055 + Math.random() * 0.050;
        this.opacity = this.baseOpacity;

        this.speedY = crystal
          ? 0.22 + Math.random() * 0.27
          : 0.17 + Math.random() * 0.31;
        this.speedX = -0.04 + Math.random() * 0.08;
        this.swing = Math.random() * Math.PI * 2;
        this.swingSpeed = 0.003 + Math.random() * 0.005;
        this.swingAmp = 0.08 + Math.random() * 0.20;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (-0.0012 + Math.random() * 0.0024) * (crystal ? 1 : 0.35);
        this.twinkle = Math.random() * Math.PI * 2;
        this.twinkleSpeed = 0.005 + Math.random() * 0.006;
      }

      update() {
        this.y += this.speedY;
        this.swing += this.swingSpeed;
        this.x += this.speedX + Math.sin(this.swing) * this.swingAmp * 0.07;
        this.rotation += this.rotationSpeed;

        // 반짝임 폭도 매우 작게
        this.twinkle += this.twinkleSpeed;
        this.opacity = this.baseOpacity * (1 + Math.sin(this.twinkle) * 0.012);

        if (this.y > height + 25 || this.x < -25 || this.x > width + 25) {
          this.reset(false);
        }
      }

      drawSoft() {
        const glow = this.size * 1.6;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glow);
        grad.addColorStop(0, 'rgba(255,255,255,0.90)');
        grad.addColorStop(0.5, 'rgba(249,250,255,0.46)');
        grad.addColorStop(1, 'rgba(249,250,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, glow, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.80)';
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.38, 0, Math.PI * 2);
        ctx.fill();
      }

      drawCrystal() {
        const outer = this.size;
        const branchStart = outer * 0.58;
        const branchLength = outer * 0.19;

        ctx.strokeStyle = 'rgba(255,255,255,0.78)';
        ctx.lineWidth = Math.max(0.52, outer * 0.11);
        ctx.lineCap = 'round';

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
          const a1 = angle - 0.48;
          const a2 = angle + 0.48;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(a1) * branchLength, py + Math.sin(a1) * branchLength);
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(a2) * branchLength, py + Math.sin(a2) * branchLength);
          ctx.stroke();
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;
        if (this.type === 'crystal') this.drawCrystal();
        else this.drawSoft();
        ctx.restore();
      }
    }

    function populate() {
      flakes.length = 0;
      for (let i = 0; i < FLAKE_COUNT; i++) flakes.push(new Snowflake());
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      flakes.forEach((flake) => {
        flake.update();
        flake.draw();
      });
      animationId = requestAnimationFrame(animate);
    }

    applyCanvasSize(false);
    populate();
    animate();

    // 핀치 줌 중에는 좌표계를 재계산하지 않음
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.visualViewport && Math.abs(window.visualViewport.scale - 1) > 0.01) return;

        const viewport = getLayoutViewport();
        const widthDiff = Math.abs(viewport.width - width);
        const heightDiff = Math.abs(viewport.height - height);

        // 모바일 주소창 등 작은 viewport 변화는 무시
        if (widthDiff < 40 && heightDiff < 120) return;
        applyCanvasSize(true);
      }, 180);
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => applyCanvasSize(true), 350);
    });

    window.addEventListener('beforeunload', () => {
      if (animationId) cancelAnimationFrame(animationId);
    });
  }

  function replaceSmallOrnaments() {
    document.querySelectorAll('.ornament').forEach((el) => {
      el.textContent = '✦';
    });
  }

  window.addEventListener('load', function () {
    enhanceWeddingCalendar();
    replaceSmallOrnaments();
    initSnowflakes();
  });
})();
