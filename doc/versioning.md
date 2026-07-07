# Versioning

This project uses a manual versioning approach across its pages.

## Main Application Version

The active page version is controlled by a JavaScript constant such as:

```js
const APP_VERSION = '2026.06.02.1';
```

Rules:

- `APP_VERSION` is the active version for the page.
- When the page loads, `enforceCurrentPageVersion()` checks the current URL for the `v` query parameter.
- If the URL version does not match `APP_VERSION`, the page rewrites the URL with the latest `v` value and reloads.
- This helps bypass stale cached page URLs after a deployment.

## Where It Runs

On page load:

- `CHECK_MOBILE_ON_LOAD()` runs first.
- `CHECK_MOBILE_ON_LOAD()` calls `enforceCurrentPageVersion()`.
- If a version mismatch is found, the page redirects before the rest of the initialization continues.

## Link Propagation

When a page builds internal links, it can also include:

```js
params.set('v', APP_VERSION);
```

This keeps downstream links aligned with the current page version.

## Meta Tag

A page can also contain:

```html
<meta name="app-version" content="2026.06.02.1">
```

At the moment, this meta tag appears informational only. The active version logic uses the JavaScript `APP_VERSION` constant.

## CSS Version

The stylesheet uses a separate manual cache-busting value:

```html
<link rel="stylesheet" href="./viewmore.css?v=1.3">
```

This is independent from `APP_VERSION`.

## Update Process

When releasing a new version:

1. Update `APP_VERSION` in the relevant page.
2. Update the `app-version` meta tag if you want it to stay in sync for documentation or inspection.
3. Update `viewmore.css?v=...` if the stylesheet changed and you need to force a fresh CSS fetch.

## Recommendation

To avoid drift, keep these values aligned during release work:

- `APP_VERSION`
- `<meta name="app-version" ...>`
- CSS `?v=` value when stylesheet changes
