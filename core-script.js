/**
 * Wedding Invitation Core Script
 * classic-elegant UI structure compatible
 * Story section intentionally removed.
 */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

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
    if (!curtain || !btn || !names) return;

    names.textContent = `${CONFIG.groom.name} & ${CONFIG.bride.name}`;

    if (CONFIG.useCurtain === false) {
      curtain.style.display = 'none';
      document.body.classList.remove('no-scroll');
      return;
    }

    document.body.classList.add('no-scroll');

    btn.addEventListener('click', () => {
      curtain.classList.add('is-open');
      document.body.classList.remove('no-scroll');
      window.setTimeout(() => curtain.classList.add('is-hidden'), 1400);
    });
  }

  function mediaUrl(path) {
    if (!path || typeof MEDIA_CONFIG === 'undefined' || !MEDIA_CONFIG.baseUrl) return '';
    return `${MEDIA_CONFIG.baseUrl.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;
  }

  function initHero() {
    const photo = $('#heroPhoto');
    if (photo) {
      const external = typeof MEDIA_CONFIG !== 'undefined' && MEDIA_CONFIG.hero
        ? mediaUrl(MEDIA_CONFIG.hero.primary)
        : '';
      if (external) photo.src = external;
    }

    const names = $('#heroNames');
    const date = $('#heroDate');
    const venue = $('#heroVenue');
    if (names) names.textContent = `${CONFIG.groom.name} & ${CONFIG.bride.name}`;
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
    if (content) content.textContent = CONFIG.greeting.content;
    if (!parents) return;

    const g = CONFIG.groom;
    const b = CONFIG.bride;
    parents.innerHTML = `
      <div class="parent-row">${g.father} · ${g.mother}&nbsp;&nbsp;의 아들&nbsp;&nbsp;${g.name}</div>
      <div class="parent-row">${b.father} · ${b.mother}&nbsp;&nbsp;의 딸&nbsp;&nbsp;${b.name}</div>
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

  function detectLocalImages(folder, maxAttempts = 30) {
    return new Promise(resolve => {
      const found = [];
      let current = 1;
      let fails = 0;

      function next() {
        if (current > maxAttempts || fails >= 3) {
          resolve(found);
          return;
        }
        const path = `images/${folder}/${current}.jpg`;
        const img = new Image();
        img.onload = () => {
          found.push(path);
          fails = 0;
          current += 1;
          next();
        };
        img.onerror = () => {
          fails += 1;
          current += 1;
          next();
        };
        img.src = path;
      }
      next();
    });
  }

  let modalImages = [];
  let modalIndex = 0;

  function showModalImage() {
    const img = $('#modalImg');
    if (!img || !modalImages.length) return;
    img.src = modalImages[modalIndex];

    const counter = $('#modalCounter');
    if (counter) counter.textContent = `${modalIndex + 1} / ${modalImages.length}`;

    const prev = $('#modalPrev');
    const next = $('#modalNext');
    if (prev) prev.style.display = modalIndex > 0 ? '' : 'none';
    if (next) next.style.display = modalIndex < modalImages.length - 1 ? '' : 'none';
  }

  function openPhotoModal(images, index) {
    modalImages = images;
    modalIndex = index;
    showModalImage();
    const modal = $('#photoModal');
    if (modal) modal.classList.add('is-open');
    document.body.classList.add('no-scroll');
  }

  function closePhotoModal() {
    const modal = $('#photoModal');
    if (modal) modal.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  }

  function initPhotoModal() {
    const modal = $('#photoModal');
    if (!modal) return;

    $('#modalClose')?.addEventListener('click', closePhotoModal);
    $('#modalPrev')?.addEventListener('click', () => {
      if (modalIndex > 0) {
        modalIndex -= 1;
        showModalImage();
      }
    });
    $('#modalNext')?.addEventListener('click', () => {
      if (modalIndex < modalImages.length - 1) {
        modalIndex += 1;
        showModalImage();
      }
    });

    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.id === 'modalContainer') closePhotoModal();
    });

    document.addEventListener('keydown', e => {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') closePhotoModal();
    });

    let startX = 0;
    const container = $('#modalContainer');
    container?.addEventListener('touchstart', e => {
      startX = e.changedTouches[0].screenX;
    }, { passive: true });
    container?.addEventListener('touchend', e => {
      const diff = startX - e.changedTouches[0].screenX;
      if (Math.abs(diff) < 50) return;
      if (diff > 0 && modalIndex < modalImages.length - 1) modalIndex += 1;
      if (diff < 0 && modalIndex > 0) modalIndex -= 1;
      showModalImage();
    }, { passive: true });
  }

  async function initGallery() {
    const grid = $('#galleryGrid');
    if (!grid) return;

    // Story 삭제 이후 남던 무한 loading placeholder를 사용하지 않는다.
    grid.innerHTML = '';

    const images = await detectLocalImages('gallery');
    if (!images.length) {
      const section = $('#gallery');
      if (section) section.style.display = 'none';
      return;
    }

    images.forEach((src, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'gallery__item animate-item';
      item.setAttribute('data-animate', 'scale-in');
      item.setAttribute('aria-label', `갤러리 사진 ${index + 1} 크게 보기`);

      const image = document.createElement('img');
      image.src = src;
      image.alt = `갤러리 사진 ${index + 1}`;
      image.loading = 'lazy';
      image.decoding = 'async';

      item.appendChild(image);
      item.addEventListener('click', () => openPhotoModal(images, index));
      grid.appendChild(item);
    });
  }

  function initLocation() {
    const w = CONFIG.wedding;
    $('#locationVenue') && ($('#locationVenue').textContent = w.venue);
    $('#locationHall') && ($('#locationHall').textContent = w.hall || '');
    $('#locationAddress') && ($('#locationAddress').textContent = w.address);
    $('#locationTel') && ($('#locationTel').textContent = w.tel ? `Tel. ${w.tel}` : '');

    const mapImg = $('#locationMapImg');
    if (mapImg) mapImg.src = 'images/location/1.jpg';

    const kakao = $('#kakaoMapBtn');
    const naver = $('#naverMapBtn');
    if (kakao) kakao.href = w.mapLinks.kakao || '#';
    if (naver) naver.href = w.mapLinks.naver || '#';

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
        <div class="account-item__info">
          <span class="account-item__role">${acc.role || ''}</span>
          <span class="account-item__name">${acc.name || ''}</span>
          <span class="account-item__bank">${acc.bank || ''}</span>
          <span class="account-item__number">${acc.number || ''}</span>
        </div>
        <button type="button" class="account-item__copy" data-account="${acc.bank || ''} ${acc.number || ''}">복사</button>
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
    renderAccounts(CONFIG.accounts.groom || [], 'groomAccountList');
    renderAccounts(CONFIG.accounts.bride || [], 'brideAccountList');
    initAccordion('groomAccordion', 'groomAccordionPanel');
    initAccordion('brideAccordion', 'brideAccordionPanel');

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
