/**
 * Secure Wedding Data Loader
 *
 * 공유 링크 예:
 * https://limuju4135-cyber.github.io/dyywwd1226/#k=YOUR_INVITE_KEY
 *
 * 흐름:
 * 1) URL fragment의 k 값을 Worker에 1회 전달
 * 2) Worker가 12시간 임시 session token 발급
 * 3) master invite key는 주소창에서 제거
 * 4) 이후 JSON/사진은 session token으로 접근
 */
(function () {
  'use strict';

  const TOKEN_KEY = 'weddingSessionToken';

  let token = sessionStorage.getItem(TOKEN_KEY) || '';
  let initialized = false;
  let accountsPromise = null;
  let galleryPromise = null;

  function workerUrl(path) {
    const base = MEDIA_CONFIG.workerBase.replace(/\/+$/, '');
    return `${base}${path.startsWith('/') ? path : '/' + path}`;
  }

  function readInviteKeyFromHash() {
    const raw = location.hash.replace(/^#/, '');
    if (!raw) return '';
    const params = new URLSearchParams(raw);
    return params.get('k') || '';
  }

  function clearInviteKeyFromAddressBar() {
    if (!location.hash) return;
    history.replaceState(
      history.state,
      document.title,
      `${location.pathname}${location.search}`
    );
  }

  function showAccessGate(message) {
    const gate = document.getElementById('accessGate');
    const text = document.getElementById('accessGateMessage');
    if (text) text.textContent = message;
    if (gate) gate.hidden = false;
    document.body.classList.add('access-denied');
  }

  async function createSession(inviteKey) {
    const response = await fetch(workerUrl(MEDIA_CONFIG.api.session), {
      method: 'POST',
      headers: {
        'X-Invite-Key': inviteKey,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('INVITE_KEY_REJECTED');
    }

    const data = await response.json();

    if (!data.token) {
      throw new Error('SESSION_NOT_ISSUED');
    }

    token = data.token;
    sessionStorage.setItem(TOKEN_KEY, token);
    clearInviteKeyFromAddressBar();

    return token;
  }

  async function secureFetch(path, options = {}) {
    if (!token) throw new Error('NO_SESSION');

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(workerUrl(path), {
      ...options,
      headers,
      cache: 'no-store'
    });

    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem(TOKEN_KEY);
      token = '';
      throw new Error('SESSION_EXPIRED');
    }

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    return response;
  }

  async function getJson(path) {
    const response = await secureFetch(path);
    return response.json();
  }

  async function ensureSession() {
    if (token) return token;

    const inviteKey = readInviteKeyFromHash();
    if (!inviteKey) {
      throw new Error('NO_INVITE_KEY');
    }

    return createSession(inviteKey);
  }

  async function loadInitialPrivateData() {
    const [invitation, contacts] = await Promise.all([
      getJson(MEDIA_CONFIG.api.invitation),
      getJson(MEDIA_CONFIG.api.contacts)
    ]);

    CONFIG.groom = {
      ...(invitation.groom || {}),
      ...(contacts.groom || {})
    };

    CONFIG.bride = {
      ...(invitation.bride || {}),
      ...(contacts.bride || {})
    };
  }

  async function init() {
    if (initialized) return;

    try {
      await ensureSession();

      try {
        await loadInitialPrivateData();
      } catch (error) {
        // 첫 로드에서 저장된 session token이 만료된 경우,
        // fragment key가 아직 있으면 한 번 재인증한다.
        const inviteKey = readInviteKeyFromHash();
        if (inviteKey) {
          sessionStorage.removeItem(TOKEN_KEY);
          token = '';
          await createSession(inviteKey);
          await loadInitialPrivateData();
        } else {
          throw error;
        }
      }

      initialized = true;
    } catch (error) {
      console.warn('[Wedding Secure Loader]', error);

      const messages = {
        NO_INVITE_KEY: '초대장 접근 정보가 없습니다. 전달받은 초대장 링크로 다시 열어주세요.',
        INVITE_KEY_REJECTED: '유효하지 않은 초대장 링크입니다.',
        SESSION_EXPIRED: '접속 시간이 만료되었습니다. 전달받은 초대장 링크로 다시 열어주세요.'
      };

      showAccessGate(
        messages[error.message] ||
        '초대장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
      );

      throw error;
    }
  }

  function mediaUrl(path) {
    if (!token || !path) return '';
    const safePath = String(path).replace(/^\/+/, '');
    return `${workerUrl('/media/' + safePath)}?t=${encodeURIComponent(token)}`;
  }

  function getAccounts() {
    if (!accountsPromise) {
      accountsPromise = getJson(MEDIA_CONFIG.api.accounts);
    }
    return accountsPromise;
  }

  function getGalleryManifest() {
    if (!galleryPromise) {
      galleryPromise = getJson(MEDIA_CONFIG.api.gallery);
    }
    return galleryPromise;
  }

  window.SECURE_WEDDING = Object.freeze({
    init,
    mediaUrl,
    getAccounts,
    getGalleryManifest
  });
})();
