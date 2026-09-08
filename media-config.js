/**
 * SAME-ORIGIN ROUTES
 * R2/Worker origin is intentionally not exposed to the browser.
 */
const MEDIA_CONFIG = Object.freeze({
  workerBase: "",

  api: {
    invitation: "/api/invitation",
    contacts: "/api/contacts",
    accounts: "/api/accounts",
    gallery: "/api/gallery"
  },

  media: {
    hero: "hero/2.webp",
    ending: "ending/1.webp",
    meal: "gallery/meal.webp"
  },

  og: {
    primary: "og/6.jpg"
  }
});
