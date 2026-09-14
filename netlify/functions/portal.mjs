/* ============================================================
   WORLD OF BANDS FLORIDA — band API
   POST /api/portal  { token, action, payload }
   A band link edits ONE band: its files, bio, members, songs, gear
   and shirt pre-order. School-level info and the signature live on
   the school link (school.mjs).
============================================================ */
import { db, json, configError } from '../lib/supabase.mjs';
import { bandMissing, BAND_KEYS, BAND_ASSETS, TOKEN_RE, pct,
         cleanText, cleanRows, cleanSizes } from '../lib/rules.mjs';
import { listAssets, kindSet, signOne, attachOne, removeOne } from '../lib/uploads.mjs';

export const config = { path: '/api/portal' };

const TEXT_FIELDS = { band_name: 160, bio_en: 1200, hook_line: 180, hometown: 120, formed_year: 12, instagram: 120,
                      coach_name: 120, coach_phone: 40, coach_email: 200, tech_notes: 2000, merch_notes: 500 };
const MEMBER_KEYS = { name: 120, instrument: 80, instrument_other: 80, age: 8 };
const SONG_KEYS   = { round: 40, title: 160, artist: 160, duration: 20 };

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const cfgErr = configError();
  if (cfgErr) return json(500, { error: 'server_not_configured', detail: cfgErr });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'bad_json' }); }
  const token = String(body.token || '').trim().toLowerCase();
  if (!TOKEN_RE.test(token)) return json(400, { error: 'bad_token' });

  const rows = await db('bands?token=eq.' + token + '&select=*&limit=1');
  const band = rows && rows[0];
  if (!band) return json(404, { error: 'not_found' });

  const schools = await db('schools?id=eq.' + band.school_id + '&select=id,school_name,status,coordinator_name,coordinator_phone,coordinator_email&limit=1');
  const school = schools && schools[0];
  if (!school) return json(404, { error: 'not_found' });

  const owner = { col: 'band_id', id: band.id, prefix: 'bands' };
  const locked = school.status === 'locked';
  const action = String(body.action || 'load');
  const payload = body.payload || {};

  try {
    if (locked && !['load', 'addon'].includes(action)) return json(423, { error: 'locked' });
    switch (action) {
      case 'load':        return json(200, await view(band, school, owner));
      case 'save':        return json(200, await save(band, school, owner, payload));
      case 'sign-upload': return await signOne(owner, BAND_ASSETS, payload);
      case 'attach':      return (await attachOne(owner, BAND_ASSETS, payload)) || json(200, await view(band, school, owner));
      case 'remove':      return (await removeOne(owner, payload)) || json(200, await view(band, school, owner));
      case 'addon':       return await addon(band, payload);
      default:            return json(400, { error: 'unknown_action' });
    }
  } catch (err) {
    console.error('[portal]', action, err);
    return json(500, { error: 'server_error' });
  }
}

async function view(band, school, owner) {
  const assets = await listAssets(owner);
  const kinds = new Set(assets.map((a) => a.kind));
  const missing = bandMissing(band, kinds);
  const { token, admin_notes, ...safe } = band;
  return {
    band: safe, assets, missing, complete_pct: pct(missing, BAND_KEYS.length),
    school: { school_name: school.school_name, status: school.status,
              coordinator: { name: school.coordinator_name, phone: school.coordinator_phone, email: school.coordinator_email } }
  };
}

async function save(band, school, owner, payload) {
  const patch = cleanText(payload, TEXT_FIELDS);
  if ('members' in payload)     patch.members     = cleanRows(payload.members, MEMBER_KEYS, 25);
  if ('songs' in payload)       patch.songs       = cleanRows(payload.songs, SONG_KEYS, 6);
  if ('merch_sizes' in payload) patch.merch_sizes = cleanSizes(payload.merch_sizes);
  if (!Object.keys(patch).length) return await view(band, school, owner);

  await db('bands?id=eq.' + band.id, { method: 'PATCH', body: patch, prefer: 'return=minimal' });
  const rows = await db('bands?id=eq.' + band.id + '&select=*&limit=1');
  return await view(rows[0], school, owner);
}

async function addon(band, payload) {
  const name = String(payload.addon || '');
  if (!['photo_pack'].includes(name)) return json(400, { error: 'bad_addon' });
  await db('addons', { method: 'POST', prefer: 'return=minimal',
    body: { band_id: band.id, addon: name, note: String(payload.note || '').slice(0, 500) } });
  return json(200, { ok: true });
}
