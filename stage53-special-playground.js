(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let messagesLoaded = false;
  let messagesLoading = false;
  let lastMessageSubmit = 0;
  let messageAdminPin = '';
  let adminTitleTapCount = 0;
  let adminTitleTapTimer = null;

  function isSpecial() {
    return document.body.classList.contains('special-mode');
  }

  function dispatchSnowBurst() {
    window.dispatchEvent(new CustomEvent('special-snow-burst'));
  }

  /* ----------------------------------------------------------
     SPECIAL NAVIGATION
     ---------------------------------------------------------- */
  function syncSpecialNavigation() {
    const buttons = $$('.hero__quick-btn[data-scroll-target]');
    if (buttons.length < 3) return;

    if (isSpecial()) {
      const setup = [
        ['메시지함', 'specialMessages'],
        ['갤러리', 'gallery'],
        ['틀린그림', 'specialSpot']
      ];

      buttons.slice(0, 3).forEach((button, index) => {
        button.textContent = setup[index][0];
        button.dataset.scrollTarget = setup[index][1];
      });

      loadMessages();
      setupSpotImage();
    } else {
      const setup = [
        ['연락처', 'contact'],
        ['갤러리', 'gallery'],
        ['오시는 길', 'location']
      ];

      buttons.slice(0, 3).forEach((button, index) => {
        button.textContent = setup[index][0];
        button.dataset.scrollTarget = setup[index][1];
      });
    }
  }

  /* ----------------------------------------------------------
     MESSAGE BOX
     ---------------------------------------------------------- */
  function formatMessageDate(timestamp) {
    const date = new Date(Number(timestamp) || Date.now());

    return [
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('.');
  }

  function makeMessageCard(item) {
    const card = document.createElement('article');
    card.className = 'special-message__card';
    card.dataset.messageId = item.id || '';

    const text = document.createElement('p');
    text.className = 'special-message__text';
    text.textContent = item.message || '';

    const meta = document.createElement('div');
    meta.className = 'special-message__meta';

    const name = document.createElement('span');
    name.textContent = '— ' + (item.name || '익명');

    const date = document.createElement('time');
    date.textContent = formatMessageDate(item.createdAt);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'special-message__delete';
    deleteButton.textContent = '삭제';
    deleteButton.setAttribute('aria-label', '메시지 삭제');

    meta.append(name, date);
    card.append(text, meta, deleteButton);

    return card;
  }

  function renderMessages(messages, prepend = false) {
    const scroller = $('#specialMessageCards');
    if (!scroller) return;

    const empty = scroller.querySelector('.special-message__empty');
    empty?.remove();

    if (!messages.length && !scroller.children.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'special-message__empty';
      placeholder.textContent = '첫 번째 메시지를 남겨주세요.';
      scroller.appendChild(placeholder);
      return;
    }

    messages.forEach(item => {
      const card = makeMessageCard(item);
      if (prepend) {
        scroller.prepend(card);
      } else {
        scroller.appendChild(card);
      }
    });

    if (prepend) {
      scroller.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }

  async function loadMessages(force = false) {
    if ((!force && messagesLoaded) || messagesLoading || !isSpecial()) return;

    const scroller = $('#specialMessageCards');
    if (!scroller) return;

    messagesLoading = true;

    try {
      const response = await fetch('/api/messages', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) throw new Error('Message list failed');

      const data = await response.json();
      const messages = Array.isArray(data.messages) ? data.messages : [];

      scroller.replaceChildren();
      renderMessages(messages);
      messagesLoaded = true;
    } catch (error) {
      console.warn('[Special messages]', error);

      scroller.replaceChildren();
      const placeholder = document.createElement('div');
      placeholder.className = 'special-message__empty';
      placeholder.textContent = '메시지를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
      scroller.appendChild(placeholder);
    } finally {
      messagesLoading = false;
    }
  }

  async function verifyMessageAdminPin(pin) {
    const response = await fetch('/api/messages/admin/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      cache: 'no-store',
      body: JSON.stringify({ pin })
    });

    return response.ok;
  }

  function setMessageAdminMode(enabled, pin = '') {
    const section = $('#specialMessages');
    if (!section) return;

    messageAdminPin = enabled ? String(pin) : '';
    section.classList.toggle('is-admin', enabled);
  }

  function openMessageAdminModal() {
    const modal = $('#messageAdminModal');
    const input = $('#messageAdminPinInput');
    const error = $('#messageAdminError');

    if (!modal || !input) return;

    if (error) error.textContent = '';
    input.value = '';
    modal.hidden = false;
    modal.classList.add('is-open');

    window.setTimeout(() => {
      try {
        input.focus({ preventScroll: true });
      } catch {
        input.focus();
      }
    }, 30);
  }

  function closeMessageAdminModal() {
    const modal = $('#messageAdminModal');
    const input = $('#messageAdminPinInput');
    const error = $('#messageAdminError');

    if (!modal) return;

    modal.classList.remove('is-open');
    if (input) input.value = '';
    if (error) error.textContent = '';

    window.setTimeout(() => {
      modal.hidden = true;
    }, 180);
  }

  function initMessageAdmin() {
    const section = $('#specialMessages');
    const title = $('#specialMessageTitle');
    const modal = $('#messageAdminModal');
    const form = $('#messageAdminForm');
    const input = $('#messageAdminPinInput');
    const error = $('#messageAdminError');
    const submit = $('#messageAdminSubmit');

    if (!section || !title || !modal || !form || !input || !submit) return;

    function registerSecretTap(event) {
      if (!isSpecial() || section.classList.contains('is-admin')) return;

      const target = event.target instanceof Element
        ? event.target.closest('#specialMessageTitle')
        : null;

      if (!target) return;

      adminTitleTapCount += 1;

      clearTimeout(adminTitleTapTimer);
      adminTitleTapTimer = window.setTimeout(() => {
        adminTitleTapCount = 0;
      }, 7000);

      if (adminTitleTapCount < 5) return;

      adminTitleTapCount = 0;
      clearTimeout(adminTitleTapTimer);
      openMessageAdminModal();
    }

    // Capture-phase pointerdown is more reliable than click/pointerup on iOS,
    // especially because this page also suppresses double-tap zoom.
    document.addEventListener('pointerdown', registerSecretTap, true);

    modal.addEventListener('click', event => {
      if (event.target.closest('[data-admin-close]')) {
        closeMessageAdminModal();
      }
    });

    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
      if (error) error.textContent = '';
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const normalized = input.value.trim();

      if (!/^\d{6}$/.test(normalized)) {
        if (error) error.textContent = '6자리 PIN을 입력해주세요.';
        input.focus();
        return;
      }

      submit.disabled = true;
      submit.textContent = '확인 중...';

      try {
        const valid = await verifyMessageAdminPin(normalized);

        if (!valid) {
          if (error) error.textContent = 'PIN이 올바르지 않습니다.';
          input.select();
          return;
        }

        setMessageAdminMode(true, normalized);
        closeMessageAdminModal();
      } catch (verifyError) {
        console.warn('[Message admin verify]', verifyError);
        if (error) error.textContent = '인증에 실패했습니다. 다시 시도해주세요.';
      } finally {
        submit.disabled = false;
        submit.textContent = '확인';
      }
    });

    section.addEventListener('click', async event => {
      const button = event.target.closest('.special-message__delete');
      if (!button || !section.classList.contains('is-admin')) return;

      const card = button.closest('.special-message__card');
      const id = card?.dataset.messageId || '';

      if (!id || !messageAdminPin) return;

      const text =
        card.querySelector('.special-message__text')?.textContent?.trim() || '';

      const preview = text.length > 24
        ? text.slice(0, 24) + '…'
        : text;

      if (!window.confirm('이 메시지를 삭제할까요?\n\n' + preview)) {
        return;
      }

      button.disabled = true;
      button.textContent = '삭제 중';

      try {
        const response = await fetch(
          '/api/messages/' + encodeURIComponent(id),
          {
            method: 'DELETE',
            headers: {
              'Accept': 'application/json',
              'X-Admin-Pin': messageAdminPin
            },
            cache: 'no-store'
          }
        );

        if (response.status === 403) {
          setMessageAdminMode(false);
          window.alert('관리자 인증이 풀렸습니다. 다시 제목을 5번 탭해주세요.');
          return;
        }

        if (!response.ok) {
          throw new Error('Delete failed');
        }

        card.remove();

        const scroller = $('#specialMessageCards');

        if (scroller && !scroller.querySelector('.special-message__card')) {
          renderMessages([]);
        }
      } catch (deleteError) {
        console.warn('[Message delete]', deleteError);
        window.alert('메시지를 삭제하지 못했습니다.');
        button.disabled = false;
        button.textContent = '삭제';
      }
    });
  }

  function initMessages() {
    const form = $('#specialMessageForm');
    const nameInput = $('#specialMessageName');
    const messageInput = $('#specialMessageText');
    const counter = $('#specialMessageCounter');
    const submit = $('#specialMessageSubmit');

    if (!form || !messageInput || !submit) return;

    function updateCounter() {
      const length = messageInput.value.length;
      if (counter) counter.textContent = String(length) + '/80';
    }

    messageInput.addEventListener('input', updateCounter);
    updateCounter();

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const message = messageInput.value.trim();
      const name = nameInput?.value.trim() || '';

      if (!message) {
        messageInput.focus();
        return;
      }

      const now = Date.now();
      if (now - lastMessageSubmit < 5000) return;

      submit.disabled = true;
      submit.textContent = '남기는 중...';

      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ name, message })
        });

        if (!response.ok) throw new Error('Message submit failed');

        const item = await response.json();

        renderMessages([item], true);
        messageInput.value = '';
        updateCounter();
        lastMessageSubmit = Date.now();
      } catch (error) {
        console.warn('[Special message submit]', error);
        submit.textContent = '다시 시도';
        window.setTimeout(() => {
          submit.textContent = '메시지 남기기';
        }, 1500);
        submit.disabled = false;
        return;
      }

      submit.textContent = '남겼어요';
      window.setTimeout(() => {
        submit.textContent = '메시지 남기기';
        submit.disabled = false;
      }, 900);
    });
  }

  /* ----------------------------------------------------------
     SPOT THE DIFFERENCE
     ---------------------------------------------------------- */
  function getHeroMediaUrl() {
    try {
      const mediaConfig =
        typeof MEDIA_CONFIG !== 'undefined' ? MEDIA_CONFIG : null;
      const privateWedding =
        typeof PRIVATE_WEDDING !== 'undefined' ? PRIVATE_WEDDING : null;
      const heroPath = mediaConfig?.media?.hero;

      if (heroPath && privateWedding?.mediaUrl) {
        return privateWedding.mediaUrl(heroPath);
      }
    } catch {}

    return $('#heroPhoto')?.dataset.protectedSrc || '';
  }

  function setupSpotImage() {
    const game = $('#spotDifferenceGame');
    if (!game || game.dataset.imageReady === 'true') return;

    const url = getHeroMediaUrl();
    if (!url) return;

    game.style.setProperty(
      '--spot-image',
      'url("' + String(url).replace(/"/g, '%22') + '")'
    );
    game.dataset.imageReady = 'true';
  }

  function initSpotDifference() {
    const game = $('#spotDifferenceGame');
    const status = $('#spotDifferenceStatus');
    const complete = $('#spotDifferenceComplete');
    const reset = $('#spotDifferenceReset');

    if (!game) return;

    const hits = $$('.spot-diff__hit', game);
    const found = new Set();

    function update() {
      if (status) {
        status.textContent = String(found.size) + ' / ' + String(hits.length);
      }

      complete?.classList.toggle(
        'is-visible',
        found.size === hits.length && hits.length > 0
      );

      if (found.size === hits.length && hits.length > 0) {
        dispatchSnowBurst();
      }
    }

    hits.forEach(hit => {
      hit.addEventListener('click', () => {
        const id = hit.dataset.diff;
        if (!id || found.has(id)) return;

        found.add(id);
        hit.classList.add('is-found');
        hit.setAttribute('aria-pressed', 'true');
        update();
      });
    });

    reset?.addEventListener('click', () => {
      found.clear();

      hits.forEach(hit => {
        hit.classList.remove('is-found');
        hit.setAttribute('aria-pressed', 'false');
      });

      complete?.classList.remove('is-visible');
      update();
    });

    setupSpotImage();
    update();
  }

  /* ----------------------------------------------------------
     SNOW GLOBE
     ---------------------------------------------------------- */
  function initSnowGlobe() {
    const button = $('#snowGlobeBtn');
    if (!button) return;

    let enabled = false;
    let lastShake = 0;

    function shakeDetected(event) {
      if (!enabled || !isSpecial()) return;

      let magnitude = 0;

      if (event.acceleration) {
        const x = Number(event.acceleration.x) || 0;
        const y = Number(event.acceleration.y) || 0;
        const z = Number(event.acceleration.z) || 0;
        magnitude = Math.sqrt(x * x + y * y + z * z);
      }

      if (magnitude < 1 && event.accelerationIncludingGravity) {
        const x = Number(event.accelerationIncludingGravity.x) || 0;
        const y = Number(event.accelerationIncludingGravity.y) || 0;
        const z = Number(event.accelerationIncludingGravity.z) || 0;
        magnitude = Math.abs(Math.sqrt(x * x + y * y + z * z) - 9.81);
      }

      const now = Date.now();

      if (magnitude >= 9.5 && now - lastShake > 1200) {
        lastShake = now;
        dispatchSnowBurst();
        button.classList.add('is-shaking');
        window.setTimeout(() => button.classList.remove('is-shaking'), 550);
      }
    }

    window.addEventListener('devicemotion', shakeDetected, { passive: true });

    button.addEventListener('click', async () => {
      dispatchSnowBurst();

      if (enabled) {
        button.textContent = '휴대폰을 흔들어보세요';
        return;
      }

      try {
        if (
          typeof DeviceMotionEvent !== 'undefined' &&
          typeof DeviceMotionEvent.requestPermission === 'function'
        ) {
          const result = await DeviceMotionEvent.requestPermission();

          if (result !== 'granted') {
            button.textContent = '모션 권한이 필요해요';
            return;
          }
        }

        enabled = true;
        button.classList.add('is-active');
        button.textContent = '휴대폰을 흔들어보세요';
      } catch (error) {
        console.warn('[Snow globe permission]', error);
        button.textContent = '버튼을 눌러 폭설!';
      }
    });
  }

  /* ----------------------------------------------------------
     SNOWMAN — 5 continuous circles = 1 stage
     ---------------------------------------------------------- */
  function initSnowmanBuilder() {
    const builder = $('#snowmanBuilder');
    const playCanvas = $('#snowPlayCanvas');
    const stageLabel = $('#snowmanStageLabel');
    const dots = $$('.snowman-progress__dot');

    if (!builder || !playCanvas) return;

    const ROTATIONS_PER_STAGE = 5;
    const TARGET_TURN = Math.PI * 2 * ROTATIONS_PER_STAGE;
    const MAX_STAGE = 3;

    let stage = 0;
    let gesture = null;
    let mouseActive = false;

    function viewportHeight() {
      return window.visualViewport?.height ||
        window.innerHeight ||
        document.documentElement.clientHeight;
    }

    function inSnowZone(clientY) {
      return clientY >= viewportHeight() - 150;
    }

    function canRoll() {
      return isSpecial() &&
        stage < MAX_STAGE &&
        playCanvas.classList.contains('is-visible');
    }

    function normalizeAngle(value) {
      while (value > Math.PI) value -= Math.PI * 2;
      while (value < -Math.PI) value += Math.PI * 2;
      return value;
    }

    function startGesture(x, y) {
      gesture = {
        lastX: x,
        lastY: y,
        lastVectorAngle: null,
        turn: 0,
        absoluteTurn: 0,
        distance: 0,
        minX: x,
        maxX: x,
        minY: y,
        maxY: y
      };
    }

    function resetGestureFrom(x, y) {
      startGesture(x, y);
    }

    function advanceStage() {
      if (stage >= MAX_STAGE) return;

      stage += 1;
      builder.dataset.stage = String(stage);

      dots.forEach((dot, index) => {
        dot.classList.toggle('is-complete', index < stage);
      });

      if (stageLabel) {
        stageLabel.textContent = stage >= MAX_STAGE
          ? '눈사람 완성!'
          : '눈사람 ' + String(stage) + ' / ' + String(MAX_STAGE);
      }

      dispatchSnowBurst();

      if (stage >= MAX_STAGE) {
        builder.classList.add('is-complete');
      }
    }

    function addPoint(x, y) {
      if (!gesture) return false;

      const dx = x - gesture.lastX;
      const dy = y - gesture.lastY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 2) return false;

      const vectorAngle = Math.atan2(dy, dx);

      if (gesture.lastVectorAngle !== null) {
        const delta = normalizeAngle(vectorAngle - gesture.lastVectorAngle);

        // Ignore abrupt single-sample jumps caused by touch jitter.
        if (Math.abs(delta) <= 1.35) {
          gesture.turn += delta;
          gesture.absoluteTurn += Math.abs(delta);
        }
      }

      gesture.lastVectorAngle = vectorAngle;
      gesture.lastX = x;
      gesture.lastY = y;
      gesture.distance += distance;
      gesture.minX = Math.min(gesture.minX, x);
      gesture.maxX = Math.max(gesture.maxX, x);
      gesture.minY = Math.min(gesture.minY, y);
      gesture.maxY = Math.max(gesture.maxY, y);

      const width = gesture.maxX - gesture.minX;
      const height = gesture.maxY - gesture.minY;
      const consistency =
        Math.abs(gesture.turn) / Math.max(0.001, gesture.absoluteTurn);

      const qualifies =
        width >= 45 &&
        height >= 45 &&
        gesture.distance >= 420 &&
        Math.abs(gesture.turn) >= TARGET_TURN &&
        consistency >= 0.52;

      if (qualifies) {
        advanceStage();
        resetGestureFrom(x, y);
        return true;
      }

      return false;
    }

    document.addEventListener('touchstart', event => {
      if (!canRoll() || event.touches.length !== 1) {
        gesture = null;
        return;
      }

      const touch = event.touches[0];

      if (!inSnowZone(touch.clientY)) {
        gesture = null;
        return;
      }

      startGesture(touch.clientX, touch.clientY);
    }, { passive: true, capture: true });

    document.addEventListener('touchmove', event => {
      if (!gesture || event.touches.length !== 1) return;

      const touch = event.touches[0];

      // A snow-rolling gesture owns the bottom play zone until the finger lifts.
      event.preventDefault();
      addPoint(touch.clientX, touch.clientY);
    }, { passive: false, capture: true });

    document.addEventListener('touchend', () => {
      // Lifting early cancels the current five-circle requirement.
      gesture = null;
    }, { passive: true, capture: true });

    document.addEventListener('touchcancel', () => {
      gesture = null;
    }, { passive: true, capture: true });

    document.addEventListener('mousedown', event => {
      if (
        event.button !== 0 ||
        !canRoll() ||
        !inSnowZone(event.clientY)
      ) {
        mouseActive = false;
        return;
      }

      mouseActive = true;
      startGesture(event.clientX, event.clientY);
    }, true);

    document.addEventListener('mousemove', event => {
      if (!mouseActive || !gesture) return;
      addPoint(event.clientX, event.clientY);
    }, true);

    document.addEventListener('mouseup', () => {
      mouseActive = false;
      gesture = null;
    }, true);
  }

  /* ----------------------------------------------------------
     BOOT
     ---------------------------------------------------------- */
  function init() {
    initMessages();
    initMessageAdmin();
    initSpotDifference();
    initSnowGlobe();
    initSnowmanBuilder();
    syncSpecialNavigation();

    window.addEventListener('wedding-mode-change', syncSpecialNavigation);

    const observer = new MutationObserver(syncSpecialNavigation);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
