/* Upload plumbing shared by the band and school APIs.
   owner = { col: 'band_id' | 'school_id', id, prefix: 'bands' | 'schools' } */
import { db, signUpload, signDownload, removeObject, json } from './supabase.mjs';
import { MAX_BYTES, UUID_RE, extFor } from './rules.mjs';

export async function listAssets(owner) {
  const rows = await db('assets?' + owner.col + '=eq.' + owner.id +
    '&select=id,kind,path,filename,mime,size_bytes,created_at&order=created_at.asc');
  const out = [];
  for (const a of rows || []) {
    out.push({ id: a.id, kind: a.kind, filename: a.filename, mime: a.mime, size_bytes: a.size_bytes,
               url: await signDownload(a.path, 3600) });
  }
  return out;
}

export async function kindSet(owner) {
  const rows = await db('assets?' + owner.col + '=eq.' + owner.id + '&select=kind');
  return new Set((rows || []).map((a) => a.kind));
}

export async function signOne(owner, specs, payload) {
  const kind = String(payload.kind || '');
  const spec = specs[kind];
  if (!spec) return json(400, { error: 'bad_kind' });
  const mime = String(payload.mime || '');
  if (!spec.mime.includes(mime)) return json(400, { error: 'bad_type' });
  const size = Number(payload.size || 0);
  if (!(size > 0) || size > MAX_BYTES) return json(400, { error: 'too_large', max: MAX_BYTES });

  const existing = await db('assets?' + owner.col + '=eq.' + owner.id + '&kind=eq.' + kind + '&select=id');
  if ((existing || []).length >= spec.max) return json(409, { error: 'slot_full', max: spec.max });

  const path = owner.prefix + '/' + owner.id + '/' + kind + '-' + Date.now() + '-' +
               Math.random().toString(16).slice(2, 8) + extFor(mime, payload.filename);
  return json(200, { uploadUrl: await signUpload(path), path });
}

export async function attachOne(owner, specs, payload) {
  const kind = String(payload.kind || '');
  if (!specs[kind]) return json(400, { error: 'bad_kind' });
  const path = String(payload.path || '');
  if (!path.startsWith(owner.prefix + '/' + owner.id + '/')) return json(403, { error: 'bad_path' });
  const row = { kind, path, filename: String(payload.filename || '').slice(0, 200),
                mime: String(payload.mime || '').slice(0, 100), size_bytes: Number(payload.size || 0) };
  row[owner.col] = owner.id;
  await db('assets', { method: 'POST', body: row, prefer: 'return=minimal' });
  return null;   // caller returns its own view
}

export async function removeOne(owner, payload) {
  const id = String(payload.id || '');
  if (!UUID_RE.test(id)) return json(400, { error: 'bad_id' });
  const rows = await db('assets?id=eq.' + id + '&' + owner.col + '=eq.' + owner.id + '&select=id,path');
  const asset = rows && rows[0];
  if (!asset) return json(404, { error: 'not_found' });
  await removeObject(asset.path);
  await db('assets?id=eq.' + asset.id, { method: 'DELETE', prefer: 'return=minimal' });
  return null;
}
