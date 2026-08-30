(function () {
  'use strict';

  function initSnowflakes() {
    const canvas = document.getElementById('snowCanvas');
    if (!canvas) return;

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let animationId = null;

    const flakes = [];
    const isMobile = window.innerWidth <= 768;
    const FLAKE_COUNT = isMobile ? 26 : 38;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    class Snowflake {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.depth = Math.random();
        this.size = this.depth < 0.18
          ? 3.8 + Math.random() * 2.2
          : 1.0 + Math.random() * 2.7;

        this.type = this.depth < 0.2 ? 'crystal' : 'soft';
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : -30 - Math.random() * 80;
        this.baseOpacity = this.type === 'crystal'
          ? 0.22 + Math.random() * 0.20
          : 0.16 + Math.random() * 0.18;
        this.opacity = this.baseOpacity;
        this.speedY = this.type === 'crystal'
          ? 0.30 + Math.random() * 0.45
          : 0.22 + Math.random() * 0.58;
        this.speedX = (-0.08 + Math.random() * 0.16) * (0.7 + this.depth * 1.1);
        this.swing = Math.random() * Math.PI * 2;
        this.swingSpeed = 0.004 + Math.random() * 0.012;
        this.swingAmp = 0.15 + Math.random() * 0.55 + this.depth * 0.45;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (-0.003 + Math.random() * 0.006) * (this.type === 'crystal' ? 0.7 : 0.35);
        this.twinkle = Math.random() * Math.PI * 2;
        this.twinkleSpeed = 0.01 + Math.random() * 0.018;
      }

      update() {
        this.swing += this.swingSpeed;
        this.twinkle += this.twinkleSpeed;
        this.rotation += this.rotationSpeed;
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.swing) * this.swingAmp * 0.12;
        this.opacity = this.baseOpacity * (0.88 + Math.sin(this.twinkle) * 0.12 + 0.12);

        if (this.y > height + 40 || this.x < -40 || this.x > width + 40) {
          this.reset(false);
        }
      }

      drawSoft() {
        const glow = this.size * 2.2;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glow);
        grad.addColorStop(0, 'rgba(255,255,255,0.96)');
        grad.addColorStop(0.45, 'rgba(247,249,255,0.72)');
        grad.addColorStop(1, 'rgba(247,249,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, glow, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      drawCrystal() {
        const outer = this.size;
        const inner = this.size * 0.46;

        // glow
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, outer * 2.8);
        grad.addColorStop(0, 'rgba(255,255,255,0.72)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, outer * 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.90)';
        ctx.lineWidth = Math.max(0.7, outer * 0.14);
        ctx.lineCap = 'round';

        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const x = Math.cos(angle) * outer;
          const y = Math.sin(angle) * outer;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(x, y);
          ctx.stroke();

          const bx1 = Math.cos(angle - 0.35) * inner;
          const by1 = Math.sin(angle - 0.35) * inner;
          const bx2 = Math.cos(angle + 0.35) * inner;
          const by2 = Math.sin(angle + 0.35) * inner;
          const px = Math.cos(angle) * (outer * 0.68);
          const py = Math.sin(angle) * (outer * 0.68);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + bx1 * 0.32, py + by1 * 0.32);
          ctx.moveTo(px, py);
          ctx.lineTo(px + bx2 * 0.32, py + by2 * 0.32);
          ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.beginPath();
        ctx.arc(0, 0, outer * 0.16, 0, Math.PI * 2);
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

    resize();
    populate();
    animate();
    window.addEventListener('resize', resize);
    window.addEventListener('beforeunload', () => {
      if (animationId) cancelAnimationFrame(animationId);
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
