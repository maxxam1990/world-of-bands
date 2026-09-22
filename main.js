/* ============================================================
   WORLD OF BANDS FLORIDA — main.js
   Language toggle · mobile nav · scroll reveal · nav highlight
   gallery lightbox · registration form
============================================================ */

/* ---------- Language toggle (EN/ES) ---------- */
function setLang(lang){
  document.documentElement.classList.toggle('es', lang === 'es');
  document.documentElement.lang = lang === 'es' ? 'es' : 'en';
  ['btn-en','btn-es','mob-btn-en','mob-btn-es'].forEach(function(id){
    var b = document.getElementById(id);
    if(b) b.classList.toggle('on', id.endsWith(lang));
  });
  // translate <option> labels (options can't hold spans)
  document.querySelectorAll('option[data-en-label]').forEach(function(o){
    o.textContent = lang === 'es' ? o.getAttribute('data-es-label') : o.getAttribute('data-en-label');
  });
  try{ localStorage.setItem('wob-lang', lang); }catch(e){}
}

/* ---------- Mobile nav ---------- */
function toggleMob(){
  document.getElementById('mob-nav').classList.toggle('open');
}
window.addEventListener('resize', function(){
  if(window.innerWidth > 840) document.getElementById('mob-nav').classList.remove('open');
});

/* ---------- Scroll reveal ---------- */
var io = new IntersectionObserver(function(entries){
  entries.forEach(function(e){
    if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
  });
},{threshold:.12});
document.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });

