(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let messages = [];
  let messagesLoaded = false;
  let messagesLoading = false;
  let lastMessageSubmit = 0;

  let messageAdminPin = '';
  let adminTitleTapCount = 0;
  let adminTitleTapTimer = null;
  let selectedMessageId = '';

  let specialGalleryImages = [];
  let specialGalleryLoaded = false;
  let lastSpecialGalleryIndex = -1;

  function isSpecial() {
    return document.body.classList.contains('special-mode');
  }

  function isMobileSpecial() {
    return isSpecial() &&
      window.matchMedia('(pointer: coarse)').matches &&
      (document.documentElement.clientWidth || window.innerWidth) <= 768;
  }

  function formatMessageDate(timestamp) {
    const date = new Date(Number(timestamp) || Date.now());
    return [
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('.');
  }

  /* ----------------------------------------------------------
     SPECIAL NAV
     ---------------------------------------------------------- */
  function syncSpecialNavigation() {
    const buttons = $$('.hero__quick-btn[data-scroll-target]');
    if (buttons.length < 3) return;

    if (isMobileSpecial()) {
      const setup = [
        ['메시지함', 'specialMessages'],
        ['갤러리', 'gallery'],
        ['눈사람', 'specialSnow']
      ];

      buttons.slice(0, 3).forEach((button, index) => {
        button.textContent = setup[index][0];
        button.dataset.scrollTarget = setup[index][1];
      });

      loadMessages();
      loadSpecialGallery();
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
     3D MESSAGE TREE
     ---------------------------------------------------------- */
  function ensureTreeFoliage() {
    const foliage = $('#messageTreeFoliage');
    if (!foliage || foliage.childElementCount) return;

    const bladeCount = 16;

    for (let i = 0; i < bladeCount; i += 1) {
      const blade = document.createElement('i');
      blade.className = 'message-tree__blade';
      blade.style.setProperty('--blade-angle', (360 / bladeCount * i) + 'deg');
      blade.style.setProperty('--shade', String(i % 4));
      foliage.appendChild(blade);
    }
  }

  function ornamentPosition(index) {
    const tier = index % 7;
    const round = Math.floor(index / 7);
    const angle = (index * 137.508 + round * 19) % 360;
    const y = -92 + tier * 30;
    const radius = 25 + tier * 11;
    const size = 18 + ((index * 7) % 10);

    return { angle, y, radius, size };
  }

  function renderMessageTree() {
    const holder = $('#messageTreeOrnaments');
    const empty = $('#messageTreeEmpty');
    if (!holder) return;

    ensureTreeFoliage();
    holder.replaceChildren();

    if (!messages.length) {
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    const colors = ['#D2BF91', '#B98588', '#F8F3EA', '#A6B09F'];

    messages.forEach((item, index) => {
      const position = ornamentPosition(index);
      const ornament = document.createElement('button');

      ornament.type = 'button';
      ornament.className = 'message-tree__ornament';
      ornament.dataset.messageId = item.id || '';
      ornament.setAttribute(
        'aria-label',
        (item.name || '익명') + '님의 메시지 보기'
      );

      ornament.style.setProperty('--ornament-angle', position.angle + 'deg');
      ornament.style.setProperty('--ornament-y', position.y + 'px');
      ornament.style.setProperty('--ornament-radius', position.radius + 'px');
      ornament.style.setProperty('--ornament-size', position.size + 'px');
      ornament.style.setProperty('--ornament-color', colors[index % colors.length]);

      const cap = document.createElement('i');
      cap.className = 'message-tree__ornament-cap';
      ornament.appendChild(cap);

      holder.appendChild(ornament);
    });
  }

  function initTreeRotation() {
    const scene = $('#messageTreeScene');
    const rotator = $('#messageTreeRotator');
    if (!scene || !rotator) return;

    let rotation = -18;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startRotation = rotation;
    let moved = false;
    let suppressClickUntil = 0;

    function applyRotation() {
      rotator.style.setProperty('--tree-rotation', rotation + 'deg');
    }

    applyRotation();

    scene.addEventListener('pointerdown', event => {
      if (!isMobileSpecial()) return;

      // Ornament taps must remain clicks. Rotate by dragging the tree itself.
      if (event.target.closest('.message-tree__ornament')) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startRotation = rotation;
      moved = false;

      try {
        scene.setPointerCapture(pointerId);
      } catch {}
    });

    scene.addEventListener('pointermove', event => {
      if (pointerId === null || event.pointerId !== pointerId) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (!moved) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        if (Math.abs(dy) > Math.abs(dx) * 1.1) return;
        moved = true;
        scene.classList.add('is-rotating');
      }

      rotation = startRotation + dx * .72;
      applyRotation();
    });

    function endPointer(event) {
      if (pointerId === null) return;
      if (event?.pointerId !== undefined && event.pointerId !== pointerId) return;

      if (moved) {
        suppressClickUntil = Date.now() + 260;
      }

      scene.classList.remove('is-rotating');

      try {
        if (scene.hasPointerCapture?.(pointerId)) {
          scene.releasePointerCapture(pointerId);
        }
      } catch {}

      pointerId = null;
      moved = false;
    }

    scene.addEventListener('pointerup', endPointer);
    scene.addEventListener('pointercancel', endPointer);

    scene.addEventListener('click', event => {
      const ornament = event.target.closest('.message-tree__ornament');
      if (!ornament || Date.now() < suppressClickUntil) return;

      openMessageDetail(ornament.dataset.messageId || '');
    });
  }

  /* ----------------------------------------------------------
     MESSAGE DETAIL
     ---------------------------------------------------------- */
  function openMessageDetail(id) {
    const item = messages.find(message => message.id === id);
    const modal = $('#messageDetailModal');

    if (!item || !modal) return;

    selectedMessageId = id;

    const text = $('#messageDetailText');
    const name = $('#messageDetailName');
    const date = $('#messageDetailDate');
    const deleteButton = $('#messageDetailDelete');

    if (text) text.textContent = item.message || '';
    if (name) name.textContent = item.name || '익명';
    if (date) date.textContent = formatMessageDate(item.createdAt);
    if (deleteButton) deleteButton.hidden = !messageAdminPin;

    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
  }

  function closeMessageDetail() {
    const modal = $('#messageDetailModal');
    if (!modal) return;

    modal.classList.remove('is-open');
    selectedMessageId = '';

    window.setTimeout(() => {
      modal.hidden = true;
    }, 180);
  }

  function initMessageDetail() {
    const modal = $('#messageDetailModal');
    const deleteButton = $('#messageDetailDelete');
    if (!modal) return;

    modal.addEventListener('click', event => {
      if (event.target.closest('[data-message-detail-close]')) {
        closeMessageDetail();
      }
    });

    deleteButton?.addEventListener('click', async () => {
      if (!selectedMessageId || !messageAdminPin) return;

      const item = messages.find(message => message.id === selectedMessageId);
      const preview = String(item?.message || '').slice(0, 26);

      if (!window.confirm('이 메시지를 삭제할까요?\n\n' + preview)) return;

      deleteButton.disabled = true;
      deleteButton.textContent = '삭제 중';

      try {
        const response = await fetch(
          '/api/messages/' + encodeURIComponent(selectedMessageId),
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
          closeMessageDetail();
          window.alert('관리자 인증이 풀렸습니다. 다시 인증해주세요.');
          return;
        }

        if (!response.ok) throw new Error('delete failed');

        messages = messages.filter(item => item.id !== selectedMessageId);
        renderMessageTree();
        closeMessageDetail();
      } catch (error) {
        console.warn('[Message delete]', error);
        window.alert('메시지를 삭제하지 못했습니다.');
      } finally {
        deleteButton.disabled = false;
        deleteButton.textContent = '메시지 삭제';
      }
    });
  }

  /* ----------------------------------------------------------
     MESSAGE API + FORM
     ---------------------------------------------------------- */
  async function loadMessages(force = false) {
    if ((!force && messagesLoaded) || messagesLoading || !isMobileSpecial()) return;

    messagesLoading = true;

    try {
      const response = await fetch('/api/messages', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) throw new Error('message list failed');

      const data = await response.json();
      messages = Array.isArray(data.messages) ? data.messages : [];
      messagesLoaded = true;
      renderMessageTree();
    } catch (error) {
      console.warn('[Special messages]', error);
      const empty = $('#messageTreeEmpty');
      if (empty) {
        empty.hidden = false;
        empty.textContent = '메시지를 불러오지 못했습니다.';
      }
    } finally {
      messagesLoading = false;
    }
  }

  function initMessages() {
    const form = $('#specialMessageForm');
    const nameInput = $('#specialMessageName');
    const messageInput = $('#specialMessageText');
    const counter = $('#specialMessageCounter');
    const submit = $('#specialMessageSubmit');

    if (!form || !messageInput || !submit) return;

    function updateCounter() {
      if (counter) counter.textContent = messageInput.value.length + '/80';
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

      if (Date.now() - lastMessageSubmit < 5000) return;

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

        if (!response.ok) throw new Error('message submit failed');

        const item = await response.json();
        messages.unshift(item);
        messagesLoaded = true;
        renderMessageTree();

        messageInput.value = '';
        updateCounter();
        lastMessageSubmit = Date.now();

        submit.textContent = '트리에 달렸어요';
      } catch (error) {
        console.warn('[Special message submit]', error);
        submit.textContent = '다시 시도';
      } finally {
        window.setTimeout(() => {
          submit.textContent = '메시지 남기기';
          submit.disabled = false;
        }, 1000);
      }
    });
  }

  /* ----------------------------------------------------------
     HIDDEN ADMIN — title x5
     ---------------------------------------------------------- */
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
    const detailDelete = $('#messageDetailDelete');

    messageAdminPin = enabled ? String(pin) : '';
    section?.classList.toggle('is-admin', enabled);

    if (detailDelete) {
      detailDelete.hidden = !enabled || !selectedMessageId;
    }
  }

  function openMessageAdminModal() {
    const modal = $('#messageAdminModal');
    const input = $('#messageAdminPinInput');
    const error = $('#messageAdminError');

    if (!modal || !input) return;

    if (error) error.textContent = '';
    input.value = '';
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));

    window.setTimeout(() => {
      try {
        input.focus({ preventScroll: true });
      } catch {
        input.focus();
      }
    }, 40);
  }

  function closeMessageAdminModal() {
    const modal = $('#messageAdminModal');
    if (!modal) return;

    modal.classList.remove('is-open');
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

    document.addEventListener('pointerdown', event => {
      if (!isMobileSpecial() || section.classList.contains('is-admin')) return;

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
    }, true);

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

      const pin = input.value.trim();

      if (!/^\d{6}$/.test(pin)) {
        if (error) error.textContent = '6자리 PIN을 입력해주세요.';
        return;
      }

      submit.disabled = true;
      submit.textContent = '확인 중...';

      try {
        const valid = await verifyMessageAdminPin(pin);

        if (!valid) {
          if (error) error.textContent = 'PIN이 올바르지 않습니다.';
          return;
        }

        setMessageAdminMode(true, pin);
        closeMessageAdminModal();
      } catch (verifyError) {
        console.warn('[Message admin]', verifyError);
        if (error) error.textContent = '인증에 실패했습니다.';
      } finally {
        submit.disabled = false;
        submit.textContent = '확인';
      }
    });
  }

  /* ----------------------------------------------------------
     SPECIAL GALLERY — button left / one photo right
     ---------------------------------------------------------- */
  async function loadSpecialGallery() {
    if (specialGalleryLoaded || !isMobileSpecial()) return;

    const button = $('#specialGalleryDrawBtn');
    const preview = $('#specialGalleryPreview');
    if (!button || !preview) return;

    try {
      const privateWedding =
        typeof PRIVATE_WEDDING !== 'undefined' ? PRIVATE_WEDDING : null;

      if (!privateWedding?.getSpecialGalleryManifest) {
        throw new Error('special gallery unavailable');
      }

      const manifest = await privateWedding.getSpecialGalleryManifest();
      const paths = Array.isArray(manifest.images) ? manifest.images : [];

      specialGalleryImages = paths.map(path => privateWedding.mediaUrl(path));
      specialGalleryLoaded = true;

      if (!specialGalleryImages.length) {
        button.disabled = true;
        preview.classList.add('is-empty');
        preview.textContent = '사진 준비 중';
        return;
      }

      lastSpecialGalleryIndex = 0;
      showSpecialGalleryImage(0, false);
    } catch (error) {
      console.warn('[Special gallery]', error);
      button.disabled = true;
      preview.classList.add('is-empty');
      preview.textContent = '사진을 불러오지 못했어요';
    }
  }

  function showSpecialGalleryImage(index, animate = true) {
    const preview = $('#specialGalleryPreview');
    if (!preview || !specialGalleryImages[index]) return;

    const src = specialGalleryImages[index];
    const image = new Image();
    image.decoding = 'async';

    image.onload = () => {
      if (animate) preview.classList.add('is-changing');

      window.setTimeout(() => {
        preview.textContent = '';
        preview.classList.remove('is-empty');
        preview.style.backgroundImage =
          'url("' + String(src).replace(/"/g, '%22') + '")';
        preview.classList.remove('is-changing');
      }, animate ? 140 : 0);
    };

    image.src = src;
  }

  function initSpecialGallery() {
    const button = $('#specialGalleryDrawBtn');
    if (!button) return;

    button.addEventListener('click', () => {
      if (!specialGalleryImages.length || button.disabled) return;

      let index = 0;

      if (specialGalleryImages.length > 1) {
        do {
          index = Math.floor(Math.random() * specialGalleryImages.length);
        } while (index === lastSpecialGalleryIndex);
      }

      lastSpecialGalleryIndex = index;
      showSpecialGalleryImage(index, true);

      button.classList.add('is-picked');
      window.setTimeout(() => button.classList.remove('is-picked'), 420);
    });
  }

  /* ----------------------------------------------------------
     SNOWMAN — two free-size circular swipes
     ---------------------------------------------------------- */
  function initSnowmanBuilder() {
    const builder = $('#snowmanBuilder');
    const preview = $('#snowballRollPreview');
    const playCanvas = $('#snowPlayCanvas');
    const stageLabel = $('#snowmanStageLabel');

    if (!builder || !preview || !playCanvas) return;

    let stage = 0;
    let gesture = null;
    let tapCount = 0;
    let tapTimer = null;

    function viewportHeight() {
      return window.visualViewport?.height ||
        window.innerHeight ||
        document.documentElement.clientHeight;
    }

    function bottomZone(y) {
      return y >= viewportHeight() - 165;
    }

    function normalizeAngle(value) {
      while (value > Math.PI) value -= Math.PI * 2;
      while (value < -Math.PI) value += Math.PI * 2;
      return value;
    }

    function canStart(y) {
      return isMobileSpecial() &&
        stage < 2 &&
        bottomZone(y) &&
        playCanvas.classList.contains('is-visible');
    }

    function startGesture(event) {
      gesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        lastVectorAngle: null,
        absoluteTurn: 0,
        path: 0,
        size: 30
      };

      preview.classList.add('is-visible');
      preview.style.setProperty('--roll-x', event.clientX + 'px');
      preview.style.setProperty('--roll-y', event.clientY + 'px');
      preview.style.setProperty('--roll-size', '30px');
    }

    function updateGesture(event) {
      if (!gesture || event.pointerId !== gesture.pointerId) return;

      const dx = event.clientX - gesture.lastX;
      const dy = event.clientY - gesture.lastY;
      const distance = Math.hypot(dx, dy);

      if (distance < 1.5) return;

      const vectorAngle = Math.atan2(dy, dx);

      if (gesture.lastVectorAngle !== null) {
        const delta = normalizeAngle(vectorAngle - gesture.lastVectorAngle);
        if (Math.abs(delta) <= 1.45) {
          gesture.absoluteTurn += Math.abs(delta);
        }
      }

      gesture.lastVectorAngle = vectorAngle;
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
      gesture.path += distance;

      gesture.size = Math.max(
        30,
        Math.min(
          112,
          30 + gesture.absoluteTurn * 7.2 + gesture.path * .045
        )
      );

      preview.style.setProperty('--roll-x', event.clientX + 'px');
      preview.style.setProperty('--roll-y', event.clientY + 'px');
      preview.style.setProperty('--roll-size', gesture.size + 'px');
    }

    function applySnowmanGeometry() {
      const bodySize = Number(builder.dataset.bodySize || 0);
      const headSize = Number(builder.dataset.headSize || 0);
      const headBottom = Math.max(26, bodySize * .66);

      builder.style.setProperty('--body-size', bodySize + 'px');
      builder.style.setProperty('--head-size', headSize + 'px');
      builder.style.setProperty('--head-bottom', headBottom + 'px');
    }

    function finalizeGesture(event) {
      if (!gesture || event.pointerId !== gesture.pointerId) return;

      const valid =
        gesture.path >= 65 &&
        gesture.absoluteTurn >= 1.05;

      preview.classList.remove('is-visible');

      if (valid) {
        const size = Math.round(gesture.size);

        if (stage === 0) {
          stage = 1;
          builder.dataset.stage = '1';
          builder.dataset.bodySize = String(size);
          builder.dataset.headSize = '0';
          applySnowmanGeometry();

          if (stageLabel) {
            stageLabel.textContent = '몸통 완성 · 이제 머리를 굴려주세요';
          }
        } else if (stage === 1) {
          stage = 2;
          builder.dataset.stage = '2';
          builder.dataset.headSize = String(size);
          applySnowmanGeometry();

          builder.classList.add('is-head-lifting');
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              builder.classList.remove('is-head-lifting');
            });
          });

          if (stageLabel) {
            stageLabel.textContent = '눈사람 완성! 세 번 탭하면 사라져요';
          }
        }
      }

      gesture = null;
    }

    document.addEventListener('pointerdown', event => {
      if (!canStart(event.clientY)) return;
      if (event.target.closest('#snowmanBuilder')) return;

      startGesture(event);

      try {
        document.documentElement.setPointerCapture?.(event.pointerId);
      } catch {}
    }, true);

    document.addEventListener('pointermove', event => {
      if (!gesture) return;
      updateGesture(event);
    }, true);

    document.addEventListener('pointerup', finalizeGesture, true);
    document.addEventListener('pointercancel', event => {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      preview.classList.remove('is-visible');
      gesture = null;
    }, true);

    builder.addEventListener('pointerdown', event => {
      if (stage === 0) return;
      event.stopPropagation();

      tapCount += 1;
      clearTimeout(tapTimer);
      tapTimer = window.setTimeout(() => {
        tapCount = 0;
      }, 1400);

      if (tapCount < 3) return;

      tapCount = 0;
      clearTimeout(tapTimer);
      builder.classList.add('is-removing');

      window.setTimeout(() => {
        stage = 0;
        builder.dataset.stage = '0';
        builder.dataset.bodySize = '0';
        builder.dataset.headSize = '0';
        builder.classList.remove('is-removing', 'is-head-lifting');
        applySnowmanGeometry();

        if (stageLabel) {
          stageLabel.textContent = '첫 번째 회전 스와이프로 몸통을 만들어보세요';
        }
      }, 280);
    });
  }

  /* ----------------------------------------------------------
     BOOT
     ---------------------------------------------------------- */
  function init() {
    initMessages();
    initMessageAdmin();
    initMessageDetail();
    initTreeRotation();
    initSpecialGallery();
    initSnowmanBuilder();

    ensureTreeFoliage();
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
