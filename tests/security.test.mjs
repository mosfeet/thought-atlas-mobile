import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../atlas-mobile-pwa/', import.meta.url);
const source = readFileSync(new URL('service-worker.js', root), 'utf8');
const scope = 'https://example.test/atlas-mobile-pwa/';

function harness({ offline = false, status = 200, redirected = false } = {}) {
  const listeners = {}, deleted = [], stored = [], opened = [];
  let claimed = false;
  const fallback = new Response('own cached shell');
  const cache = {
    addAll: async () => {},
    put: async (request, response) => stored.push([request.url, await response.text()]),
    match: async () => fallback
  };
  const context = {
    URL, Response,
    self: {
      registration: { scope },
      addEventListener: (name, handler) => listeners[name] = handler,
      skipWaiting: () => {},
      clients: { claim: async () => { claimed = true; } }
    },
    caches: {
      keys: async () => ['another-app-v1', 'thought-atlas-mobile-v17', 'thought-atlas-mobile-v18-security'],
      delete: async (key) => { deleted.push(key); return true; },
      open: async (name) => { opened.push(name); return cache; },
      match: () => { throw new Error('Must not read another app cache'); }
    },
    fetch: async (request) => {
      if (offline) throw new Error('offline');
      const response = new Response('shell', { status });
      Object.defineProperties(response, {
        type: { value: 'basic' }, url: { value: request.url }, redirected: { value: redirected }
      });
      return response;
    }
  };
  vm.runInNewContext(source, context);
  async function request(url, method = 'GET') {
    const waits = []; let response;
    listeners.fetch({ request: { url, method }, waitUntil: p => waits.push(p), respondWith: p => response = p });
    const result = response ? await response : null;
    await Promise.all(waits);
    return result;
  }
  return { listeners, deleted, stored, opened, request, fallback, get claimed() { return claimed; } };
}

test('cleanup preserves other apps and waits for claiming clients', async () => {
  const h = harness(); let done;
  h.listeners.activate({ waitUntil: p => done = p });
  assert.equal(h.claimed, false);
  await done;
  assert.deepEqual(h.deleted, ['thought-atlas-mobile-v17']);
  assert.equal(h.claimed, true);
});

test('private, external, unknown-query, and non-GET requests bypass the cache', async () => {
  const h = harness();
  for (const url of [scope + 'private.json', scope + 'index.html?token=example', 'https://other.test/index.html']) {
    assert.equal(await h.request(url), null);
  }
  assert.equal(await h.request(scope + 'index.html', 'POST'), null);
  assert.deepEqual(h.opened, []);
});

test('known static assets refresh under an event lifetime promise', async () => {
  const h = harness();
  assert.equal(await (await h.request(scope + 'index.html')).text(), 'shell');
  assert.deepEqual(h.stored, [[scope + 'index.html', 'shell']]);
});

test('offline fallback reads only the named application cache', async () => {
  const h = harness({ offline: true });
  assert.equal(await h.request(scope + 'index.html'), h.fallback);
  assert.deepEqual(h.opened, ['thought-atlas-mobile-v18-security']);
});

test('errors and redirected content do not replace trusted assets', async () => {
  for (const options of [{ status: 404 }, { redirected: true }]) {
    const h = harness(options);
    await h.request(scope + 'index.html');
    assert.deepEqual(h.stored, []);
  }
});

test('entry point has restrictive script policy and all local dependencies exist', () => {
  const html = readFileSync(new URL('index.html', root), 'utf8');
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self';/);
  assert.match(csp, /connect-src 'self';/);
  assert.doesNotMatch(csp, /unsafe-eval|frame-ancestors/);
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    assert.equal(existsSync(new URL(match[1].split('?')[0], root)), true, match[1]);
  }
});
