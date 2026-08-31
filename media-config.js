/**
 * Public media routing configuration.
 *
 * 중요:
 * - 이 파일에는 비밀키가 없습니다.
 * - 실제 웨딩사진은 GitHub에 저장하지 않습니다.
 * - 브라우저는 Cloudflare Worker를 통해 Private R2 이미지를 읽습니다.
 */
const MEDIA_CONFIG = Object.freeze({
  baseUrl: "https://dyywwd-media.limuju4135.workers.dev/media",

  hero: {
    primary: "hero/1.webp"
  },

  og: {
    primary: "og/1.webp"
  }

  // 이후 단계에서 아래 항목을 확장할 예정입니다.
  // story: [...],
  // gallery: [...],
  // location: "..."
});
