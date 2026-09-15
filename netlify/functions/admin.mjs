/* ============================================================
   WORLD OF BANDS FLORIDA — organiser API
   POST /api/admin  { key, action, payload }
   Gated by WOB_ADMIN_KEY. Schools with their bands nested.
============================================================ */
import { db, json, configError } from '../lib/supabase.mjs';
import { bandMissing, schoolMissing, BAND_KEYS, SCHOOL_KEYS, UUID_RE, pct } from '../lib/rules.mjs';
import { listAssets } from '../lib/uploads.mjs';

export const config = { path: '/api/admin' };

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const cfgErr = configError();
  if (cfgErr) return json(500, { error: 'server_not_configured', detail: cfgErr });
  const adminKey = process.env.WOB_ADMIN_KEY || '';
  if (adminKey.length < 16) return json(500, { error: 'server_not_configured', detail: 'WOB_ADMIN_KEY missing or too short' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'bad_json' }); }
  if (!timingSafeEqual(String(body.key || ''), adminKey)) return json(401, { error: 'unauthorized' });

  const action = String(body.action || 'list');
  const payload = body.payload || {};
  try {
    switch (action) {
      case 'list':     return json(200, await list());
      case 'create':   return json(200, await create(payload));
      case 'add-band': return json(200, await addBand(payload));
      case 'band':     return json(200, await bandDetail(payload));
      case 'school':   return json(200, await schoolDetail(payload));
      case 'status':   return json(200, await setStatus(payload));
      case 'note':     return json(200, await setNote(payload));
      default:         return json(400, { error: 'unknown_action' });
    }
  } catch (err) {
    console.error('[admin]', action, err);
    return json(500, { error: 'server_error' });
  }
}

async function list() {
  const schools = await db('schools?select=*&order=created_at.asc');
  const bands   = await db('bands?select=*&order=slot_number.asc.nullslast,created_at.asc');
  const assets  = await db('assets?select=band_id,school_id,kind');
  const addons  = await db('addons?select=band_id,school_id,addon,note,created_at&order=created_at.desc');

  const kindsBy = new Map();
  for (const a of assets || []) {
    const k = a.band_id || a.school_id;
    if (!kindsBy.has(k)) kindsBy.set(k, new Set());
    kindsBy.get(k).add(a.kind);
  }
  const bandRows = (bands || []).map((b) => {
    const missing = bandMissing(b, kindsBy.get(b.id) || new Set());
    return {
      id: b.id, school_id: b.school_id, token: b.token, portal_url: '/band/' + b.token,
      band_name: b.band_name, slot_number: b.slot_number,
      members_count: Array.isArray(b.members) ? b.members.length : 0,
      songs_count: Array.isArray(b.songs) ? b.songs.length : 0,
      shirts: Object.values(b.merch_sizes || {}).reduce((s, n) => s + Number(n || 0), 0),
      missing, complete_pct: pct(missing, BAND_KEYS.length), updated_at: b.updated_at
    };
  });
  const out = (schools || []).map((s) => {
    const missing = schoolMissing(s, kindsBy.get(s.id) || new Set());
    const mine = bandRows.filter((b) => b.school_id === s.id);
    return {
      id: s.id, token: s.token, portal_url: '/school/' + s.token,
      school_name: s.school_name, coordinator_name: s.coordinator_name, coordinator_email: s.coordinator_email, coordinator_phone: s.coordinator_phone,
      status: s.status, submitted_at: s.submitted_at, updated_at: s.updated_at, admin_notes: s.admin_notes,
      expected_guests: s.expected_guests,
      missing, complete_pct: pct(missing, SCHOOL_KEYS.length),
      bands: mine, bands_complete: mine.filter((b) => !b.missing.length).length
    };
  });
  const names = new Map();
  out.forEach((s) => { names.set(s.id, s.school_name); s.bands.forEach((b) => names.set(b.id, b.band_name + ' (' + s.school_name + ')')); });
  return {
    schools: out,
    addons: (addons || []).map((a) => ({ ...a, who: names.get(a.band_id || a.school_id) || 'Unknown' }))
  };
}

/* create a school + N bands in one go; returns every link */
async function create(payload) {
  const school_name = String(payload.school_name || '').trim().slice(0, 160);
  if (!school_name) throw new Error('school_name required');
  const rows = await db('schools', { method: 'POST', prefer: 'return=representation', body: {
    school_name,
    coordinator_name: str(payload.coordinator_name, 160), coordinator_email: str(payload.coordinator_email, 200),
    coordinator_phone: str(payload.coordinator_phone, 40)
  }});
  const school = Array.isArray(rows) ? rows[0] : rows;

  let names = Array.isArray(payload.band_names) ? payload.band_names.map((n) => String(n || '').trim().slice(0, 160)) : [];
  const count = Math.max(names.length, Math.min(3, Math.max(1, parseInt(payload.band_count, 10) || 1)));
  while (names.length < count) names.push('');
  const bands = [];
  for (const band_name of names) {
    const r = await db('bands', { method: 'POST', prefer: 'return=representation', body: { school_id: school.id, band_name } });
    const b = Array.isArray(r) ? r[0] : r;
    bands.push({ id: b.id, band_name: b.band_name, portal_url: '/band/' + b.token });
  }
  return { school: { id: school.id, school_name, portal_url: '/school/' + school.token }, bands };
}

async function addBand(payload) {
  const school_id = String(payload.school_id || '');
  if (!UUID_RE.test(school_id)) throw new Error('bad id');
  const r = await db('bands', { method: 'POST', prefer: 'return=representation',
    body: { school_id, band_name: str(payload.band_name, 160) || '' } });
  const b = Array.isArray(r) ? r[0] : r;
  return { band: { id: b.id, band_name: b.band_name, portal_url: '/band/' + b.token } };
}

/* everything one band uploaded and typed, with 1-hour signed file URLs */
async function bandDetail(payload) {
  const id = String(payload.id || '');
  if (!UUID_RE.test(id)) return { error: 'bad_id' };
  const rows = await db('bands?id=eq.' + id + '&select=*&limit=1');
  const band = rows && rows[0];
  if (!band) return { error: 'not_found' };
  const assets = await listAssets({ col: 'band_id', id: band.id, prefix: 'bands' });
  return { band, assets, missing: bandMissing(band, new Set(assets.map((a) => a.kind))) };
}

async function schoolDetail(payload) {
  const id = String(payload.id || '');
  if (!UUID_RE.test(id)) return { error: 'bad_id' };
  const rows = await db('schools?id=eq.' + id + '&select=*&limit=1');
  const school = rows && rows[0];
  if (!school) return { error: 'not_found' };
  const assets = await listAssets({ col: 'school_id', id: school.id, prefix: 'schools' });
  return { school, assets, missing: schoolMissing(school, new Set(assets.map((a) => a.kind))) };
}

async function setStatus(payload) {
  const id = String(payload.id || ''), status = String(payload.status || '');
  if (!UUID_RE.test(id)) throw new Error('bad id');
  if (!['open', 'submitted', 'locked'].includes(status)) throw new Error('bad status');
  await db('schools?id=eq.' + id, { method: 'PATCH', body: { status }, prefer: 'return=minimal' });
  return { ok: true };
}

async function setNote(payload) {
  const id = String(payload.id || '');
  if (!UUID_RE.test(id)) throw new Error('bad id');
  await db('schools?id=eq.' + id, { method: 'PATCH', prefer: 'return=minimal',
    body: { admin_notes: String(payload.admin_notes || '').slice(0, 2000) || null } });
  return { ok: true };
}

function str(v, max) { const s = String(v || '').trim().slice(0, max); return s || null; }
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