/* ---------- Active nav link ---------- */
var sections = Array.prototype.slice.call(document.querySelectorAll('section[id], header[id]'));
var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
window.addEventListener('scroll', function(){
  var y = window.scrollY + 120, current = '';
  sections.forEach(function(s){ if(s.offsetTop <= y) current = s.id; });
  navLinks.forEach(function(a){
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
},{passive:true});

/* ---------- Marquee: duplicate track for seamless loop ---------- */
(function(){
  var t = document.getElementById('marquee-track');
  if(t) t.innerHTML += t.innerHTML;
})();

/* ---------- Gallery lightbox ---------- */
document.querySelectorAll('.gal a').forEach(function(a){
  a.addEventListener('click', function(ev){
    ev.preventDefault();
    document.getElementById('lb-img').src = a.getAttribute('href');
    document.getElementById('lightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
  });
});
function closeLb(){
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeLb(); });

/* ---------- Click-to-play YouTube facades ---------- */
document.querySelectorAll('.vid[data-yt]').forEach(function(btn){
  btn.addEventListener('click', function(){
    var id = btn.getAttribute('data-yt');
    var ifr = document.createElement('iframe');
    ifr.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
    ifr.title = 'YouTube video';
    ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    ifr.allowFullscreen = true;
    btn.innerHTML = '';
    btn.appendChild(ifr);
    btn.style.cursor = 'default';
  }, { once: true });
});

/* ---------- Registration form (Netlify Forms) ----------
   Same pattern as the TWOM website: data-netlify form registered at
   deploy time + fetch POST (urlencoded) + inline success state.   */
var regForm = document.getElementById('reg-form');
if(regForm) regForm.addEventListener('submit', function(ev){
  ev.preventDefault();
  var f = ev.target;
  var get = function(id){ return (document.getElementById(id).value || '').trim(); };
  var name = get('f-name'), role = get('f-role'), city = get('f-city'),
      email = get('f-email'), phone = get('f-phone'), org = get('f-org'),
      bands = get('f-bands'), msg = get('f-msg'),
      consent = document.getElementById('f-consent').checked;
  var err = document.getElementById('f-error');
  var netErr = document.getElementById('f-neterror');
  var okEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  netErr.style.display = 'none';
  if(!name || !role || !city || !okEmail || !consent){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  var isEs = document.documentElement.classList.contains('es');
  var body = new URLSearchParams({
    'form-name': 'wob-interest',
    'name': name,
    'role': role,
    'org': org,
    'city': city,
    'email': email,
    'phone': phone,
    'bands': bands,
    'msg': msg,
    'language': isEs ? 'Spanish' : 'English'
  });

  var btn = f.querySelector('button[type="submit"]');
  btn.disabled = true;
  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  }).then(function(res){
    if(!res.ok) throw new Error('Form submission failed: ' + res.status);
    f.style.display = 'none';
    document.getElementById('form-ok').classList.add('show');
  }).catch(function(){
    netErr.style.display = 'block';
    btn.disabled = false;
  });
});

/* ---------- Countdown to event day ----------
   Sunday, October 4, 2026 — doors 9:00 AM, opening ceremony 10:00 AM ET. */
(function(){
  var target = new Date('2026-10-04T10:00:00-04:00').getTime();
  var elD = document.getElementById('cd-d'), elH = document.getElementById('cd-h'),
      elM = document.getElementById('cd-m'), elS = document.getElementById('cd-s'),
      wrap = document.getElementById('countdown'), live = document.getElementById('cd-live');
  if(!wrap) return;
  var pad = function(n){ return n < 10 ? '0' + n : '' + n; };
  function tick(){
    var diff = target - Date.now();
    if(diff <= 0){
      wrap.style.display = 'none';
      live.style.display = 'block';
      clearInterval(timer);
      return;
    }
    var d = Math.floor(diff / 86400000),
        h = Math.floor(diff % 86400000 / 3600000),
        m = Math.floor(diff % 3600000 / 60000),
        s = Math.floor(diff % 60000 / 1000);
    elD.textContent = d;
    elH.textContent = pad(h);
    elM.textContent = pad(m);
    elS.textContent = pad(s);
  }
  tick();
  var timer = setInterval(tick, 1000);
})();

/* ---------- Ticket pricing tiers (shared by index + tickets page) ----------
   Early Bird $25 through Sep 28 11:59 PM ET · $35 online until Oct 4 10:00 AM ET
   · $40 online/at the door after that. Mirrors the SimpleTix ticket-type windows. */
var WOB_TIERS = {
  earlyEnd: Date.parse('2026-09-28T23:59:59-04:00'),
  gaEnd:    Date.parse('2026-10-04T10:00:00-04:00')
};
function wobTier(){
  var n = Date.now();
  return n <= WOB_TIERS.earlyEnd ? 'early' : (n < WOB_TIERS.gaEnd ? 'ga' : 'door');
}
(function(){
  var t = wobTier(), order = ['early','ga','door'], cur = order.indexOf(t);
  document.querySelectorAll('[data-tier]').forEach(function(el){
    var i = order.indexOf(el.getAttribute('data-tier'));
    el.classList.toggle('now',  i === cur);
    el.classList.toggle('past', i <  cur);
    el.classList.toggle('next', i >  cur);
  });
  document.querySelectorAll('[data-tier-only]').forEach(function(el){
    el.hidden = el.getAttribute('data-tier-only') !== t;
  });

  /* price-change countdown on the tickets page */
  var box = document.getElementById('pcd');
  if(!box) return;
  var target = t === 'early' ? WOB_TIERS.earlyEnd : (t === 'ga' ? WOB_TIERS.gaEnd : 0);
  var elD = document.getElementById('pc-d'), elH = document.getElementById('pc-h'),
      elM = document.getElementById('pc-m'), elS = document.getElementById('pc-s');
  var pad = function(n){ return n < 10 ? '0' + n : '' + n; };
  function tick(){
    var diff = target - Date.now();
    if(diff <= 0){ box.hidden = true; clearInterval(timer); return; }
    elD.textContent = Math.floor(diff / 86400000);
    elH.textContent = pad(Math.floor(diff % 86400000 / 3600000));
    elM.textContent = pad(Math.floor(diff % 3600000 / 60000));
    elS.textContent = pad(Math.floor(diff % 60000 / 1000));
  }
  if(!target){ box.hidden = true; return; }
  tick();
  var timer = setInterval(tick, 1000);
})();

/* ---------- Restore language ---------- */
try{
  var saved = localStorage.getItem('wob-lang');
  if(saved === 'es') setLang('es');
}catch(e){}
