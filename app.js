(() => {
  'use strict';

  /*
   * Production safety guard
   * -----------------------
   * The previous v4.3 preview file intercepted every /api/* request in the
   * browser and returned demo success responses for orders, subscriptions,
   * inventory and administrator login. That behavior is unsafe for a live
   * commerce site because nothing is persisted or authenticated server-side.
   *
   * Production now uses the Netlify Function API configured in netlify.toml.
   * Run local development with `netlify dev` so the same server API is used.
   */

  window.__SHINS_HOUSE_RUNTIME__ = Object.freeze({
    mode: 'production-api',
    apiBase: '/api',
    version: '4.4.0-foundation'
  });
})();
