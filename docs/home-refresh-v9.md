# Shin's House homepage replacement v9

- Existing header navigation is replaced during build, not rewritten in the browser.
- Navigation is fixed to: 홈 / 커피 구매 / 굿즈 구매 / 매장 안내.
- Existing legacy hero/banner is removed as a complete HTML element during build.
- The user-provided cafe image is stored as a 3840×2160 WebP source and becomes the only top hero.
- Header and hero are full-bleed with no left/right frame borders.
- Share copies the current URL; search has a dialog fallback; CTA navigation uses section targets.
- Runtime code no longer hides or overlays the old hero/menu.
