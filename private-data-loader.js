/**
 * Stage 15 — Private R2 Data Loader
 * 인증키/세션 없음.
 */
(function () {
  'use strict';

  let accountsPromise = null;
  let galleryPromise = null;
  let specialGalleryPromise = null;

  function workerUrl(path) {
    const base = MEDIA_CONFIG.workerBase.replace(/\/+$/, '');
    return `${base}${path.startsWith('/') ? path : '/' + path}`;
  }

  // Bound initial JSON reads so a stalled mobile connection cannot hang startup.
  // Retry once for transient network and 5xx/429 responses.
  async function fetchJson(path) {
    const url = workerUrl(path);
    let lastError;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 7000);

      try {
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-store',
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        const status = Number(String(error?.message || '').match(/^HTTP_(\d+)/)?.[1]);
        const retryable =
          error?.name === 'AbortError' ||
          error instanceof TypeError ||
          status === 408 ||
          status === 429 ||
          status >= 500;

        if (!retryable || attempt === 1) break;

        await new Promise(resolve => window.setTimeout(resolve, 350));
      } finally {
        window.clearTimeout(timeout);
      }
    }

    throw lastError;
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

  function getSpecialGalleryManifest() {
    if (!specialGalleryPromise) {
      specialGalleryPromise = fetchJson(MEDIA_CONFIG.api.specialGallery);
    }
    return specialGalleryPromise;
  }

  window.PRIVATE_WEDDING = Object.freeze({
    init,
    mediaUrl,
    getAccounts,
    getGalleryManifest,
    getSpecialGalleryManifest
  });
})();
