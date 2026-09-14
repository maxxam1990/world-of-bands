/* ============================================================
   WORLD OF BANDS FLORIDA — band page (4 steps)
   Files · About · Members · Songs. No signature here — the coach
   signs once for every band from the school page.
============================================================ */
(function () {
  'use strict';
  var W = window.WOB;
  var TOKEN = (location.pathname.match(/\/band\/([a-f0-9]{20})\/?$/i) || [])[1] || '';
  var api = W.makeApi('/api/portal', TOKEN);
  var state = { band: null, assets: [], missing: [], school: {} };

  var SLOTS = [
    { kind: 'logo', max: 1, en: 'Band logo', es: 'Logo de la banda',
      specEn: 'PNG, transparent background (or SVG)', specEs: 'PNG con fondo transparente (o SVG)', accept: 'image/png,image/svg+xml' },
    { kind: 'band_photo', max: 1, en: 'Band photo', es: 'Foto de la banda',
      specEn: 'Everyone in the band · landscape · biggest you have', specEs: 'Toda la banda · horizontal · la más grande que tengan', accept: 'image/png,image/jpeg,image/webp' },
    { kind: 'press_photo', max: 8, en: 'Extra photo', es: 'Foto adicional', specEn: 'Up to 8', specEs: 'Hasta 8', accept: 'image/png,image/jpeg,image/webp' },
    { kind: 'stage_plot', max: 1, en: 'Stage plot', es: 'Diagrama de escenario',
      specEn: 'PDF or image', specEs: 'PDF o imagen', accept: 'image/png,image/jpeg,image/webp,application/pdf' }
  ];
  var STEPS = [
    { n: 1, en: 'Files',   es: 'Archivos',    keys: ['logo', 'band_photo'] },
    { n: 2, en: 'About',   es: 'Sobre',       keys: ['bio_en'] },
    { n: 3, en: 'Members', es: 'Integrantes', keys: ['members', 'coach'] },
    { n: 4, en: 'Songs',   es: 'Canciones',   keys: ['songs'] }
  ];
  var LABELS = { logo: ['band logo', 'logo'], band_photo: ['band photo', 'foto de la banda'], bio_en: ['bio', 'biografía'],
                 members: ['at least one member', 'al menos un integrante'], coach: ['band coach', 'coach de la banda'], songs: ['at least one song', 'al menos una canción'] };
  var INSTRUMENTS = ['Vocals', 'Guitar', 'Bass', 'Drums', 'Keys / Piano', 'Other'];
  var ROUNDS = [{ v: 'qualifying', en: 'Qualifying', es: 'Clasificatoria' }, { v: 'division', en: 'Division', es: 'División' }, { v: 'alternate', en: 'Alternate', es: 'Alternativa' }];
  var SIZES = ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL'], SHIRT_PRICE = 25;

  var cur = 1;
  try { cur = Math.min(4, Math.max(1, Number(localStorage.getItem('wob-step-' + TOKEN)) || 1)); } catch (e) {}
  var hashStep = /^#step([1-4])$/.exec(location.hash);
  if (hashStep) cur = Number(hashStep[1]);

  function locked() { return state.school.status === 'locked'; }
  var saver = W.autosave({ api: api, set: function (f, v) { state.band[f] = v; if (f === 'band_name') header(); }, onSaved: apply });
  var ups = W.uploads({ api: api, slots: SLOTS, assets: function () { return state.assets; }, locked: locked, onChange: apply });

  function boot() {
    if (!TOKEN) return gate();
    api('load').then(function (d) {
      state = d;
      document.getElementById('loading').style.display = 'none';
      document.getElementById('app').style.display = '';
      render();
    }).catch(gate);
  }
  function gate() { document.getElementById('loading').style.display = 'none'; document.getElementById('gate').style.display = ''; }

  function apply(d) { state = d; header(); stepbar(); doneBox(); coachBtn(); }

  /* "Same as our coordinator" — the common case is zero typing */
  function coachBtn() {
    var c = state.school.coordinator || {}, btn = document.getElementById('sameAsBtn');
    if (!btn) return;
    if (!c.name || locked()) { btn.style.display = 'none'; return; }
    btn.style.display = '';
    btn.innerHTML = W.bi('Same as ' + c.name, 'Igual que ' + c.name);
  }
  window.sameAsCoordinator = function () {
    var c = state.school.coordinator || {};
    [['coach_name', c.name], ['coach_phone', c.phone], ['coach_email', c.email]].forEach(function (pair) {
      var el = document.querySelector('[data-f="' + pair[0] + '"]');
      el.value = pair[1] || ''; state.band[pair[0]] = el.value; saver.queue(pair[0], el.value);
    });
  };

  function header() {
    var b = state.band;
    document.getElementById('bandName').textContent = b.band_name || W.t('Unnamed band', 'Banda sin nombre');
    document.getElementById('bandSchool').textContent = state.school.school_name || '';
    var pill = document.getElementById('statusPill');
    var done = !state.missing.length;
    pill.className = 'pill ' + (locked() ? 'pill-lock' : done ? 'pill-done' : 'pill-open');
    pill.textContent = locked() ? W.t('Locked', 'Bloqueado') : done ? W.t('Complete', 'Completo') : W.t('In progress', 'En progreso');
  }

  function render() {
    header();
    if (locked()) {
      document.getElementById('lockNote').style.display = '';
      document.getElementById('introLine').style.display = 'none';
      document.querySelectorAll('.step input, .step textarea, .step select, .step button').forEach(function (el) { el.disabled = true; });
    }
    saver.fill(state.band);
    ups.render(); members(); songs(); sizes(); coachBtn();
    W.applyPlaceholders(); doneBox(); show(cur);
  }

  /* ---------- steps ---------- */
  function show(n) {
    cur = n;
    try { localStorage.setItem('wob-step-' + TOKEN, String(n)); } catch (e) {}
    document.querySelectorAll('.step').forEach(function (el) { el.style.display = Number(el.getAttribute('data-step')) === n ? '' : 'none'; });
    document.getElementById('backBtn').style.visibility = n === 1 ? 'hidden' : '';
    document.getElementById('nextBtn').style.visibility = n === STEPS.length ? 'hidden' : '';
    stepbar(); window.scrollTo({ top: 0, behavior: 'auto' });
  }
  window.goStep = function (delta) { saver.flush(); show(Math.min(STEPS.length, Math.max(1, cur + delta))); };
  function stepbar() {
    var bar = document.getElementById('stepbar'); bar.innerHTML = '';
    STEPS.forEach(function (st) {
      var done = st.keys.every(function (k) { return state.missing.indexOf(k) === -1; });
      var b = document.createElement('button'); b.type = 'button';
      b.className = 'st' + (st.n === cur ? ' on' : '') + (done ? ' done' : '');
      b.innerHTML = '<span class="num">' + (done ? '✓' : st.n) + '</span><span class="lbl">' + W.bi(st.en, st.es) + '</span>';
      b.addEventListener('click', function () { saver.flush(); show(st.n); });
      bar.appendChild(b);
    });
  }
  function doneBox() {
    var box = document.getElementById('doneBox'), miss = state.missing;
    if (!miss.length) {
      box.className = 'submit-box ok';
      box.innerHTML = '<div class="done"><b>' + W.bi('All set ✓', 'Todo listo ✓') + '</b>' +
        W.bi('Your coach signs and sends everything from the school page. You can still fix typos until it\'s locked.',
             'Tu coach firma y envía todo desde la página de la escuela. Aún puedes corregir detalles hasta que se bloquee.') + '</div>';
    } else {
      box.className = 'submit-box';
      box.innerHTML = '<div class="miss">' + W.bi('Still needed: ', 'Aún falta: ') +
        W.esc(miss.map(function (k) { return W.t(LABELS[k][0], LABELS[k][1]); }).join(', ')) + '</div>';
    }
  }

  /* ---------- members ---------- */
  function members() {
    var wrap = document.getElementById('members'); wrap.innerHTML = '';
    (state.band.members || []).forEach(function (m, i) { wrap.appendChild(memberRow(m, i)); });
  }
  function memberRow(m, i) {
    var row = document.createElement('div'); row.className = 'rs-row rs-members';
    row.innerHTML = field('name', W.t('Full name', 'Nombre completo'), m.name) +
      selectField('instrument', W.t('Instrument', 'Instrumento'), m.instrument, INSTRUMENTS) +
      field('age', W.t('Age', 'Edad'), m.age) +
      '<div class="f-field rs-other"' + (m.instrument === 'Other' ? '' : ' style="display:none"') + '><label>' +
      W.esc(W.t('Which instrument?', '¿Cuál instrumento?')) + '</label><input type="text" data-k="instrument_other" value="' + W.esc(m.instrument_other || '') + '"></div>';
    row.querySelector('[data-k="instrument"]').addEventListener('change', function (ev) {
      row.querySelector('.rs-other').style.display = ev.target.value === 'Other' ? '' : 'none';
    });
    row.appendChild(killBtn(function () { state.band.members.splice(i, 1); saver.queue('members', state.band.members); members(); }));
    bindRow(row, 'members', i);
    return row;
  }
  window.addMember = function () {
    state.band.members = state.band.members || [];
    if (state.band.members.length >= 25) return;
    state.band.members.push({ name: '', instrument: '', instrument_other: '', age: '' });
    saver.queue('members', state.band.members); members();
  };

  /* ---------- songs ---------- */
  function songs() {
    var wrap = document.getElementById('songs'); wrap.innerHTML = '';
    (state.band.songs || []).forEach(function (s, i) { wrap.appendChild(songRow(s, i)); });
  }
  function songRow(s, i) {
    var row = document.createElement('div'); row.className = 'rs-row rs-songs';
    var opts = ROUNDS.map(function (r) {
      return '<option value="' + r.v + '"' + (s.round === r.v ? ' selected' : '') + ' data-en-label="' + W.esc(r.en) + '" data-es-label="' + W.esc(r.es) + '">' + W.esc(W.isEs() ? r.es : r.en) + '</option>';
    }).join('');
    row.innerHTML = '<div class="f-field"><label>' + W.esc(W.t('Round', 'Ronda')) + '</label><select data-k="round"><option value="">—</option>' + opts + '</select></div>' +
      field('title', W.t('Song title', 'Canción'), s.title) + field('artist', W.t('Original artist', 'Artista original'), s.artist) +
      field('duration', W.t('Approx. length', 'Duración aprox.'), s.duration);
    row.appendChild(killBtn(function () { state.band.songs.splice(i, 1); saver.queue('songs', state.band.songs); songs(); }));
    bindRow(row, 'songs', i);
    return row;
  }
  window.addSong = function () {
    state.band.songs = state.band.songs || [];
    if (state.band.songs.length >= 6) return;
    state.band.songs.push({ round: '', title: '', artist: '', duration: '' });
    saver.queue('songs', state.band.songs); songs();
  };

  function field(key, label, val) {
    return '<div class="f-field"><label>' + W.esc(label) + '</label><input type="text" data-k="' + key + '" value="' + W.esc(val || '') + '"></div>';
  }
  function selectField(key, label, val, options) {
    var opts = options.map(function (o) { return '<option value="' + W.esc(o) + '"' + (val === o ? ' selected' : '') + '>' + W.esc(o) + '</option>'; }).join('');
    return '<div class="f-field"><label>' + W.esc(label) + '</label><select data-k="' + key + '"><option value="">—</option>' + opts + '</select></div>';
  }
  function killBtn(fn) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'rs-x'; b.textContent = '×';
    b.setAttribute('aria-label', W.t('Remove row', 'Eliminar fila')); b.disabled = locked(); b.addEventListener('click', fn);
    return b;
  }
  function bindRow(row, list, index) {
    row.querySelectorAll('[data-k]').forEach(function (el) {
      if (locked()) el.disabled = true;
      el.addEventListener('input', function () { state.band[list][index][el.getAttribute('data-k')] = el.value; saver.queue(list, state.band[list]); });
    });
  }

  /* ---------- shirts ---------- */
  function sizes() {
    var wrap = document.getElementById('sizes'); if (!wrap) return;
    var have = state.band.merch_sizes || {};
    wrap.innerHTML = SIZES.map(function (sz) {
      return '<label class="sz"><span>' + sz + '</span><input type="number" min="0" max="200" inputmode="numeric" data-size="' + sz + '" value="' + (have[sz] ? Number(have[sz]) : '') + '"></label>';
    }).join('');
    wrap.querySelectorAll('[data-size]').forEach(function (inp) {
      if (locked()) inp.disabled = true;
      inp.addEventListener('input', function () {
        var s = state.band.merch_sizes || {}, n = Math.max(0, Math.min(200, parseInt(inp.value, 10) || 0));
        if (n) s[inp.getAttribute('data-size')] = n; else delete s[inp.getAttribute('data-size')];
        state.band.merch_sizes = s; saver.queue('merch_sizes', s); total();
      });
    });
    total();
  }
  function total() {
    var s = state.band.merch_sizes || {}, n = 0; SIZES.forEach(function (sz) { n += Number(s[sz] || 0); });
    document.getElementById('sizesTotal').innerHTML = n
      ? W.bi(n + ' shirts · $' + (n * SHIRT_PRICE) + ' · invoiced to your school', n + ' camisetas · $' + (n * SHIRT_PRICE) + ' · se factura a la escuela')
      : W.bi('No shirts yet', 'Sin camisetas aún');
  }

  window.wantAddon = function (name, btn) {
    btn.disabled = true;
    api('addon', { addon: name }).then(function () { btn.innerHTML = W.bi('We’ll be in touch ✓', 'Te contactaremos ✓'); }).catch(function () { btn.disabled = false; });
  };

  boot();
})();
