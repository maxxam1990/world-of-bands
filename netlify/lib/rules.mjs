/* ============================================================
   Completion rules — shared by the band API, the school API and
   the organiser view so "what's missing" is computed one way.
============================================================ */

export const BAND_KEYS   = ['logo', 'band_photo', 'bio_en', 'members', 'coach', 'songs'];
export const SCHOOL_KEYS = ['school_logo', 'coordinator', 'contact', 'emergency', 'releases', 'signature'];

/* kinds: Set of asset kinds this band has uploaded */
export function bandMissing(b, kinds) {
  const m = [];
  if (!kinds.has('logo')) m.push('logo');
  if (!kinds.has('band_photo')) m.push('band_photo');
  if (!b.bio_en) m.push('bio_en');
  if (!Array.isArray(b.members) || !b.members.length) m.push('members');
  if (!b.coach_name) m.push('coach');
  if (!Array.isArray(b.songs) || !b.songs.length) m.push('songs');
  return m;
}

export function schoolMissing(s, kinds) {
  const m = [];
  if (!kinds.has('school_logo')) m.push('school_logo');
  if (!s.coordinator_name) m.push('coordinator');
  if (!s.contact_name) m.push('contact');
  if (!s.emergency_name || !s.emergency_phone) m.push('emergency');
  if (!s.release_media || !s.release_logo || !s.release_minors || !s.release_clean) m.push('releases');
  if (!s.release_signed_by) m.push('signature');
  return m;
}

export function pct(missing, total) {
  return Math.round(((total - missing.length) / total) * 100);
}

/* ---------- shared write validation ---------- */
export const SHIRT_SIZES = ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL'];

export function cleanSizes(input) {
  const out = {};
  if (input && typeof input === 'object') {
    for (const sz of SHIRT_SIZES) {
      const n = Math.max(0, Math.min(200, parseInt(input[sz], 10) || 0));
      if (n) out[sz] = n;
    }
  }
  return out;
}

export function cleanRows(input, keySpec, maxRows) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, maxRows).map((row) => {
    const out = {};
    for (const [k, max] of Object.entries(keySpec)) out[k] = String((row && row[k]) || '').trim().slice(0, max);
    return out;
  }).filter((row) => Object.values(row).some(Boolean));
}

export function cleanText(payload, spec) {
  const patch = {};
  for (const [field, max] of Object.entries(spec)) {
    if (field in payload) {
      const v = payload[field] == null ? '' : String(payload[field]).trim();
      patch[field] = v.slice(0, max) || null;
    }
  }
  return patch;
}

export function cleanBools(payload, fields) {
  const patch = {};
  for (const f of fields) if (f in payload) patch[f] = payload[f] === true;
  return patch;
}

/* ---------- uploads ---------- */
const IMG  = ['image/png', 'image/jpeg', 'image/webp'];
const LOGO = ['image/png', 'image/svg+xml'];            // logos need transparency
export const BAND_ASSETS = {
  logo:        { max: 1, mime: LOGO },
  band_photo:  { max: 1, mime: IMG },
  press_photo: { max: 8, mime: IMG },
  stage_plot:  { max: 1, mime: IMG.concat('application/pdf') }
};
export const SCHOOL_ASSETS = {
  school_logo: { max: 1, mime: LOGO }
};
export const MAX_BYTES = 15 * 1024 * 1024;
export const TOKEN_RE = /^[a-f0-9]{20}$/;
export const UUID_RE = /^[0-9a-f-]{36}$/;

export function extFor(mime, filename) {
  const fromName = /\.([a-z0-9]{2,5})$/i.exec(String(filename || ''));
  if (fromName) return '.' + fromName[1].toLowerCase();
  return { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp',
           'image/svg+xml': '.svg', 'application/pdf': '.pdf' }[mime] || '';
}

export function clientIp(req) {
  const h = req.headers;
  const fwd = h.get('x-nf-client-connection-ip') || h.get('x-forwarded-for') || '';
  return fwd.split(',')[0].trim().slice(0, 64) || null;
}
