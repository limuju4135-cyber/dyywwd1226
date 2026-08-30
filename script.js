(function () {
  'use strict';

  function initSnowflakes() {
    const canvas = document.getElementById('snowCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    const flakes = [];
    const FLAKE_COUNT = 36;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    class Snowflake {
      constructor() {
        this.reset(true);
      }
      reset(initial = false) {
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : -20;
        this.r = 1.4 + Math.random() * 3.2;
        this.speedY = 0.45 + Math.random() * 0.95;
        this.speedX = -0.18 + Math.random() * 0.36;
        this.swing = Math.random() * Math.PI * 2;
        this.swingSpeed = 0.008 + Math.random() * 0.016;
        this.opacity = 0.42 + Math.random() * 0.42;
      }
      update() {
        this.y += this.speedY;
        this.swing += this.swingSpeed;
        this.x += this.speedX + Math.sin(this.swing) * 0.35;
        if (this.y > height + 24 || this.x < -24 || this.x > width + 24) {
          this.reset();
        }
      }
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = this.opacity;

        // 부드러운 광택 점
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r * 1.8);
        grad.addColorStop(0, 'rgba(255,255,255,0.95)');
        grad.addColorStop(0.6, 'rgba(245,248,255,0.75)');
        grad.addColorStop(1, 'rgba(245,248,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, this.r * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // 작은 결정 모양
        ctx.strokeStyle = 'rgba(255,255,255,0.92)';
        ctx.lineWidth = Math.max(0.7, this.r * 0.22);
        ctx.beginPath();
        ctx.moveTo(-this.r, 0); ctx.lineTo(this.r, 0);
        ctx.moveTo(0, -this.r); ctx.lineTo(0, this.r);
        ctx.moveTo(-this.r * 0.72, -this.r * 0.72); ctx.lineTo(this.r * 0.72, this.r * 0.72);
        ctx.moveTo(this.r * 0.72, -this.r * 0.72); ctx.lineTo(-this.r * 0.72, this.r * 0.72);
        ctx.stroke();
        ctx.restore();
      }
    }

    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < FLAKE_COUNT; i++) flakes.push(new Snowflake());

    function animate() {
      ctx.clearRect(0, 0, width, height);
      flakes.forEach(f => {
        f.update();
        f.draw();
      });
      requestAnimationFrame(animate);
    }
    animate();
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
