/* Track the visible page once; embedded app and demo frames do not count twice. */
(function () {
  'use strict';
  if (window.top !== window.self) return;
  if (/^\/Billiards_layout_mobile\/$/.test(location.pathname) &&
      matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', 'G-KB1H64LMM6', {
    page_location: location.origin + location.pathname,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
}());
