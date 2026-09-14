/* ============================================================
   Tiny Supabase REST/Storage client — no npm dependencies.
   Runs ONLY inside Netlify Functions. The service-role key it
   uses bypasses row-level security and must never reach the
   browser, so nothing in this file may be imported by page JS.
============================================================ */

const URL_BASE = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const BUCKET = process.env.SUPABASE_BUCKET || 'band-assets';

export function configError() {
  if (!URL_BASE) return 'SUPABASE_URL is not set';
  if (!SERVICE_KEY) return 'SUPABASE_SERVICE_ROLE_KEY is not set';
  return null;
}

function headers(extra) {
  return Object.assign({
    apikey: SERVICE_KEY,
    Authorization: 'Bearer ' + SERVICE_KEY
  }, extra || {});
}

/* ---------- PostgREST ---------- */
export async function db(path, { method = 'GET', body, prefer } = {}) {
  const res = await fetch(URL_BASE + '/rest/v1/' + path, {
    method,
    headers: headers({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    }),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) throw new Error('supabase db ' + res.status + ': ' + text.slice(0, 400));
  return text ? JSON.parse(text) : null;
}

/* ---------- Storage: signed upload URL (browser PUTs straight to Supabase) ----------
   POST /storage/v1/object/upload/sign/{bucket}/{path} -> { url: "/object/upload/sign/...?token=..." }
   The browser then PUTs the file bytes to URL_BASE + '/storage/v1' + url.        */
export async function signUpload(objectPath) {
  const res = await fetch(
    URL_BASE + '/storage/v1/object/upload/sign/' + BUCKET + '/' + encodePath(objectPath),
    { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: '{}' }
  );
  const text = await res.text();
  if (!res.ok) throw new Error('supabase signUpload ' + res.status + ': ' + text.slice(0, 400));
  const data = JSON.parse(text);
  return URL_BASE + '/storage/v1' + data.url;
}

/* ---------- Storage: signed download URL (for previews in the portal + admin) ---------- */
export async function signDownload(objectPath, expiresIn = 3600) {
  const res = await fetch(
    URL_BASE + '/storage/v1/object/sign/' + BUCKET + '/' + encodePath(objectPath),
    {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ expiresIn })
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  // storage returns `signedURL` (older) / `signedUrl` (newer) — accept either
  const rel = data.signedURL || data.signedUrl;
  return rel ? URL_BASE + '/storage/v1' + (rel.startsWith('/') ? rel : '/' + rel) : null;
}

export async function removeObject(objectPath) {
  await fetch(URL_BASE + '/storage/v1/object/' + BUCKET + '/' + encodePath(objectPath), {
    method: 'DELETE',
    headers: headers()
  });
}

function encodePath(p) {
  return String(p).split('/').map(encodeURIComponent).join('/');
}

/* ---------- JSON response helper ---------- */
export function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
