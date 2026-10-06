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
  if(typeof syncSelfVideos === 'function') syncSelfVideos();
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

/* ---------- Self-hosted trailer (EN/ES): plays the visible language; a language switch mid-play switches the video ---------- */
function svVisible(box){
  var es = document.documentElement.classList.contains('es');
  return box.querySelector(es ? 'video[data-es]' : 'video[data-en]');
}
function svPlay(box){
  var v = svVisible(box); if(!v) return;
  box.classList.add('playing');
  v.controls = true;
  var p = v.play(); if(p && p.catch) p.catch(function(){});
  if(window.fbq) fbq('trackCustom', 'TrailerPlay', { lang: v.hasAttribute('data-es') ? 'es' : 'en' });
}
function syncSelfVideos(){
  document.querySelectorAll('.self-vid').forEach(function(box){
    var vids = box.querySelectorAll('video'), was = false;
    vids.forEach(function(v){ if(!v.paused){ was = true; v.pause(); } });
    if(was) svPlay(box);  /* the toggle tap is a user gesture, so the other language can start right away */
    else { box.classList.remove('playing'); vids.forEach(function(v){ v.controls = false; }); }
  });
}
document.querySelectorAll('.self-vid').forEach(function(box){
  box.querySelector('.sv-start').addEventListener('click', function(){ svPlay(box); });
  box.querySelectorAll('video').forEach(function(v){
    v.addEventListener('ended', function(){ box.classList.remove('playing'); v.controls = false; v.load(); });
  });
});

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

/* ---------- Meta Pixel: OFF until you paste your Pixel ID ----------
   Events Manager → Data sources → your pixel → copy the ID (15–16 digits),
   paste it between the quotes, commit, push. Empty = nothing loads. */
var WOB_META_PIXEL_ID = '';
if(WOB_META_PIXEL_ID){
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', WOB_META_PIXEL_ID);
  fbq('track', 'PageView');
}
function wobTrack(name, params){ try{ if(window.fbq) window.fbq('track', name, params || {}); }catch(e){} }

/* ---------- Restore language (/boletos, /comprar or ?lang=es open in Spanish) ---------- */
try{
  var saved = localStorage.getItem('wob-lang');
  if(saved === 'es') setLang('es');
  else if(!saved && (/^\/(boletos|comprar|resultados|vendedores)/.test(location.pathname) || /[?&]lang=es(&|$)/.test(location.search))) setLang('es');
}catch(e){}

/* ---------- Homepage loops: play only while on screen; posters only for reduced motion / data saver ---------- */
(function(){
  var vids = document.querySelectorAll('video[data-loop]'); if(!vids.length) return;
  var still = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || (navigator.connection && navigator.connection.saveData);
  if(still || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ var v = e.target; if(e.isIntersecting){ var p = v.play(); if(p && p.catch) p.catch(function(){}); } else { v.pause(); } });
  }, { threshold: 0.35 });
  vids.forEach(function(v){ io.observe(v); });
})();

/* ---------- "Keep me posted" → Mailchimp audience "World of Bands Florida" ----------
   JSONP to Mailchimp's post-json endpoint (no page reload, inline success). If Mailchimp
   cannot be reached, the email falls back to the Netlify form "wob-updates" so no lead is lost. */
var WOB_MC = {
  url: 'https://theworldofmusicschool.us5.list-manage.com/subscribe/post-json?u=c664f83591156fef1c001bfeb&id=d4698be95b&f_id=00febeedf0',
  honeypot: 'b_c664f83591156fef1c001bfeb_d4698be95b',
  tag: '4539232'   /* "site signup" */
};
function wobMcSubscribe(email, cb){
  var name = 'wob_mc_' + Date.now(), done = false;
  var s = document.createElement('script');
  function finish(err, res){ if(done) return; done = true; try{ delete window[name]; }catch(e){ window[name] = undefined; } if(s.parentNode) s.parentNode.removeChild(s); cb(err, res); }
  window[name] = function(res){ finish(null, res); };
  s.onerror = function(){ finish(new Error('load')); };
  s.src = WOB_MC.url + '&EMAIL=' + encodeURIComponent(email) + '&tags=' + WOB_MC.tag + '&' + WOB_MC.honeypot + '=&c=' + name;
  document.head.appendChild(s);
  setTimeout(function(){ finish(new Error('timeout')); }, 8000);
}
(function(){
  var f = document.getElementById('stay-form'); if(!f) return;
  f.addEventListener('submit', function(ev){
    ev.preventDefault();
    var email = (document.getElementById('s-email').value || '').trim();
    var err = document.getElementById('s-error'), net = document.getElementById('s-neterror');
    net.style.display = 'none';
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ err.style.display = 'block'; return; }
    err.style.display = 'none';
    var btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
    var src = f.querySelector('input[name="source"]');
    var isEs = document.documentElement.classList.contains('es');
    function ok(){ f.style.display = 'none'; document.getElementById('stay-ok').classList.add('show'); }
    function fail(){ net.style.display = 'block'; btn.disabled = false; }
    function netlifyFallback(){
      var body = new URLSearchParams({ 'form-name': 'wob-updates', 'email': email, 'source': src ? src.value : 'site', 'language': isEs ? 'Spanish' : 'English' });
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
        .then(function(r){ if(!r.ok) throw new Error(r.status); ok(); }).catch(fail);
    }
    wobMcSubscribe(email, function(e, res){
      if(e || !res){ netlifyFallback(); return; }
      if(res.result === 'success' || /already subscribed/i.test(res.msg || '')){ ok(); return; }
      /* Mailchimp rejected the address (typo, blocked domain...): show its reason, keep the form */
      err.textContent = (res.msg || '').replace(/^\d+\s*-\s*/, '').replace(/<[^>]+>/g, '') || (isEs ? 'Por favor ingresa un correo válido.' : 'Please enter a valid email.');
      err.style.display = 'block'; btn.disabled = false;
    });
  });
})();
