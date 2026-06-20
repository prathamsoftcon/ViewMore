# API Integration Reference

This project supports only two backend API patterns:

1. Public API calls through the `public-api` proxy path.
2. Authenticated API calls with a bearer token through the `api` path.

Use this document whenever you add a new API call or build a new page.

## Core Rules

- Never hardcode secrets in browser code.
- Public API calls must go through the configured public proxy path.
- Bearer-token API calls must use the stored `authToken`.
- Do not mix the two patterns in the same request.
- Keep page configuration in `html_config.json` and load it at runtime.

## Shared Configuration

Each page loads `./html_config.json` and configures `ContentLoginApi`:

```js
ContentLoginApi.configure({
  apiPath: appConfig.api.apiPath,
  publicApiPath: appConfig.api.publicApiPath || "/public-api",
  publicApiKey: appConfig.api.publicApiKey || ""
});
```

Recommended config fields:

- `api.baseUrl`
- `api.apiPath`
- `api.publicApiPath`
- `api.publicApiKey` if the deployment provides one

## Public API Calls

Use this pattern for endpoints that are intended to be reachable without a bearer token.

### Request shape

```js
axios.get(
  publicApiPath + "/Some_Public_Endpoint",
  { headers: ContentLoginApi.getPublicHeaders() }
);
```

### Rules

- Use the configured `publicApiPath`, not a hardcoded upstream URL.
- Keep the request anonymous unless the deployment explicitly provides a public API key.
- If the deployment requires a server-side API key, it should be added by the proxy or runtime config, not by app logic that exposes secrets.

### Typical use cases

- OTP-related calls
- Public configuration lookups
- Certificate verification endpoints that are intentionally public

## Bearer Token API Calls

Use this pattern for authenticated LitteraCore calls.

### Request shape

```js
axios.get(
  APIPath + "/Some_Protected_Endpoint",
  { headers: ContentLoginApi.getAuthHeaders() }
);
```

### Rules

- Use `ContentLoginApi.getAuthHeaders()` or `getAuthAxiosConfig()`.
- Do not attach `APIKey` headers to bearer-token requests.
- Do not send bearer tokens to public proxy endpoints unless the backend explicitly requires it.

### Typical use cases

- Participant training details
- Content details
- Audit logging
- Session updates
- Any endpoint that requires the stored `authToken`

## Adding A New API Call

When you add a new endpoint, decide which category it belongs to first.

### If it is public

1. Add the endpoint path under `api` in `html_config.json` if you want it configurable.
2. Call it through `publicApiPath`.
3. Use `ContentLoginApi.getPublicHeaders()`.
4. Keep the request free of bearer tokens unless the backend says otherwise.

### If it is protected

1. Add the endpoint path under `api` in `html_config.json` if needed.
2. Call it through `APIPath`.
3. Use `ContentLoginApi.getAuthHeaders()`.
4. Confirm the user is authenticated before the call runs.

## Adding A New Page

Use the existing pages in this repo as the template:

- `Content_Login.html`
- `certificate.html`
- `view_more_content1.html`
- `Verify_Certificate.html`

### Minimum page setup

1. Load `axios.min.js` and `api.js`.
2. Load `./html_config.json` with `cache: "no-store"`.
3. Call `ContentLoginApi.configure(...)` after config loads.
4. Use `appConfig.api.apiPath` for bearer-token calls.
5. Use `appConfig.api.publicApiPath` for public calls.
6. Apply labels, logos, and page title from config before calling APIs.

### Good page bootstrap pattern

```js
async function loadConfig() {
  const response = await fetch("./html_config.json", { cache: "no-store" });
  const appConfig = await response.json();

  ContentLoginApi.configure({
    apiPath: appConfig.api.apiPath,
    publicApiPath: appConfig.api.publicApiPath || "/public-api",
    publicApiKey: appConfig.api.publicApiKey || ""
  });

  return appConfig;
}
```

## New Public Endpoint Checklist

Before merging a new public endpoint:

- Confirm it belongs under `public-api`.
- Confirm the frontend uses `getPublicHeaders()`.
- Confirm no bearer token is required.
- Confirm the proxy/deployment route exists outside the browser bundle.
- Confirm the endpoint name is documented in `html_config.json` if page code needs it.

## New Protected Endpoint Checklist

Before merging a new protected endpoint:

- Confirm it belongs under `api`.
- Confirm the frontend uses `getAuthHeaders()`.
- Confirm the user is authenticated before the call runs.
- Confirm the response handling covers `401` and `403`.
- Confirm the endpoint does not accidentally use the public proxy path.

## Common Mistakes

- Calling a public endpoint with `APIPath`.
- Calling a protected endpoint with `publicApiPath`.
- Hardcoding a backend URL inside the page.
- Putting a secret in `html_config.json` when it should stay server-side.
- Forgetting to call `ContentLoginApi.configure(...)` after loading config.

## Quick Decision Guide

- If the request should work without login, use `publicApiPath`.
- If the request depends on the stored user token, use `APIPath` with bearer auth.
- If the request needs a secret, the secret must come from the server-side proxy or deployment config.

