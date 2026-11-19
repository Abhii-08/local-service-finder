const statuses = new Set(['pending', 'contacted', 'confirmed', 'completed', 'cancelled']);
const headers = {
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'",
};

function json(body, status = 200) {
  return Response.json(body, {status, headers: {...headers, 'Cache-Control': 'private, no-store'}});
}

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readBody(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new RequestError(415, 'Expected a JSON request.');
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    throw new RequestError(403, 'This request must come from this site.');
  }
  const raw = await request.text();
  if (raw.length > 12000) throw new RequestError(413, 'The request is too long.');
  let data;
  try { data = JSON.parse(raw); } catch { throw new RequestError(400, 'Invalid request data.'); }
  if (!data || Array.isArray(data) || typeof data !== 'object') {
    throw new RequestError(400, 'Invalid request data.');
  }
  return data;
}

async function getHidden(db) {
  const {results} = await db.prepare('SELECT provider_id FROM hidden_providers').all();
  return new Set(results.map(row => row.provider_id));
}

async function handleApi(request, pathname, db) {
  const method = request.method;
  if (method === 'GET' && pathname === '/api/providers') {
    const hidden = await getHidden(db);
    return json({providers: PROVIDERS.filter(provider => !hidden.has(provider.id))});
  }
  if (method === 'POST' && pathname === '/api/requests') {
    const input = await readBody(request);
    const hidden = await getHidden(db);
    const errors = validateEnquiry(input, PROVIDERS.filter(provider => !hidden.has(provider.id)));
    if (Object.keys(errors).length) return json({error: 'Check the details below.', fields: errors}, 422);
    const clean = cleanEnquiry(input);
    const ref = 'LSF-' + crypto.randomUUID().slice(0, 23).replaceAll('-', '').toUpperCase();
    const createdAt = new Date().toISOString();
    const inserted = await db.prepare(
      'INSERT INTO service_requests (ref, provider_id, name, phone, locality, description, preferred_at, created_at) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM hidden_providers WHERE provider_id = ?)'
    ).bind(ref, clean.providerId, clean.name, clean.phone, clean.locality, clean.description, clean.when, createdAt, clean.providerId).run();
    if (!inserted.meta.changes) throw new RequestError(409, 'This provider is no longer accepting requests.');
    return json({ref, status: 'pending'}, 201);
  }
  const track = /^\/api\/requests\/(LSF-[A-F0-9]{20})$/.exec(pathname);
  if (method === 'GET' && track) {
    const row = await db.prepare('SELECT ref, provider_id, preferred_at, created_at, status FROM service_requests WHERE ref = ?').bind(track[1]).first();
    if (!row) throw new RequestError(404, 'No request matched that reference.');
    return json({request: row});
  }
  // The hosted site is owner-only, including every admin API path.
  if (method === 'GET' && pathname === '/api/admin') {
    const [requests, hidden] = await db.batch([
      db.prepare('SELECT * FROM service_requests ORDER BY created_at DESC'),
      db.prepare('SELECT provider_id FROM hidden_providers'),
    ]);
    return json({requests: requests.results, providers: PROVIDERS, hidden: hidden.results.map(row => row.provider_id)});
  }
  const update = /^\/api\/admin\/requests\/(LSF-[A-F0-9]{20})$/.exec(pathname);
  if (method === 'PATCH' && update) {
    const {status} = await readBody(request);
    if (!statuses.has(status)) throw new RequestError(422, 'Choose a valid status.');
    const result = await db.prepare('UPDATE service_requests SET status = ? WHERE ref = ?').bind(status, update[1]).run();
    if (!result.meta.changes) throw new RequestError(404, 'This request could not be found.');
    return json({status});
  }
  const listing = /^\/api\/admin\/providers\/(p\d+)$/.exec(pathname);
  if (method === 'PATCH' && listing) {
    const id = listing[1];
    if (!PROVIDERS.some(provider => provider.id === id)) throw new RequestError(404, 'Provider could not be found.');
    const {visible} = await readBody(request);
    if (typeof visible !== 'boolean') throw new RequestError(422, 'Choose the listing visibility.');
    await db.prepare(visible ? 'DELETE FROM hidden_providers WHERE provider_id = ?' : 'INSERT OR IGNORE INTO hidden_providers (provider_id) VALUES (?)').bind(id).run();
    return json({visible});
  }
  throw new RequestError(404, 'This page could not be found.');
}

export default {
  async fetch(request, env) {
    const {pathname} = new URL(request.url);
    if (pathname.startsWith('/api/')) {
      try { return await handleApi(request, pathname, env.DB); } catch (error) {
        if (error instanceof RequestError) return json({error: error.message}, error.status);
        console.error('Local Service Finder data operation failed:', error.message);
        return json({error: 'The directory could not complete that action. Please try again.'}, 500);
      }
    }
    if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status: 405, headers});
    const page = ['/', '/index.html', '/admin', '/admin/', '/admin.html'].includes(pathname);
    const asset = assets[page ? '/index.html' : pathname];
    if (!asset) return new Response('Page not found', {status: 404, headers});
    const [contentType, data, etag] = asset;
    const responseHeaders = {...headers, 'Content-Type': contentType, 'Cache-Control': 'private, no-cache', ETag: etag};
    if (request.headers.get('if-none-match') === etag) return new Response(null, {status: 304, headers: responseHeaders});
    const body = request.method === 'HEAD' ? null : Uint8Array.from(atob(data), char => char.charCodeAt(0));
    return new Response(body, {headers: responseHeaders});
  },
};
