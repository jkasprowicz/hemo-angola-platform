# Branding, PWA and Mobile Fix Report

## Scope

This sprint updated the frontend presentation layer only. Backend, API, authentication flow, IndexedDB, synchronization, routes, and operational behavior were preserved.

## Root Cause of Mobile Scale Issue

The mobile zoom complaint was not caused by a broken `viewport` meta tag. The actual structural cause identified in the dashboard was a responsive chart rendered with `minWidth: 640`, which could expand the layout width beyond narrow smartphone viewports and create the impression that the page opened "zoomed".

Additional contributors to inconsistent mobile behavior were:

- legacy prototype naming in HTML and PWA metadata;
- absence of explicit global root sizing rules for `html`, `body`, and `#root`;
- lack of mobile-safe input font sizing, which can trigger iOS Safari auto-zoom on focus.

## Changes Applied

### Identity

- introduced `HEMO-DATA` as the product/interface name;
- kept `HEMO-ANGOLA` as the institutional project label where appropriate;
- created reusable brand component `HemoDataBrand`;
- refreshed login presentation with professional product hierarchy.

### PWA and Browser Metadata

- updated browser title to `HEMO-DATA | Indicadores Hemoterápicos`;
- added `application-name`, `apple-mobile-web-app-title`, `description`, and `theme-color`;
- added `favicon.svg`, `favicon-32x32.png`, and `apple-touch-icon.png`;
- updated PWA manifest name, short name, colors, and icon set;
- added standard and maskable PWA icons.

### Mobile and Responsiveness

- added global root sizing rules for `html`, `body`, and `#root`;
- ensured mobile input font size reaches `16px` to avoid Safari input auto-zoom;
- removed the dashboard chart's desktop-only `minWidth` constraint on mobile;
- preserved existing desktop layout behavior.

## Assets Created

- `frontend/public/favicon.svg`
- `frontend/public/favicon-32x32.png`
- `frontend/public/apple-touch-icon.png`
- `frontend/public/pwa-192x192.png`
- `frontend/public/pwa-512x512.png`
- `frontend/public/pwa-maskable-192x192.png`
- `frontend/public/pwa-maskable-512x512.png`

## Testing

Validation target list from the sprint:

- unit tests
- lint
- typecheck
- build
- Playwright responsive checks on login, home, collection, and dashboard

## PWA Cache Note

Because manifest and icon assets are aggressively cached by browsers and operating systems, users who previously installed an older build may continue seeing the prior icon or app name until the installed app refreshes or is reinstalled.

## Limitations

- Installed PWA icon refresh timing still depends on browser and OS cache behavior.
- Manual review of generated screenshots remains recommended after automated validation.
