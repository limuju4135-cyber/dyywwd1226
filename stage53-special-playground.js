(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const TREE_SLOT_LIMIT = 15;
  const TREE_VISIBLE_LIMIT = 14;
  const ORNAMENT_ASSETS = [
    'assets/special/ornament-1.svg?v=stage57',
    'assets/special/ornament-2.svg?v=stage57',
    'assets/special/ornament-3.svg?v=stage57',
    'assets/special/ornament-4.svg?v=stage57'
  ];

  // Percent positions over the 2D tree image. One slot is always reserved.
  const TREE_SLOTS = [
    { x: 50, y: 23, s: 10 },
    { x: 36, y: 31, s: 9 },
    { x: 64, y: 31, s: 9 },
    { x: 27, y: 41, s: 10 },
    { x: 45, y: 40, s: 9 },
    { x: 70, y: 42, s: 10 },
    { x: 20, y: 52, s: 9 },
    { x: 37, y: 51, s: 10 },
    { x: 57, y: 53, s: 9 },
    { x: 78, y: 54, s: 10 },
    { x: 25, y: 65, s: 10 },
    { x: 43, y: 64, s: 9 },
    { x: 62, y: 66, s: 10 },
    { x: 76, y: 69, s: 9 },
    { x: 50, y: 76, s: 10 }
  ];

  let messages = [];
  let messagesLoaded = false;
  let messagesLoading = false;
  let lastMessageSubmit = 0;

  let messageAdminPin = '';
  let adminTitleTapCount = 0;
  let adminTitleTapTimer = null;
  let selectedMessageId = '';

  let treeState = {
    assignments: new Map(),
    reservedSlot: 0
  };

  let specialGalleryImages = [];
  let specialGalleryLoaded = false;
  let lastSpecialGalleryIndex = -1;

  function isSpecial() {
    return document.body.classList.contains('special-mode');
  }

  function isMobileSpecial() {
    const coarse =
      window.matchMedia?.('(pointer: coarse)').matches ||
      ('ontouchstart' in window && navigator.maxTouchPoints > 0);

    return (
      isSpecial() &&
      coarse &&
      (document.documentElement.clientWidth || window.innerWidth) <= 768
    );
  }

  function formatMessageDate(timestamp) {
    const date = new Date(Number(timestamp) || Date.now());

    return [
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('.');
  }

  function shuffle(list) {
    const copy = [...list];

    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
  }

  function randomFrom(list) {
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  function stableNumber(value) {
    let hash = 2166136261;
    const string = String(value || '');

    for (let i = 0; i < string.length; i += 1) {
      hash ^= string.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return Math.abs(hash >>> 0);
  }

  /* ----------------------------------------------------------
     SPECIAL NAV
     ---------------------------------------------------------- */
  function syncSpecialNavigation() {
    const buttons = $$('.hero__quick-btn[data-scroll-target]');
    if (buttons.length < 3) return;

    if (isMobileSpecial()) {
      buttons[0].textContent = '메시지함';
      buttons[0].dataset.scrollTarget = 'specialMessages';
      buttons[0].hidden = false;

      buttons[1].textContent = '비하인드';
      buttons[1].dataset.scrollTarget = 'gallery';
      buttons[1].hidden = false;

      buttons[2].hidden = true;

      loadMessages();
      loadSpecialGallery();
      return;
    }

    const setup = [
      ['연락처', 'contact'],
      ['갤러리', 'gallery'],
      ['오시는 길', 'location']
    ];

    buttons.slice(0, 3).forEach((button, index) => {
      button.hidden = false;
      button.textContent = setup[index][0];
      button.dataset.scrollTarget = setup[index][1];
    });
  }

  /* ----------------------------------------------------------
     2D MESSAGE TREE
     ---------------------------------------------------------- */
  function chooseReservedSlot(assignments, preferredExclude = -1) {
    const unused = [];

    for (let slot = 0; slot < TREE_SLOT_LIMIT; slot += 1) {
      if (!assignments.has(slot) && slot !== preferredExclude) {
        unused.push(slot);
      }
    }

    if (unused.length) return randomFrom(unused);

    const removable = [...assignments.keys()].filter(
      slot => slot !== preferredExclude
    );

    return randomFrom(removable) ?? 0;
  }

  function buildInitialTreeState() {
    const visible = shuffle(messages).slice(0, TREE_VISIBLE_LIMIT);
    const allSlots = shuffle(
      Array.from({ length: TREE_SLOT_LIMIT }, (_, index) => index)
    );

    const reservedSlot = allSlots.pop() ?? 0;
    const assignments = new Map();

    visible.forEach((item, index) => {
      const slot = allSlots[index];
      if (slot !== undefined) assignments.set(slot, item.id);
    });

    treeState = { assignments, reservedSlot };
  }

  function ornamentAssetFor(item, slot) {
    const index =
      (stableNumber(item?.id) + slot) % ORNAMENT_ASSETS.length;

    return ORNAMENT_ASSETS[index];
  }

  function messageById(id) {
    return messages.find(item => item.id === id) || null;
  }

  function createSparkles() {
    const sparkles = document.createElement('span');
    sparkles.className = 'message-tree__sparkles';
    sparkles.setAttribute('aria-hidden', 'true');

    for (let i = 0; i < 6; i += 1) {
      const spark = document.createElement('i');
      spark.style.setProperty('--spark-angle', String(i * 60) + 'deg');
      spark.style.setProperty('--spark-delay', String(i * 38) + 'ms');
      sparkles.appendChild(spark);
    }

    return sparkles;
  }

  function renderTreeState(highlightMessageId = '') {
    const holder = $('#messageTreeOrnaments');
    const empty = $('#messageTreeEmpty');

    if (!holder) return;

    holder.replaceChildren();

    for (const [slotIndex, messageId] of treeState.assignments.entries()) {
      const item = messageById(messageId);
      const slot = TREE_SLOTS[slotIndex];

      if (!item || !slot) continue;

      const button = document.createElement('button');
      const image = document.createElement('img');

      button.type = 'button';
      button.className = 'message-tree__ornament';
      button.dataset.messageId = item.id;
      button.dataset.slot = String(slotIndex);
      button.style.setProperty('--slot-x', slot.x + '%');
      button.style.setProperty('--slot-y', slot.y + '%');
      button.style.setProperty('--slot-size', slot.s + '%');
      button.setAttribute(
        'aria-label',
        (item.name || '익명') + '님의 메시지 보기'
      );

      image.src = ornamentAssetFor(item, slotIndex);
      image.alt = '';
      image.draggable = false;
      button.appendChild(image);

      if (item.id === highlightMessageId) {
        button.classList.add('is-new');
        button.appendChild(createSparkles());
      }

      holder.appendChild(button);
    }

    const reservedSlot = TREE_SLOTS[treeState.reservedSlot];

    if (reservedSlot) {
      const reserved = document.createElement('span');
      const ghost = document.createElement('img');

      reserved.className = 'message-tree__reserved';
      reserved.style.setProperty('--slot-x', reservedSlot.x + '%');
      reserved.style.setProperty('--slot-y', reservedSlot.y + '%');
      reserved.style.setProperty('--slot-size', reservedSlot.s + '%');
      reserved.setAttribute('aria-hidden', 'true');

      ghost.src =
        ORNAMENT_ASSETS[
          (treeState.reservedSlot + treeState.assignments.size) %
          ORNAMENT_ASSETS.length
        ];
      ghost.alt = '';
      reserved.appendChild(ghost);
      holder.appendChild(reserved);
    }

    if (empty) {
      empty.hidden = messages.length !== 0;
    }
  }

  function showTreeFeedback() {
    const feedback = $('#messageTreeFeedback');
    if (!feedback) return;

    feedback.hidden = false;
    feedback.classList.remove('is-show');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        feedback.classList.add('is-show');
      });
    });

    window.clearTimeout(showTreeFeedback.timer);
    showTreeFeedback.timer = window.setTimeout(() => {
      feedback.classList.remove('is-show');

      window.setTimeout(() => {
        feedback.hidden = true;
      }, 260);
    }, 3100);
  }

  function moveTreeIntoView() {
    const stage = $('#messageTreeStage');
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const viewportHeight =
      window.visualViewport?.height || window.innerHeight;

    const sufficientlyVisible =
      rect.top >= 50 && rect.bottom <= viewportHeight - 24;

    if (!sufficientlyVisible) {
      window.setTimeout(() => {
        stage.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 90);
    }
  }

  function attachNewMessage(item) {
    if (!item?.id) return;

    const targetSlot = treeState.reservedSlot;

    // The new message always occupies the currently reserved position.
    treeState.assignments.set(targetSlot, item.id);

    // Immediately establish the next reserved position so one subtle empty
    // ornament is always visible, even when 14 messages are already displayed.
    if (treeState.assignments.size > TREE_VISIBLE_LIMIT) {
      const candidates = [...treeState.assignments.keys()].filter(
        slot => slot !== targetSlot
      );

      const victim = randomFrom(candidates);

      if (victim !== null) {
        treeState.assignments.delete(victim);
        treeState.reservedSlot = victim;
      }
    } else {
      treeState.reservedSlot = chooseReservedSlot(
        treeState.assignments,
        targetSlot
      );
    }

    renderTreeState(item.id);
    showTreeFeedback();
    moveTreeIntoView();
  }

  function initMessageTreeInteraction() {
    const holder = $('#messageTreeOrnaments');
    if (!holder) return;

    holder.addEventListener('click', event => {
      const ornament = event.target.closest('.message-tree__ornament');
      if (!ornament) return;

      openMessageDetail(ornament.dataset.messageId || '');
    });
  }

  /* ----------------------------------------------------------
     MESSAGE DETAIL
     ---------------------------------------------------------- */
  function openMessageDetail(id) {
    const item = messageById(id);
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

    requestAnimationFrame(() => {
      modal.classList.add('is-open');
    });
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

      const item = messageById(selectedMessageId);
      const preview = String(item?.message || '').slice(0, 26);

      if (!window.confirm('이 메시지를 삭제할까요?\n\n' + preview)) {
        return;
      }

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

        if (!response.ok) {
          throw new Error('delete failed');
        }

        messages = messages.filter(item => item.id !== selectedMessageId);
        buildInitialTreeState();
        renderTreeState();
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
    if ((!force && messagesLoaded) || messagesLoading || !isMobileSpecial()) {
      return;
    }

    messagesLoading = true;

    try {
      const response = await fetch('/api/messages', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('message list failed');
      }

      const data = await response.json();
      messages = Array.isArray(data.messages) ? data.messages : [];
      messagesLoaded = true;

      buildInitialTreeState();
      renderTreeState();
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
      if (counter) {
        counter.textContent = messageInput.value.length + '/80';
      }
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

      if (Date.now() - lastMessageSubmit < 5000) {
        return;
      }

      submit.disabled = true;
      submit.textContent = '트리에 다는 중...';

      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ name, message })
        });

        if (!response.ok) {
          throw new Error('message submit failed');
        }

        const item = await response.json();

        messages.unshift(item);
        messagesLoaded = true;
        attachNewMessage(item);

        messageInput.value = '';
        updateCounter();
        lastMessageSubmit = Date.now();

        submit.textContent = '오너먼트가 달렸어요';
      } catch (error) {
        console.warn('[Special message submit]', error);
        submit.textContent = '다시 시도';
      } finally {
        window.setTimeout(() => {
          submit.textContent = '메시지 남기기';
          submit.disabled = false;
        }, 1300);
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

    requestAnimationFrame(() => {
      modal.classList.add('is-open');
    });

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

    if (!section || !title || !modal || !form || !input || !submit) {
      return;
    }

    document.addEventListener('pointerdown', event => {
      if (!isMobileSpecial() || section.classList.contains('is-admin')) {
        return;
      }

      const target =
        event.target instanceof Element
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

      if (error) {
        error.textContent = '';
      }
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const pin = input.value.trim();

      if (!/^\d{6}$/.test(pin)) {
        if (error) {
          error.textContent = '6자리 PIN을 입력해주세요.';
        }
        return;
      }

      submit.disabled = true;
      submit.textContent = '확인 중...';

      try {
        const valid = await verifyMessageAdminPin(pin);

        if (!valid) {
          if (error) {
            error.textContent = 'PIN이 올바르지 않습니다.';
          }
          return;
        }

        setMessageAdminMode(true, pin);
        closeMessageAdminModal();
      } catch (verifyError) {
        console.warn('[Message admin]', verifyError);

        if (error) {
          error.textContent = '인증에 실패했습니다.';
        }
      } finally {
        submit.disabled = false;
        submit.textContent = '확인';
      }
    });
  }

  /* ----------------------------------------------------------
     SPECIAL GALLERY — compact portrait/landscape polaroid
     ---------------------------------------------------------- */
  async function loadSpecialGallery() {
    if (specialGalleryLoaded || !isMobileSpecial()) return;

    const button = $('#specialGalleryDrawBtn');
    const preview = $('#specialGalleryPreview');

    if (!button || !preview) return;

    try {
      const privateWedding =
        typeof PRIVATE_WEDDING !== 'undefined'
          ? PRIVATE_WEDDING
          : null;

      if (!privateWedding?.getSpecialGalleryManifest) {
        throw new Error('special gallery unavailable');
      }

      const manifest = await privateWedding.getSpecialGalleryManifest();
      const paths = Array.isArray(manifest.images) ? manifest.images : [];

      specialGalleryImages = paths.map(
        path => privateWedding.mediaUrl(path)
      );

      specialGalleryLoaded = true;

      if (!specialGalleryImages.length) {
        button.disabled = true;
        preview.classList.add('is-empty');
        preview.textContent = '사진 준비 중';
      }
    } catch (error) {
      console.warn('[Special gallery]', error);
      button.disabled = true;
      preview.classList.add('is-empty');
      preview.textContent = '사진을 불러오지 못했어요';
    }
  }

  function showSpecialGalleryImage(index) {
    const preview = $('#specialGalleryPreview');
    const polaroid = $('.special-gallery__polaroid');
    const src = specialGalleryImages[index];

    if (!preview || !polaroid || !src) return;

    const image = new Image();
    image.decoding = 'async';

    image.onload = () => {
      const landscape = image.naturalWidth > image.naturalHeight;

      // Preload first. Fade only when the next image is actually ready.
      polaroid.classList.add('is-changing');

      window.setTimeout(() => {
        polaroid.classList.toggle('is-landscape', landscape);
        polaroid.classList.toggle('is-portrait', !landscape);

        preview.textContent = '';
        preview.classList.remove('is-empty');
        preview.style.backgroundImage =
          'url("' + String(src).replace(/"/g, '%22') + '")';

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            polaroid.classList.remove('is-changing');
          });
        });
      }, 190);
    };

    image.onerror = () => {
      polaroid.classList.remove('is-changing');
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
      showSpecialGalleryImage(index);

      button.classList.add('is-picked');

      window.setTimeout(() => {
        button.classList.remove('is-picked');
      }, 420);
    });
  }

  /* ----------------------------------------------------------
     BOOT
     ---------------------------------------------------------- */
  function init() {
    initMessages();
    initMessageAdmin();
    initMessageDetail();
    initMessageTreeInteraction();
    initSpecialGallery();
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
