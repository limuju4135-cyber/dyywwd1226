/**
 * PUBLIC MEDIA / API ROUTES
 * 비밀키는 여기에 두지 않습니다.
 */
const MEDIA_CONFIG = Object.freeze({
  workerBase: "https://dyywwd-media.limuju4135.workers.dev",

  api: {
    session: "/api/session",
    invitation: "/api/invitation",
    contacts: "/api/contacts",
    accounts: "/api/accounts",
    gallery: "/api/gallery"
  },

  media: {
    hero: "hero/1.webp"
  },

  // OG는 링크 미리보기 봇이 접근해야 하므로 공개 경로 유지
  publicOg: "og/2.jpg"
});
