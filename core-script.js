/**
 * Wedding Invitation Core Script
 * classic-elegant UI structure compatible
 * Story section intentionally removed.
 */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  let invitationMode = 'normal';

  function weddingDateTime() {
    return new Date(`${CONFIG.wedding.date}T${CONFIG.wedding.time}:00`);
  }

  function formatDate(dateStr, timeStr) {
    const d = new Date(`${dateStr}T${timeStr}:00`);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const period = hours < 12 ? '오전' : '오후';
    const h12 = hours % 12 || 12;
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일 ${period} ${h12}시${minutes ? ` ${minutes}분` : ''}`;
  }

  function showToast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => el.classList.remove('is-visible'), 2200);
  }

  async function copyToClipboard(text, successMsg) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      showToast(successMsg || '복사되었습니다');
    } catch {
      showToast('복사에 실패했습니다');
    }
  }

  function applyBrowserTheme(mode) {
    const special = mode === 'special';
    const color = special ? '#B89552' : '#BE858D';

    let meta = document.querySelector('meta[name="theme-color"]');

    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }

    meta.setAttribute('content', color);
    document.documentElement.style.backgroundColor = color;

    // Reinsert the meta node to make iOS Safari re-evaluate a runtime theme change.
    try {
      const refreshed = meta.cloneNode(true);
      meta.replaceWith(refreshed);
    } catch {}

    window.dispatchEvent(new CustomEvent('wedding-mode-change', {
      detail: { mode: special ? 'special' : 'normal' }
    }));
  }

  function initMeta() {
    if (!CONFIG.meta) return;
    document.title = CONFIG.meta.title || document.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc && CONFIG.meta.description) {
      desc.setAttribute('content', CONFIG.meta.description);
    }
    // og:image는 index.html의 정적 R2 URL을 그대로 유지한다.
  }

  function initCurtain() {
    const curtain = $('#curtain');
    const btn = $('#curtainBtn');
    const names = $('#curtainNames');
    const specialFx = $('#specialUnlockFx');
    const specialParticles = $('#specialUnlockParticles');
    if (!curtain || !btn || !names) return;

    const HOLD_DURATION = 2000;
    const SPECIAL_MAX_WIDTH = 768;

    function specialModeAllowed() {
      return (document.documentElement.clientWidth || window.innerWidth) <= SPECIAL_MAX_WIDTH;
    }
    let holdTimer = null;
    let activePointerId = null;
    let specialTriggered = false;
    let invitationOpening = false;

    invitationMode = 'normal';
    applyBrowserTheme('normal');
    document.body.classList.remove('special-mode', 'normal-mode');
    document.documentElement.classList.remove('special-mode', 'normal-mode');
    curtain.classList.remove('is-special-unlocking');
    names.textContent = `${CONFIG.groom.name} & ${CONFIG.bride.name}`;

    if (CONFIG.useCurtain === false) {
      curtain.style.display = 'none';
      document.body.classList.remove('no-scroll');
      return;
    }

    document.body.classList.add('no-scroll');

    function clearHoldState() {
      if (holdTimer) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }

      btn.classList.remove('is-long-pressing');

      if (activePointerId !== null) {
        try {
          if (btn.hasPointerCapture?.(activePointerId)) {
            btn.releasePointerCapture(activePointerId);
          }
        } catch {}
      }

      activePointerId = null;
    }

    function buildSpecialParticles() {
      if (!specialParticles || specialParticles.childElementCount) return;

      const particleCount = 30;

      for (let i = 0; i < particleCount; i += 1) {
        const particle = document.createElement('i');

        if (i % 4 === 0) {
          particle.classList.add('is-snowflake');
          particle.textContent = '❄';
        }

        const angle = (360 / particleCount) * i + (i % 2 ? 7 : -5);
        const distance = 92 + (i % 5) * 21;
        const radians = angle * Math.PI / 180;

        particle.style.setProperty('--spark-x', `${Math.cos(radians) * distance}px`);
        particle.style.setProperty('--spark-y', `${Math.sin(radians) * distance}px`);
        particle.style.setProperty('--spark-delay', `${(i % 6) * 35}ms`);
        particle.style.setProperty('--spark-size', `${3 + (i % 3)}px`);
        specialParticles.appendChild(particle);
      }
    }

    function openInvitation(mode) {
      if (invitationOpening) return;
      invitationOpening = true;
      invitationMode = mode === 'special' ? 'special' : 'normal';

      document.body.classList.toggle('special-mode', invitationMode === 'special');
      document.body.classList.toggle('normal-mode', invitationMode !== 'special');
      document.documentElement.classList.toggle('special-mode', invitationMode === 'special');
      document.documentElement.classList.toggle('normal-mode', invitationMode !== 'special');
      applyBrowserTheme(invitationMode);

      curtain.classList.add('is-open');
      document.body.classList.remove('no-scroll');

      window.setTimeout(() => {
        curtain.classList.add('is-hidden');
        curtain.classList.remove('is-special-unlocking');
      }, 2200);
    }

    function unlockSpecialMode() {
      if (invitationOpening || specialTriggered || !specialModeAllowed()) return;

      specialTriggered = true;
      invitationMode = 'special';
      document.body.classList.add('special-mode');
      document.body.classList.remove('normal-mode');
      document.documentElement.classList.add('special-mode');
      document.documentElement.classList.remove('normal-mode');
      applyBrowserTheme('special');

      clearHoldState();
      btn.classList.add('is-special-unlocked');

      if (typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate([70, 45, 100]);
        } catch {}
      }

      buildSpecialParticles();
      curtain.classList.add('is-special-unlocking');

      if (specialFx) {
        specialFx.setAttribute('aria-hidden', 'false');
      }

      window.setTimeout(() => {
        openInvitation('special');
      }, 1200);

      window.setTimeout(() => {
        specialFx?.setAttribute('aria-hidden', 'true');
      }, 2300);
    }

    btn.addEventListener('pointerdown', event => {
      if (invitationOpening) return;
      if (typeof event.button === 'number' && event.button !== 0) return;

      specialTriggered = false;

      if (!specialModeAllowed()) {
        activePointerId = event.pointerId;
        return;
      }

      activePointerId = event.pointerId;

      try {
        btn.setPointerCapture?.(event.pointerId);
      } catch {}

      btn.classList.add('is-long-pressing');
      holdTimer = window.setTimeout(unlockSpecialMode, HOLD_DURATION);
    });

    btn.addEventListener('pointerup', event => {
      if (activePointerId !== null && event.pointerId !== activePointerId) return;

      const wasSpecial = specialTriggered;
      clearHoldState();

      if (!wasSpecial && !invitationOpening) {
        openInvitation('normal');
      }
    });

    btn.addEventListener('pointercancel', clearHoldState);

    btn.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse' && !specialTriggered) {
        clearHoldState();
      }
    });

    btn.addEventListener('click', event => {
      event.preventDefault();

      if (event.detail === 0 && !invitationOpening) {
        clearHoldState();
        openInvitation('normal');
      }
    });

    btn.addEventListener('contextmenu', event => {
      event.preventDefault();
    });
  }

  function initHero() {
    const photo = $('#heroPhoto');

    if (photo && typeof PRIVATE_WEDDING !== 'undefined') {
      const heroPath = MEDIA_CONFIG.media?.hero || '';
      const external = PRIVATE_WEDDING.mediaUrl(heroPath);

      if (external) {
        photo.dataset.mediaResolved = 'worker-r2';
        photo.dataset.protectedSrc = external;

        const preload = new Image();
        preload.decoding = 'async';

        preload.addEventListener('load', () => {
          photo.style.backgroundImage = `url("${external.replace(/"/g, '%22')}")`;
          photo.classList.add('is-media-loaded');
          photo.classList.remove('is-media-error');
        }, { once: true });

        preload.addEventListener('error', () => {
          photo.classList.add('is-media-error');
          photo.classList.remove('is-media-loaded');
        }, { once: true });

        preload.src = external;
      }
    }

    const names = $('#heroNames');
    const date = $('#heroDate');
    const venue = $('#heroVenue');

    if (names) names.textContent = `${CONFIG.groom.name || ''} & ${CONFIG.bride.name || ''}`;
    if (date) date.textContent = formatDate(CONFIG.wedding.date, CONFIG.wedding.time);
    if (venue) venue.textContent = CONFIG.wedding.venue;
  }

  function initCountdown() {
    const target = weddingDateTime();

    function update() {
      const diff = target - new Date();
      const label = $('#countdownLabel');
      if (!label) return;

      if (diff <= 0) {
        ['countDays', 'countHours', 'countMinutes', 'countSeconds'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = '0';
        });
        label.textContent = '결혼식이 시작되었습니다';
        return;
      }

      const totalDays = Math.ceil(diff / 86400000);
      label.textContent = `결혼식까지 D-${totalDays}`;

      const values = {
        countDays: Math.floor(diff / 86400000),
        countHours: String(Math.floor(diff / 3600000) % 24).padStart(2, '0'),
        countMinutes: String(Math.floor(diff / 60000) % 60).padStart(2, '0'),
        countSeconds: String(Math.floor(diff / 1000) % 60).padStart(2, '0')
      };
      Object.entries(values).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      });
    }

    update();
    window.setInterval(update, 1000);
  }

  function initGreeting() {
    const title = $('#greetingTitle');
    const content = $('#greetingContent');
    const parents = $('#greetingParents');
    if (title) title.textContent = CONFIG.greeting.title;

    if (content) {
      const greetingText = String(CONFIG.greeting.content || '');

      if (CONFIG.greeting.acrostic) {
        content.replaceChildren();

        greetingText.split(/\r?\n/).forEach((rawLine) => {
          const line = rawLine.trim();

          if (!line) return;

          if (line === '♥') {
            const heart = document.createElement('div');
            heart.className = 'greeting-poem__heart';
            heart.setAttribute('aria-hidden', 'true');
            heart.textContent = '♥';
            content.appendChild(heart);
            return;
          }

          const row = document.createElement('div');
          row.className = 'greeting-poem__line';

          const initial = document.createElement('span');
          initial.className = 'greeting-poem__initial';
          initial.textContent = line.charAt(0);

          const sentence = document.createElement('span');
          sentence.className = 'greeting-poem__sentence';
          sentence.textContent = line.slice(1);

          row.append(initial, sentence);
          content.appendChild(row);
        });
      } else {
        content.textContent = greetingText;
      }
    }

    if (!parents) return;

    const g = CONFIG.groom;
    const b = CONFIG.bride;

    const parentName = (name, deceased) =>
      `${deceased ? '故 ' : ''}${name || ''}`.trim();

    parents.innerHTML = `
      <div class="parent-row">
        <span class="parent-row__father">${parentName(g.father, g.fatherDeceased)}</span>
        <span class="parent-row__dot" aria-hidden="true">·</span>
        <span class="parent-row__mother">${parentName(g.mother, g.motherDeceased)}</span>
        <span class="parent-row__relation">의 아들</span>
        <strong class="parent-row__child">${g.name || ''}</strong>
      </div>

      <div class="parent-row">
        <span class="parent-row__father">${parentName(b.father, b.fatherDeceased)}</span>
        <span class="parent-row__dot" aria-hidden="true">·</span>
        <span class="parent-row__mother">${parentName(b.mother, b.motherDeceased)}</span>
        <span class="parent-row__relation">의 딸</span>
        <strong class="parent-row__child">${b.name || ''}</strong>
      </div>
    `;
  }


  function sanitizePhone(phone) {
    return String(phone || '').replace(/[^\d+]/g, '');
  }

  function contactActionHtml(phone, personLabel) {
    const clean = sanitizePhone(phone);
    if (!clean || clean.replace(/\D/g, '').length < 8) {
      return `
        <span class="contact-person__action contact-person__action--disabled" aria-label="${personLabel} 전화번호 미입력">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z"/></svg>
        </span>
        <span class="contact-person__action contact-person__action--disabled" aria-label="${personLabel} 문자번호 미입력">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>
        </span>
      `;
    }

    return `
      <a class="contact-person__action" href="tel:${clean}" aria-label="${personLabel}에게 전화하기">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z"/></svg>
      </a>
      <a class="contact-person__action" href="sms:${clean}" aria-label="${personLabel}에게 문자 보내기">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>
      </a>
    `;
  }

  function renderContactSide(side, containerId, relationWord) {
    const container = document.getElementById(containerId);
    if (!container || !side) return;

    const rows = [
      {
        role: relationWord === '아들' ? '신랑' : '신부',
        name: side.name || '',
        phone: side.phone || ''
      },
      {
        role: '아버지',
        name: side.father || '',
        phone: side.fatherPhone || '',
        deceased: side.fatherDeceased
      },
      {
        role: '어머니',
        name: side.mother || '',
        phone: side.motherPhone || '',
        deceased: side.motherDeceased
      }
    ];

    container.innerHTML = rows.map((person) => {
      const displayName = `${person.deceased ? '故 ' : ''}${person.name}`.trim();
      const label = `${person.role} ${displayName}`.trim();

      return `
        <div class="contact-person">
          <div class="contact-person__identity">
            <span class="contact-person__role">${person.role}</span>
            <span class="contact-person__name">${displayName}</span>
          </div>
          <div class="contact-person__actions">
            ${contactActionHtml(person.phone, label)}
          </div>
        </div>
      `;
    }).join('');
  }

  function initContacts() {
    renderContactSide(CONFIG.groom, 'groomContactList', '아들');
    renderContactSide(CONFIG.bride, 'brideContactList', '딸');
  }

  function initCalendar() {
    const dt = weddingDateTime();
    const year = dt.getFullYear();
    const month = dt.getMonth();
    const weddingDay = dt.getDate();
    const grid = $('#calendarGrid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="calendar__header">
        <span class="calendar__month-name">${month + 1}월</span>
        <span class="calendar__year">${year}</span>
      </div>
    `;

    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const wdRow = document.createElement('div');
    wdRow.className = 'calendar__weekdays';
    weekdays.forEach(wd => {
      const el = document.createElement('span');
      el.className = 'calendar__weekday';
      el.textContent = wd;
      wdRow.appendChild(el);
    });
    grid.appendChild(wdRow);

    const daysContainer = document.createElement('div');
    daysContainer.className = 'calendar__days';
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('span');
      empty.className = 'calendar__day is-empty';
      daysContainer.appendChild(empty);
    }

    for (let d = 1; d <= lastDate; d++) {
      const dayEl = document.createElement('span');
      dayEl.className = 'calendar__day';
      if (d === weddingDay) dayEl.classList.add('is-today');
      if (month === 11 && d === 25) dayEl.classList.add('is-christmas');
      dayEl.textContent = d;
      daysContainer.appendChild(dayEl);
    }
    grid.appendChild(daysContainer);

    const google = $('#googleCalBtn');
    if (google) {
      const start = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const end = new Date(dt.getTime() + 2 * 60 * 60 * 1000)
        .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      google.href =
        `https://calendar.google.com/calendar/render?action=TEMPLATE` +
        `&text=${encodeURIComponent(CONFIG.groom.name + ' ♥ ' + CONFIG.bride.name + ' 결혼식')}` +
        `&dates=${start}/${end}` +
        `&location=${encodeURIComponent(CONFIG.wedding.venue + ' ' + CONFIG.wedding.address)}`;
    }

    const ics = $('#icsDownloadBtn');
    if (ics) {
      ics.addEventListener('click', () => {
        const start = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const end = new Date(dt.getTime() + 2 * 60 * 60 * 1000)
          .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const data = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'BEGIN:VEVENT',
          `DTSTART:${start}`,
          `DTEND:${end}`,
          `SUMMARY:${CONFIG.groom.name} ♥ ${CONFIG.bride.name} 결혼식`,
          `LOCATION:${CONFIG.wedding.venue} ${CONFIG.wedding.address}`,
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\r\n');
        const url = URL.createObjectURL(new Blob([data], { type: 'text/calendar;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wedding.ics';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  }

  let modalImages = [];
  let modalIndex = 0;
  let randomGalleryImages = [];
  let lastRandomGalleryIndex = -1;
  let modalAnimating = false;
  let modalTransitionId = 0;

  function updateModalUi() {
    const counter = $('#modalCounter');
    if (counter) counter.textContent = `${modalIndex + 1} / ${modalImages.length}`;

    const prev = $('#modalPrev');
    const next = $('#modalNext');
    const hasMultipleImages = modalImages.length > 1;

    // 순환형 갤러리: 첫/마지막 사진에서도 화살표를 유지합니다.
    if (prev) prev.style.display = hasMultipleImages ? '' : 'none';
    if (next) next.style.display = hasMultipleImages ? '' : 'none';
  }

  function setModalImage(index) {
    const img = $('#modalImg');
    if (!img || !modalImages.length) return;

    const src = modalImages[index];
    img.dataset.protectedSrc = src;
    img.style.backgroundImage = `url("${src.replace(/"/g, '%22')}")`;
  }

  function showModalImage() {
    if (!modalImages.length) return;
    setModalImage(modalIndex);
    updateModalUi();
  }

  function preloadModalImage(src) {
    return new Promise(resolve => {
      const preloader = new Image();
      preloader.onload = resolve;
      preloader.onerror = resolve;
      preloader.src = src;
    });
  }

  async function changeModalImage(targetIndex, direction) {
    if (modalAnimating || modalImages.length < 2) return;

    // 인덱스를 순환시켜 마지막↔처음 이동을 허용합니다.
    targetIndex = (targetIndex + modalImages.length) % modalImages.length;
    if (targetIndex === modalIndex) return;

    const img = $('#modalImg');
    if (!img) return;

    const reduceMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      typeof img.animate !== 'function';

    if (reduceMotion) {
      modalIndex = targetIndex;
      showModalImage();
      return;
    }

    modalAnimating = true;
    const transitionId = ++modalTransitionId;
    const nextSrc = modalImages[targetIndex];
    const offset = Math.min(18, Math.max(10, window.innerWidth * 0.035));
    const sign = direction >= 0 ? 1 : -1;

    try {
      // 다음 사진을 먼저 받아두어 전환 중 빈 화면이 생기지 않게 합니다.
      await preloadModalImage(nextSrc);
      if (transitionId !== modalTransitionId) return;

      const outAnimation = img.animate(
        [
          { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
          { opacity: 0, transform: `translate3d(${-sign * offset}px, 0, 0) scale(.995)` }
        ],
        {
          duration: 155,
          easing: 'cubic-bezier(.4, 0, .2, 1)',
          fill: 'forwards'
        }
      );

      await outAnimation.finished.catch(() => {});
      if (transitionId !== modalTransitionId) return;

      modalIndex = targetIndex;
      setModalImage(modalIndex);
      updateModalUi();

      const inAnimation = img.animate(
        [
          { opacity: 0, transform: `translate3d(${sign * offset}px, 0, 0) scale(.995)` },
          { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
        ],
        {
          duration: 225,
          easing: 'cubic-bezier(.22, 1, .36, 1)',
          fill: 'forwards'
        }
      );

      await inAnimation.finished.catch(() => {});
    } finally {
      if (transitionId === modalTransitionId) {
        img.getAnimations().forEach(animation => animation.cancel());
        modalAnimating = false;
      }
    }
  }

  function moveModalImage(step) {
    if (!modalImages.length || modalImages.length < 2) return;

    const direction = step > 0 ? 1 : -1;
    const targetIndex =
      (modalIndex + step + modalImages.length) % modalImages.length;

    changeModalImage(targetIndex, direction);
  }

  function openPhotoModal(images, index) {
    modalTransitionId += 1;
    modalAnimating = false;
    modalImages = images;
    modalIndex = index;
    showModalImage();

    const modal = $('#photoModal');
    if (modal) modal.classList.add('is-open');
    document.body.classList.add('no-scroll');
  }

  function closePhotoModal() {
    modalTransitionId += 1;
    modalAnimating = false;

    const img = $('#modalImg');
    img?.getAnimations().forEach(animation => animation.cancel());

    const modal = $('#photoModal');
    if (modal) modal.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  }

  function initPhotoModal() {
    const modal = $('#photoModal');
    if (!modal) return;

    $('#modalClose')?.addEventListener('click', closePhotoModal);

    $('#modalPrev')?.addEventListener('click', () => {
      moveModalImage(-1);
    });

    $('#modalNext')?.addEventListener('click', () => {
      moveModalImage(1);
    });

    let suppressModalClickUntil = 0;

    modal.addEventListener('click', e => {
      // 스와이프 직후 생성되는 synthetic click으로 모달이 닫히는 현상 방지
      if (performance.now() < suppressModalClickUntil) {
        e.preventDefault();
        return;
      }

      if (e.target === modal || e.target.id === 'modalContainer') closePhotoModal();
    });

    document.addEventListener('keydown', e => {
      if (!modal.classList.contains('is-open')) return;

      if (e.key === 'Escape') closePhotoModal();
      if (e.key === 'ArrowLeft') moveModalImage(-1);
      if (e.key === 'ArrowRight') moveModalImage(1);
    });

    let startX = 0;
    let startY = 0;
    let trackingTouch = false;
    let horizontalGesture = false;
    const container = $('#modalContainer');

    container?.addEventListener('touchstart', e => {
      if (!e.touches.length) return;

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      trackingTouch = true;
      horizontalGesture = false;
    }, { passive: true });

    container?.addEventListener('touchmove', e => {
      if (!trackingTouch || !e.touches.length) return;

      const touch = e.touches[0];
      const diffX = startX - touch.clientX;
      const diffY = startY - touch.clientY;

      // 가로 의도가 확인되면 브라우저의 뒤로가기/페이지 제스처보다 갤러리를 우선합니다.
      if (Math.abs(diffX) > 8 && Math.abs(diffX) > Math.abs(diffY)) {
        horizontalGesture = true;
        e.preventDefault();
      }
    }, { passive: false });

    container?.addEventListener('touchend', e => {
      if (!trackingTouch || !e.changedTouches.length) return;

      const touch = e.changedTouches[0];
      const diffX = startX - touch.clientX;
      const diffY = startY - touch.clientY;

      trackingTouch = false;

      // 가로 스와이프 판정. 너무 짧은 움직임과 세로 제스처는 무시합니다.
      if (
        !horizontalGesture ||
        Math.abs(diffX) < 36 ||
        Math.abs(diffX) <= Math.abs(diffY)
      ) {
        horizontalGesture = false;
        return;
      }

      // 스와이프 후 발생할 수 있는 click 이벤트로 모달이 닫히지 않도록 잠시 차단합니다.
      suppressModalClickUntil = performance.now() + 450;

      // 완전 순환: 마지막→첫 사진 / 첫 사진→마지막 사진
      moveModalImage(diffX > 0 ? 1 : -1);
      horizontalGesture = false;
    }, { passive: true });

    container?.addEventListener('touchcancel', () => {
      trackingTouch = false;
      horizontalGesture = false;
    }, { passive: true });
  }

  async function activateSpecialGalleryRandomDraw() {
    const button = $('#galleryRandomBtn');
    if (!button || invitationMode !== 'special') return;

    try {
      const manifest = await PRIVATE_WEDDING.getSpecialGalleryManifest();
      const paths = Array.isArray(manifest.images) ? manifest.images : [];

      if (!paths.length) {
        button.hidden = true;
        return;
      }

      const kicker = button.querySelector('.gallery__random-btn-kicker');
      const label = button.querySelector('.gallery__random-btn-label');

      if (kicker) kicker.textContent = 'BEHIND CUT';
      if (label) label.textContent = '비하인드 뽑기';

      button.setAttribute('aria-label', '스페셜 비하인드컷 랜덤 뽑기');

      const images = paths.map(path => PRIVATE_WEDDING.mediaUrl(path));
      initGalleryRandomDraw(paths, images);
    } catch (error) {
      console.warn('[Special Gallery]', error);
      button.hidden = true;
    }
  }

  function initGalleryRandomDraw(paths, images) {
    const button = $('#galleryRandomBtn');
    if (!button) return;

    randomGalleryImages = paths
      .map((path, index) => ({ path, src: images[index] }))
      .filter(item => !String(item.path).toLowerCase().includes('meal'))
      .map(item => item.src);

    lastRandomGalleryIndex = -1;

    if (!randomGalleryImages.length) {
      button.hidden = true;
      return;
    }

    button.hidden = false;

    if (button.dataset.randomReady === 'true') return;
    button.dataset.randomReady = 'true';

    const label = button.querySelector('.gallery__random-btn-label');
    const kicker = button.querySelector('.gallery__random-btn-kicker');
    const defaultLabel = label?.textContent || '랜덤 뽑기';
    const defaultKicker = kicker?.textContent || 'RANDOM PHOTO';

    button.addEventListener('click', async () => {
      if (!randomGalleryImages.length || button.classList.contains('is-shuffling')) return;

      let randomIndex = 0;

      if (randomGalleryImages.length > 1) {
        do {
          randomIndex = Math.floor(Math.random() * randomGalleryImages.length);
        } while (randomIndex === lastRandomGalleryIndex);
      }

      const selectedSrc = randomGalleryImages[randomIndex];
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      button.classList.add('is-shuffling');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');

      if (kicker) kicker.textContent = 'SHUFFLING';
      if (label) label.textContent = '두근...';

      // 결과 이미지는 셔플 애니메이션 중 미리 받아 팝업 지연을 줄입니다.
      const preloadPromise = preloadModalImage(selectedSrc);

      const shuffleLabels = ['두근...', '두근두근...', '고르는 중...', '두근두근...'];
      let shuffleStep = 0;
      let shuffleTimer = null;

      if (!reduceMotion) {
        shuffleTimer = window.setInterval(() => {
          shuffleStep = (shuffleStep + 1) % shuffleLabels.length;
          if (label) label.textContent = shuffleLabels[shuffleStep];
        }, 360);
      }

      await new Promise(resolve => {
        window.setTimeout(resolve, reduceMotion ? 450 : 2000);
      });

      if (shuffleTimer) window.clearInterval(shuffleTimer);
      await preloadPromise;

      lastRandomGalleryIndex = randomIndex;

      button.classList.remove('is-shuffling');
      button.disabled = false;
      button.removeAttribute('aria-busy');

      if (kicker) kicker.textContent = defaultKicker;
      if (label) label.textContent = defaultLabel;

      // 랜덤 결과는 한 장만 보여주므로 좌우 화살표 없이 팝업합니다.
      openPhotoModal([selectedSrc], 0);
    });
  }

  function renderGalleryComingSoon() {
    const section = $('#gallery');
    const grid = $('#galleryGrid');
    const randomButton = $('#galleryRandomBtn');
    if (!section || !grid) return;

    if (randomButton) randomButton.hidden = true;
    randomGalleryImages = [];
    lastRandomGalleryIndex = -1;

    section.style.display = '';
    section.classList.add('is-coming-soon');
    grid.innerHTML = `
      <div class="gallery__coming-soon" role="status" aria-live="polite">
        <span class="gallery__coming-soon-kicker">PHOTO GALLERY</span>
        <strong>Coming soon</strong>
        <span>사진을 준비하고 있습니다.</span>
      </div>
    `;
  }

  async function initGallery() {
    const grid = $('#galleryGrid');
    const section = $('#gallery');
    if (!grid) return;

    grid.innerHTML = '';

    const randomButton = $('#galleryRandomBtn');
    if (randomButton && invitationMode !== 'special') {
      randomButton.hidden = true;
    }

    if (section) {
      section.style.display = '';
      section.classList.remove('is-coming-soon');
    }

    try {
      const manifest = await PRIVATE_WEDDING.getGalleryManifest();
      const paths = Array.isArray(manifest.images) ? manifest.images : [];

      if (!paths.length) {
        renderGalleryComingSoon();
        return;
      }

      const images = paths.map((path) => PRIVATE_WEDDING.mediaUrl(path));

      images.forEach((src, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'gallery__item animate-item';
        item.setAttribute('data-animate', 'scale-in');
        item.setAttribute('aria-label', `갤러리 사진 ${index + 1} 크게 보기`);

        item.dataset.protectedSrc = src;
        item.style.backgroundImage = `url("${src.replace(/"/g, '%22')}")`;

        item.addEventListener('click', () => openPhotoModal(images, index));
        grid.appendChild(item);
      });

      if (invitationMode === 'special') {
        await activateSpecialGalleryRandomDraw();
      }
    } catch (error) {
      console.warn('[Gallery]', error);
      renderGalleryComingSoon();
    }
  }

  function initLocation() {
    const w = CONFIG.wedding;
    $('#locationVenue') && ($('#locationVenue').textContent = w.locationName || w.venue);
    $('#locationHall') && ($('#locationHall').textContent = w.hall || '');
    $('#locationAddress') && ($('#locationAddress').textContent = w.address);
    $('#locationTel') && ($('#locationTel').textContent = w.tel ? `Tel. ${w.tel}` : '');


    const kakao = $('#kakaoMapBtn');
    const naver = $('#naverMapBtn');

    if (kakao) {
      kakao.href = w.mapLinks.kakao || '#';
    }

    if (naver) {
      const webUrl = w.mapLinks.naver || '#';
      const iosUrl = w.mapLinks.naverIOS || '';
      const ua = navigator.userAgent || '';
      const isIOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      naver.href = webUrl;

      if (isIOS && iosUrl) {
        naver.removeAttribute('target');

        naver.addEventListener('click', (event) => {
          event.preventDefault();

          // iOS에서는 네이버지도 앱만 직접 호출합니다.
          // 자동 웹 fallback은 사용하지 않습니다.
          window.location.href = iosUrl;
        });
      }
    }

    $('#copyAddressBtn')?.addEventListener('click', () => {
      copyToClipboard(w.address, '주소가 복사되었습니다');
    });
  }

  function renderAccounts(accounts, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    accounts.forEach(acc => {
      const item = document.createElement('div');
      item.className = 'account-item';
      item.innerHTML = `
        <div class="account-item__main">
          <div class="account-item__identity">
            <span class="account-item__role">${acc.role || ''}</span>
            <strong class="account-item__name">${acc.name || ''}</strong>
          </div>

          <div class="account-item__payment">
            <span class="account-item__role-spacer" aria-hidden="true"></span>
            <div class="account-item__payment-data">
              <strong class="account-item__bank">${acc.bank || ''}</strong>
              <strong class="account-item__number">${acc.number || ''}</strong>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="account-item__copy"
          data-account="${acc.bank || ''} ${acc.number || ''}"
        ><span class="account-item__copy-label">복사</span></button>
      `;
      container.appendChild(item);
    });
  }

  function initAccordion(triggerId, panelId) {
    const trigger = document.getElementById(triggerId);
    const panel = document.getElementById(panelId);
    if (!trigger || !panel) return;

    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));
      panel.style.maxHeight = expanded ? '0' : `${panel.scrollHeight}px`;
    });
  }

  function initAccounts() {
    initAccordion('groomAccordion', 'groomAccordionPanel');
    initAccordion('brideAccordion', 'brideAccordionPanel');

    let loaded = false;
    let loading = false;

    async function loadAccountsOnce() {
      if (loaded || loading) return;
      loading = true;

      try {
        const accounts = await PRIVATE_WEDDING.getAccounts();

        CONFIG.accounts = {
          groom: Array.isArray(accounts.groom) ? accounts.groom : [],
          bride: Array.isArray(accounts.bride) ? accounts.bride : []
        };

        renderAccounts(CONFIG.accounts.groom, 'groomAccountList');
        renderAccounts(CONFIG.accounts.bride, 'brideAccountList');

        ['groom', 'bride'].forEach(side => {
          const trigger = document.getElementById(`${side}Accordion`);
          const panel = document.getElementById(`${side}AccordionPanel`);

          if (
            trigger &&
            panel &&
            trigger.getAttribute('aria-expanded') === 'true'
          ) {
            panel.style.maxHeight = `${panel.scrollHeight}px`;
          }
        });

        loaded = true;
      } catch (error) {
        console.warn('[Accounts]', error);
        showToast('계좌 정보를 불러오지 못했습니다');
      } finally {
        loading = false;
      }
    }

    ['groomAccordion', 'brideAccordion'].forEach(id => {
      document.getElementById(id)?.addEventListener(
        'click',
        loadAccountsOnce,
        { capture: true }
      );
    });

    document.addEventListener('click', e => {
      const btn = e.target.closest('.account-item__copy');
      if (!btn) return;
      copyToClipboard(btn.dataset.account || '', '계좌번호가 복사되었습니다');
    });
  }

  function initFooter() {
    const el = $('#footerText');
    if (!el) return;
    const d = weddingDateTime();
    el.textContent =
      `${CONFIG.groom.name} & ${CONFIG.bride.name} — ` +
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }

  function initScrollAnimations() {
    if (!('IntersectionObserver' in window)) {
      $$('.animate-item').forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });

    $$('.animate-item').forEach(el => observer.observe(el));

    const mutation = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.classList.contains('animate-item')) observer.observe(node);
          node.querySelectorAll?.('.animate-item').forEach(el => observer.observe(el));
        });
      });
    });

    mutation.observe(document.body, { childList: true, subtree: true });
  }

  async function init() {
    try {
      await PRIVATE_WEDDING.init();
    } catch (error) {
      console.warn('[Private wedding data]', error);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = '초대장 정보를 불러오지 못했습니다.';
        toast.classList.add('is-visible');
      }
      return;
    }

    initMeta();
    initCurtain();
    initHero();
    initCountdown();
    initGreeting();
    initContacts();
    initCalendar();
    initPhotoModal();
    initLocation();
    initAccounts();
    initFooter();
    initScrollAnimations();

    // Gallery only. Story dependencies are intentionally gone.
    await initGallery();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
