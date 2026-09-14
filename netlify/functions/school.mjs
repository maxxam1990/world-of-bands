/* ============================================================
   WORLD OF BANDS FLORIDA — school API (the coach's page)
   POST /api/school  { token, action, payload }
   One school link: school logo, coach + school rep, event-day
   contact, the four permissions signed ONCE for every band, and a
   live view of each band's checklist. "Send" needs all bands done.
============================================================ */
import { db, json, configError } from '../lib/supabase.mjs';
import { bandMissing, schoolMissing, BAND_KEYS, SCHOOL_KEYS, SCHOOL_ASSETS, TOKEN_RE, UUID_RE, pct,
         cleanText, cleanBools, clientIp } from '../lib/rules.mjs';
import { listAssets, kindSet, signOne, attachOne, removeOne } from '../lib/uploads.mjs';

export const config = { path: '/api/school' };

const TEXT_FIELDS = {
  coordinator_name: 120, coordinator_phone: 40, coordinator_email: 200,
  contact_name: 120, contact_role: 80, contact_phone: 40, contact_email: 200,
  emergency_name: 120, emergency_phone: 40, expected_guests: 10, accessibility_notes: 1000,
  release_signed_by: 120, release_role: 80
};
const BOOL_FIELDS = ['release_media', 'release_logo', 'release_minors', 'release_clean'];

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const cfgErr = configError();
  if (cfgErr) return json(500, { error: 'server_not_configured', detail: cfgErr });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'bad_json' }); }
  const token = String(body.token || '').trim().toLowerCase();
  if (!TOKEN_RE.test(token)) return json(400, { error: 'bad_token' });

  const rows = await db('schools?token=eq.' + token + '&select=*&limit=1');
  const school = rows && rows[0];
  if (!school) return json(404, { error: 'not_found' });

  const owner = { col: 'school_id', id: school.id, prefix: 'schools' };
  const locked = school.status === 'locked';
  const action = String(body.action || 'load');
  const payload = body.payload || {};

  try {
    if (locked && !['load', 'addon'].includes(action)) return json(423, { error: 'locked' });
    switch (action) {
      case 'load':        return json(200, await view(school, owner));
      case 'save':        return json(200, await save(school, owner, payload));
      case 'name-band':   return json(200, await nameBand(school, owner, payload));
      case 'sign-upload': return await signOne(owner, SCHOOL_ASSETS, payload);
      case 'attach':      return (await attachOne(owner, SCHOOL_ASSETS, payload)) || json(200, await view(school, owner));
      case 'remove':      return (await removeOne(owner, payload)) || json(200, await view(school, owner));
      case 'addon':       return await addon(school, payload);
      case 'submit':      return await submit(school, owner, clientIp(req));
      default:            return json(400, { error: 'unknown_action' });
    }
  } catch (err) {
    console.error('[school]', action, err);
    return json(500, { error: 'server_error' });
  }
}

/* every band under this school, with its checklist — the coach sees the kids' progress */
export async function bandSummaries(schoolId, includeTokens) {
  const bands = await db('bands?school_id=eq.' + schoolId + '&select=*&order=slot_number.asc.nullslast,created_at.asc');
  const assets = await db('assets?school_id=is.null&select=band_id,kind');
  const byBand = new Map();
  for (const a of assets || []) {
    if (!byBand.has(a.band_id)) byBand.set(a.band_id, new Set());
    byBand.get(a.band_id).add(a.kind);
  }
  return (bands || []).map((b) => {
    const missing = bandMissing(b, byBand.get(b.id) || new Set());
    const out = {
      id: b.id, band_name: b.band_name, slot_number: b.slot_number,
      members_count: Array.isArray(b.members) ? b.members.length : 0,
      songs_count: Array.isArray(b.songs) ? b.songs.length : 0,
      shirts: Object.values(b.merch_sizes || {}).reduce((s, n) => s + Number(n || 0), 0),
      missing, complete_pct: pct(missing, BAND_KEYS.length), updated_at: b.updated_at
    };
    if (includeTokens) { out.token = b.token; out.portal_url = '/band/' + b.token; }
    return out;
  });
}

async function view(school, owner) {
  const assets = await listAssets(owner);
  const missing = schoolMissing(school, new Set(assets.map((a) => a.kind)));
  const bands = await bandSummaries(school.id, true);   // the coach may hand band links to band leaders
  const { token, admin_notes, ...safe } = school;
  return { school: safe, assets, bands, missing, complete_pct: pct(missing, SCHOOL_KEYS.length) };
}

async function save(school, owner, payload) {
  const patch = Object.assign(cleanText(payload, TEXT_FIELDS), cleanBools(payload, BOOL_FIELDS));
  if (!Object.keys(patch).length) return await view(school, owner);
  await db('schools?id=eq.' + school.id, { method: 'PATCH', body: patch, prefer: 'return=minimal' });
  const rows = await db('schools?id=eq.' + school.id + '&select=*&limit=1');
  return await view(rows[0], owner);
}

async function nameBand(school, owner, payload) {
  const id = String(payload.band_id || '');
  if (!UUID_RE.test(id)) throw new Error('bad id');
  const name = String(payload.band_name || '').trim().slice(0, 160);
  // only this school's bands
  await db('bands?id=eq.' + id + '&school_id=eq.' + school.id, { method: 'PATCH', body: { band_name: name }, prefer: 'return=minimal' });
  return await view(school, owner);
}

async function addon(school, payload) {
  const name = String(payload.addon || '');
  if (!['raffle', 'sponsor'].includes(name)) return json(400, { error: 'bad_addon' });
  await db('addons', { method: 'POST', prefer: 'return=minimal',
    body: { school_id: school.id, addon: name, note: String(payload.note || '').slice(0, 500) } });
  return json(200, { ok: true });
}

async function submit(school, owner, ip) {
  const rows = await db('schools?id=eq.' + school.id + '&select=*&limit=1');
  const s = rows[0];
  const missing = schoolMissing(s, await kindSet(owner));
  const bands = await bandSummaries(s.id, false);
  const bandsMissing = bands.filter((b) => b.missing.length).map((b) => b.band_name || 'Unnamed band');
  if (!bands.length) bandsMissing.push('no bands');
  if (missing.length || bandsMissing.length) {
    return json(422, { error: 'incomplete', missing, bands_missing: bandsMissing });
  }
  const now = new Date().toISOString();
  await db('schools?id=eq.' + s.id, { method: 'PATCH', prefer: 'return=minimal',
    body: { status: 'submitted', submitted_at: now, release_signed_at: now, release_ip: ip } });
  const fresh = await db('schools?id=eq.' + s.id + '&select=*&limit=1');
  return json(200, await view(fresh[0], owner));
}
