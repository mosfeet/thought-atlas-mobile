# Security and privacy boundaries

This static application stores imported Atlas data in browser LocalStorage.
It does not provide encryption, access control between people using the same
browser profile, or isolation from other applications on the same origin.
Do not import credentials or confidential business records. Exported JSON
files require the same care as their source material.

The current entry point loads app-v16.js and app-v17.js. It does not register a
new service worker. A worker registered by an older release may still be active;
the worker remains maintained for those installations. Its cache is limited to
the listed static assets and its cleanup preserves other applications' caches.

The HTML Content Security Policy restricts scripts and connections to the same
origin. Inline styles remain enabled for existing visualizations. The policy is
defense in depth, not a substitute for escaping imported content. Framing
restrictions require HTTP response headers; they cannot be enforced by a meta
frame-ancestors directive. Hosting administrators should add frame-ancestors
'none' as a response header where supported.

GitHub Pages can expose a site even when its source repository is private.
Repository visibility is not a substitute for website authentication.

Check changes locally with:

```sh
node --test tests/security.test.mjs
```
