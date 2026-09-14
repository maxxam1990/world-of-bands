/* ============================================================
   WORLD OF BANDS FLORIDA — shared portal helpers
   Language · API · autosave state · upload cards
   Loaded by band.html (portal.js) and school.html (school.js).
============================================================ */
(function () {
  'use strict';
  var W = window.WOB = {};

  /* ---------- language ---------- */
  W.isEs = function () { return document.documentElement.classList.contains('es'); };
  W.t = function (en, es) { return W.isEs() ? es : en; };
  W.applyPlaceholders = function () {
    document.querySelectorAll('[data-en-ph]').forEach(function (el) {
      el.placeholder = W.isEs() ? (el.getAttribute('data-es-ph') || '') : el.getAttribute('data-en-ph');
    });
  };
  window.setLang = function (lang) {
    document.documentElement.classList.toggle('es', lang === 'es');
    document.documentElement.lang = lang === 'es' ? 'es' : 'en';
    ['btn-en', 'btn-es'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.classList.toggle('on', id.endsWith(lang));
    });
    W.applyPlaceholders();
    document.querySelectorAll('option[data-en-label]').forEach(function (o) {
      o.textContent = lang === 'es' ? o.getAttribute('data-es-label') : o.getAttribute('data-en-label');
    });
    try { localStorage.setItem('wob-lang', lang); } catch (e) {}
  };
  try { if (localStorage.getItem('wob-lang') === 'es') setLang('es'); } catch (e) {}

  /* ---------- utils ---------- */
  W.esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  W.kb = function (n) {
    n = Number(n || 0);
    if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
    if (n >= 1024) return Math.round(n / 1024) + ' KB';
    return n + ' B';
  };
  W.bi = function (en, es) { return '<span data-en>' + W.esc(en) + '</span><span data-es>' + W.esc(es) + '</span>'; };

  /* ---------- api ---------- */
  W.makeApi = function (url, token) {
    return function (action, payload) {
      return fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, action: action, payload: payload || {} })
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) { var e = new Error(data.error || 'error'); e.data = data; e.status = res.status; throw e; }
          return data;
        });
      });
    };
  };

  /* ---------- save indicator ---------- */
  W.saveState = function (kind) {
    var el = document.getElementById('saveState'), txt = document.getElementById('saveText');
    if (!el) return;
    el.className = 'state ' + (kind === 'saving' ? 'saving' : kind === 'saved' ? 'saved' : 'err');
    var m = {
      saving: ['Saving…', 'Guardando…'],
      saved:  ['Saved', 'Guardado'],
      err:    ['Could not save — check your connection', 'No se pudo guardar — revisa tu conexión'],
      locked: ['Locked by the organisers', 'Bloqueado por los organizadores']
    }[kind];
    txt.innerHTML = W.bi(m[0], m[1]);
  };

  /* ---------- autosave wiring: fields with data-f ----------
     opts: { api, get() -> record, set(field,val), onSaved(data) } */
  W.autosave = function (opts) {
    var pending = {}, timer = null;
    document.addEventListener('input', onEdit, true);
    document.addEventListener('change', onEdit, true);
    function onEdit(ev) {
      var el = ev.target;
      if (!el.hasAttribute || !el.hasAttribute('data-f')) return;
      var field = el.getAttribute('data-f');
      var val = el.type === 'checkbox' ? el.checked : el.value;
      opts.set(field, val);
      pending[field] = val;
      queue();
    }
    function queue() { W.saveState('saving'); clearTimeout(timer); timer = setTimeout(flush, 900); }
    function flush() {
      if (!Object.keys(pending).length) { W.saveState('saved'); return Promise.resolve(); }
      var payload = pending; pending = {};
      return opts.api('save', payload).then(function (data) {
        W.saveState('saved'); opts.onSaved(data);
      }).catch(function (err) {
        Object.assign(pending, payload);
        W.saveState(err.status === 423 ? 'locked' : 'err');
      });
    }
    window.addEventListener('beforeunload', function (e) {
      if (Object.keys(pending).length) { e.preventDefault(); e.returnValue = ''; }
    });
    return {
      queue: function (field, val) { pending[field] = val; queue(); },
      flush: function () { clearTimeout(timer); return flush(); },
      fill: function (rec) {
        document.querySelectorAll('[data-f]').forEach(function (el) {
          var v = rec[el.getAttribute('data-f')];
          if (el.type === 'checkbox') el.checked = v === true; else el.value = v == null ? '' : v;
        });
      }
    };
  };

  /* ---------- upload cards ----------
     opts: { api, slots:[{kind,max,en,es,specEn,specEs,accept}], assets() -> [], locked() -> bool, onChange(data) }
     renders into every [data-upload-kinds] container on the page */
  var MAX_BYTES = 15 * 1024 * 1024;
  W.uploads = function (opts) {
    function render() {
      document.querySelectorAll('[data-upload-kinds]').forEach(function (wrap) {
        var kinds = wrap.getAttribute('data-upload-kinds').split(',');
        wrap.innerHTML = '';
        opts.slots.forEach(function (slot) {
          if (kinds.indexOf(slot.kind) === -1) return;
          var mine = opts.assets().filter(function (a) { return a.kind === slot.kind; });
          mine.forEach(function (a) { wrap.appendChild(filled(slot, a)); });
          if (mine.length < slot.max) wrap.appendChild(empty(slot, mine.length));
        });
      });
    }
    function empty(slot, have) {
      var d = document.createElement('div');
      d.className = 'up';
      var counter = slot.max > 1 ? ' (' + have + '/' + slot.max + ')' : '';
      d.innerHTML =
        '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/></svg>' +
        '<div class="k">' + W.bi(slot.en + counter, slot.es + counter) + '</div>' +
        '<div class="spec">' + W.bi(slot.specEn, slot.specEs) + '</div>' +
        '<div class="cta">' + W.bi('Click or drag a file here', 'Haz clic o arrastra un archivo') + '</div>' +
        '<div class="bar" style="display:none"><i></i></div>';
      var input = document.createElement('input');
      input.type = 'file'; input.accept = slot.accept;
      if (opts.locked()) input.disabled = true;
      input.addEventListener('change', function () { if (input.files && input.files[0]) upload(slot, input.files[0], d); });
      d.appendChild(input);
      d.addEventListener('dragover', function (e) { e.preventDefault(); d.classList.add('drag'); });
      d.addEventListener('dragleave', function () { d.classList.remove('drag'); });
      d.addEventListener('drop', function (e) {
        e.preventDefault(); d.classList.remove('drag');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) upload(slot, e.dataTransfer.files[0], d);
      });
      return d;
    }
    function filled(slot, asset) {
      var d = document.createElement('div');
      d.className = 'up filled';
      var preview = asset.mime === 'application/pdf' || !asset.url
        ? '<div class="pdf">' + (asset.mime === 'application/pdf' ? 'PDF' : 'FILE') + '</div>'
        : '<img class="thumb" src="' + W.esc(asset.url) + '" alt="" onerror="this.outerHTML=\'<div class=&quot;pdf&quot;>FILE</div>\'">';
      d.innerHTML = '<div class="k">' + W.bi(slot.en, slot.es) + '</div>' + preview +
        '<div class="fname">' + W.esc(asset.filename || '') + ' · ' + W.kb(asset.size_bytes) + '</div>';
      if (!opts.locked()) {
        var kill = document.createElement('button');
        kill.type = 'button'; kill.className = 'kill';
        kill.innerHTML = W.bi('Replace', 'Reemplazar');
        kill.addEventListener('click', function () {
          kill.disabled = true;
          opts.api('remove', { id: asset.id }).then(function (data) { opts.onChange(data); render(); })
            .catch(function () { kill.disabled = false; });
        });
        d.appendChild(kill);
      }
      return d;
    }
    function upload(slot, file, card) {
      if (file.size > MAX_BYTES) {
        alert(W.t('That file is larger than 15 MB. Please export a smaller version.', 'Ese archivo pesa más de 15 MB. Exporta una versión más pequeña.'));
        return;
      }
      var bar = card.querySelector('.bar'), fill = card.querySelector('.bar i');
      bar.style.display = ''; W.saveState('saving');
      opts.api('sign-upload', { kind: slot.kind, mime: file.type, size: file.size, filename: file.name })
        .then(function (res) {
          return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('PUT', res.uploadUrl, true);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.upload.onprogress = function (e) { if (e.lengthComputable) fill.style.width = Math.round((e.loaded / e.total) * 100) + '%'; };
            xhr.onload = function () { (xhr.status >= 200 && xhr.status < 300) ? resolve(res.path) : reject(new Error('upload ' + xhr.status)); };
            xhr.onerror = function () { reject(new Error('network')); };
            xhr.send(file);
          });
        })
        .then(function (path) { return opts.api('attach', { kind: slot.kind, path: path, filename: file.name, mime: file.type, size: file.size }); })
        .then(function (data) { opts.onChange(data); render(); W.saveState('saved'); })
        .catch(function (err) {
          bar.style.display = 'none'; W.saveState('err');
          alert(err.data && err.data.error === 'bad_type'
            ? W.t('That file type isn’t allowed here. Logos must be PNG (transparent) or SVG; photos JPG, PNG or WEBP.',
                  'Ese tipo de archivo no está permitido aquí. Los logos deben ser PNG (transparente) o SVG; las fotos JPG, PNG o WEBP.')
            : W.t('Upload failed. Please try again.', 'La subida falló. Intenta de nuevo.'));
        });
    }
    return { render: render };
  };
})();
