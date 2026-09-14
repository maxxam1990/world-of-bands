/* ============================================================
   WORLD OF BANDS FLORIDA — school page (the coach)
   Band links + progress · school logo · people · event day ·
   one signature for every band · extras.
============================================================ */
(function () {
  'use strict';
  var W = window.WOB;
  var TOKEN = (location.pathname.match(/\/school\/([a-f0-9]{20})\/?$/i) || [])[1] || '';
  var api = W.makeApi('/api/school', TOKEN);
  var state = { school: null, assets: [], bands: [], missing: [] };

  var SLOTS = [{ kind: 'school_logo', max: 1, en: 'School logo', es: 'Logo de la escuela',
                 specEn: 'PNG, transparent background (or SVG)', specEs: 'PNG con fondo transparente (o SVG)', accept: 'image/png,image/svg+xml' }];
  var LABELS = { school_logo: ['school logo', 'logo de la escuela'], coordinator: ['event coordinator', 'coordinador del evento'], contact: ['school contact', 'contacto de la escuela'],
                 emergency: ['emergency contact', 'contacto de emergencia'], releases: ['the four permissions', 'los cuatro permisos'], signature: ['your signature', 'tu firma'] };
  var BAND_LABELS = { logo: ['logo', 'logo'], band_photo: ['photo', 'foto'], bio_en: ['bio', 'bio'], members: ['members', 'integrantes'], coach: ['coach', 'coach'], songs: ['songs', 'canciones'] };

  function locked() { return state.school.status === 'locked'; }
  var saver = W.autosave({ api: api, set: function (f, v) { state.school[f] = v; }, onSaved: apply });
  var ups = W.uploads({ api: api, slots: SLOTS, assets: function () { return state.assets; }, locked: locked, onChange: apply });

  function boot() {
    if (!TOKEN) return gate();
    api('load').then(function (d) {
      state = d;
      document.getElementById('loading').style.display = 'none';
      document.getElementById('app').style.display = '';
      document.getElementById('savebar').style.display = '';
      render();
    }).catch(gate);
  }
  function gate() { document.getElementById('loading').style.display = 'none'; document.getElementById('gate').style.display = ''; }

  function apply(d) { state = d; header(); bands(); submitBox(); }

  function header() {
    var s = state.school;
    document.getElementById('schoolName').textContent = s.school_name;
    var pill = document.getElementById('statusPill');
    pill.className = 'pill ' + (s.status === 'locked' ? 'pill-lock' : s.status === 'submitted' ? 'pill-done' : 'pill-open');
    pill.textContent = s.status === 'locked' ? W.t('Locked', 'Bloqueado') : s.status === 'submitted' ? W.t('Sent', 'Enviado') : W.t('In progress', 'En progreso');
  }

  function render() {
    header();
    if (locked()) {
      document.getElementById('lockNote').style.display = '';
      document.getElementById('introLine').style.display = 'none';
      document.querySelectorAll('.step input, .step textarea, .step button').forEach(function (el) { if (!el.closest('#addonsCard') && !el.classList.contains('a-copy')) el.disabled = true; });
    }
    saver.fill(state.school);
    ups.render(); bands(); submitBox(); W.applyPlaceholders();
  }

  /* ---------- band cards ---------- */
  function bands() {
    var wrap = document.getElementById('bands'); wrap.innerHTML = '';
    state.bands.forEach(function (b, i) {
      var link = location.origin + b.portal_url;
      var card = document.createElement('div');
      card.className = 'band-card' + (b.missing.length ? '' : ' ok');
      card.innerHTML =
        '<div class="bc-top"><span class="bc-n">' + (i + 1) + '</span>' +
        '<input class="bc-name" type="text" maxlength="160" value="' + W.esc(b.band_name) + '" placeholder="' +
          W.esc(W.t('Band name', 'Nombre de la banda')) + '"' + (locked() ? ' disabled' : '') + '>' +
        '<span class="pill ' + (b.missing.length ? 'pill-open' : 'pill-done') + '">' + b.complete_pct + '%</span></div>' +
        '<div class="a-mini" style="width:100%"><i style="width:' + b.complete_pct + '%"></i></div>' +
        '<div class="bc-meta">' + (b.missing.length
          ? W.bi('Still needs: ', 'Aún falta: ') + W.esc(b.missing.map(function (k) { return W.t(BAND_LABELS[k][0], BAND_LABELS[k][1]); }).join(', '))
          : W.bi('Complete ✓ · ' + b.members_count + ' members · ' + b.songs_count + ' songs', 'Completo ✓ · ' + b.members_count + ' integrantes · ' + b.songs_count + ' canciones')) +
        (b.shirts ? ' · ' + W.bi(b.shirts + ' shirts', b.shirts + ' camisetas') : '') + '</div>' +
        '<div class="bc-link"><code>' + W.esc(link) + '</code></div>' +
        '<div class="bc-actions"><a class="btn btn-blue" href="' + W.esc(b.portal_url) + '" target="_blank" rel="noopener">' + W.bi('Open band page', 'Abrir página') + '</a>' +
        '<button type="button" class="btn btn-ghost a-copy-btn">' + W.bi('Copy link', 'Copiar enlace') + '</button></div>';
      var name = card.querySelector('.bc-name'), t = null;
      name.addEventListener('input', function () {
        W.saveState('saving'); clearTimeout(t);
        t = setTimeout(function () { api('name-band', { band_id: b.id, band_name: name.value }).then(function (d) { W.saveState('saved'); state = d; submitBox(); }).catch(function () { W.saveState('err'); }); }, 900);
      });
      card.querySelector('.a-copy-btn').addEventListener('click', function () {
        var btn = this;
        navigator.clipboard.writeText(link).then(function () { btn.innerHTML = W.bi('Copied ✓', 'Copiado ✓'); setTimeout(function () { btn.innerHTML = W.bi('Copy link', 'Copiar enlace'); }, 1600); });
      });
      wrap.appendChild(card);
    });
  }

  /* ---------- submit ---------- */
  function submitBox() {
    var s = state.school, box = document.getElementById('submitMissing');
    var sent = s.status !== 'open';
    document.getElementById('submitBtn').style.display = sent ? 'none' : '';
    document.getElementById('doneBox').style.display = sent ? '' : 'none';
    var parts = state.missing.map(function (k) { return W.t(LABELS[k][0], LABELS[k][1]); });
    state.bands.forEach(function (b) { if (b.missing.length) parts.push((b.band_name || W.t('unnamed band', 'banda sin nombre')) + ' (' + b.complete_pct + '%)'); });
    if (!state.bands.length) parts.push(W.t('no bands', 'sin bandas'));
    if (parts.length && !sent) { box.style.display = ''; box.innerHTML = W.bi('Still needed: ', 'Aún falta: ') + W.esc(parts.join(', ')); }
    else box.style.display = 'none';
    if (!locked()) document.getElementById('submitBtn').disabled = parts.length > 0;
  }
  window.submitAll = function () {
    saver.flush().then(function () {
      return api('submit');
    }).then(function (d) { state = d; render(); })
      .catch(function (err) { if (err.status === 422) { api('load').then(apply); } else alert(W.t('Could not send. Please try again.', 'No se pudo enviar. Intenta de nuevo.')); });
  };

  window.wantAddon = function (name, btn, noteId) {
    btn.disabled = true;
    var note = noteId ? (document.getElementById(noteId).value || '').trim() : '';
    api('addon', { addon: name, note: note }).then(function () { btn.innerHTML = W.bi('We’ll be in touch ✓', 'Te contactaremos ✓'); }).catch(function () { btn.disabled = false; });
  };

  boot();
})();
