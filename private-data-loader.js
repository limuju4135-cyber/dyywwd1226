/**
 * Stage 15 — Private R2 Data Loader
 * 인증키/세션 없음.
 */
(function () {
  'use strict';

  let accountsPromise = null;
  let galleryPromise = null;

  function workerUrl(path) {
    const base = MEDIA_CONFIG.workerBase.replace(/\/+$/, '');
    return `${base}${path.startsWith('/') ? path : '/' + path}`;
  }

  async function fetchJson(path) {
    const response = await fetch(workerUrl(path), {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    return response.json();
  }

  async function init() {
    const [invitation, contacts] = await Promise.all([
      fetchJson(MEDIA_CONFIG.api.invitation),
      fetchJson(MEDIA_CONFIG.api.contacts)
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

  function mediaUrl(path) {
    if (!path) return '';
    const safePath = String(path).replace(/^\/+/, '');
    return workerUrl(`/media/${safePath}`);
  }

  function getAccounts() {
    if (!accountsPromise) {
      accountsPromise = fetchJson(MEDIA_CONFIG.api.accounts);
    }
    return accountsPromise;
  }

  function getGalleryManifest() {
    if (!galleryPromise) {
      galleryPromise = fetchJson(MEDIA_CONFIG.api.gallery);
    }
    return galleryPromise;
  }

  window.PRIVATE_WEDDING = Object.freeze({
    init,
    mediaUrl,
    getAccounts,
    getGalleryManifest
  });
})();
