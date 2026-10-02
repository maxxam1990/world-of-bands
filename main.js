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
  earlyEnd: Date.parse('2026-09-29T23:59:59-04:00'),
  codeEnd:  Date.parse('2026-10-03T23:59:59-04:00'),   /* band codes [BAND]25 = $10 off */
  gaEnd:    Date.parse('2026-10-04T10:00:00-04:00')
};
function wobTier(){
  var n = Date.now();
  return n <= WOB_TIERS.earlyEnd ? 'early' : (n < WOB_TIERS.gaEnd ? 'ga' : 'door');
}
/* finer phase for copy + the price countdown: the band-code window sits inside GA */
function wobPhase(){
  var n = Date.now();
  if(n <= WOB_TIERS.earlyEnd) return 'early';
  if(n <= WOB_TIERS.codeEnd)  return 'code';
  if(n <  WOB_TIERS.gaEnd)    return 'ga';
  return 'door';
}
(function(){
  var t = wobTier(), p = wobPhase(), order = ['early','ga','door'], cur = order.indexOf(t);
  document.querySelectorAll('[data-tier]').forEach(function(el){
    var i = order.indexOf(el.getAttribute('data-tier'));
    el.classList.toggle('now',  i === cur);
    el.classList.toggle('past', i <  cur);
    el.classList.toggle('next', i >  cur);
  });
  /* the public countdown speaks to everyone: during the band-code window it still
     counts to the $35 deadline (codes have their own note); labels follow the tier */
  document.querySelectorAll('[data-tier-only]').forEach(function(el){
    el.hidden = el.getAttribute('data-tier-only') !== t;
  });
  /* anything that only makes sense while band codes are valid */
  document.querySelectorAll('[data-until="code"]').forEach(function(el){
    el.hidden = Date.now() > WOB_TIERS.codeEnd;
  });
  /* shown once Early Bird is over (e.g. the one-line "ended" note) */
  document.querySelectorAll('[data-after-early]').forEach(function(el){
    el.hidden = t === 'early';
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

/* ---------- Checkout links: straight to the full-screen SimpleTix checkout ----------
   WOB_CHECKOUT is the same ticket page SimpleTix's own event page opens on
   "Get Tickets" (fastest on phones and inside Instagram/Facebook browsers).
   UTMs + fbclid from the landing URL ride along so ad clicks stay traceable. */
var WOB_CHECKOUT = 'https://embed.prod.simpletix.com/5e7a7eda-f3ff-45b0-a45b-bcb2cab89974/291875';
var WOB_UTM = (function(){
  var keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'], got = {};
  try{ var q = new URLSearchParams(location.search); keys.forEach(function(k){ var v = q.get(k); if(v) got[k] = v; }); }catch(e){}
  try{
    if(Object.keys(got).length) sessionStorage.setItem('wob-utm', JSON.stringify(got));
    else got = JSON.parse(sessionStorage.getItem('wob-utm') || '{}') || {};
  }catch(e){}
  return got;
})();
function wobCheckoutUrl(where){
  var u, t = {};
  try{ u = new URL(WOB_CHECKOUT); }catch(e){ return WOB_CHECKOUT; }
  Object.keys(WOB_UTM).forEach(function(k){ t[k] = WOB_UTM[k]; });
  if(!t.utm_source){ t.utm_source = 'worldofbands.com'; t.utm_medium = 'website'; t.utm_campaign = 'wob2026'; }
  if(!t.utm_content) t.utm_content = where;
  Object.keys(t).forEach(function(k){ u.searchParams.set(k, t[k]); });
  return u.toString();
}
function wobWireCheckout(a, where){
  a.href = wobCheckoutUrl(where);
  a.addEventListener('click', function(){
    wobTrack('InitiateCheckout', { value: wobTier() === 'door' ? 40 : 35, currency: 'USD', content_name: 'World of Bands 2026 pass' });
  });
}
/* Instagram / Facebook / Messenger / TikTok / Snapchat in-app browsers */
var WOB_IN_APP = /Instagram|FBAN|FBAV|FB_IAB|FB4A|FBIOS|musical_ly|BytedanceWebview|TikTok|Snapchat/i.test(navigator.userAgent || '');
(function(){
  document.querySelectorAll('a[data-checkout]').forEach(function(a){ wobWireCheckout(a, a.getAttribute('data-checkout')); });

  /* tickets page inside an in-app browser: skip the embedded iframe checkout and
     send every Buy button to the full-screen checkout (one tap, no nested scrolling) */
  var box = document.getElementById('inapp-buy'), shell = document.querySelector('.buy-shell');
  if(WOB_IN_APP && box && shell){
    var ifr = shell.querySelector('iframe'), holder = ifr ? ifr.parentNode : null;
    if(ifr) holder.removeChild(ifr);   /* stops it loading in the app browser */
    shell.hidden = true;
    box.hidden = false;
    document.querySelectorAll('a[href="#buy"]').forEach(function(a){
      if(a.id === 'show-embed') return;
      wobWireCheckout(a, 'inapp_' + (a.closest('.hero') ? 'hero' : 'page'));
    });
    var show = document.getElementById('show-embed');
    if(show) show.addEventListener('click', function(ev){
      ev.preventDefault();
      if(ifr && !ifr.parentNode) holder.appendChild(ifr);
      shell.hidden = false; box.hidden = true;
      shell.scrollIntoView();
    });
  }

  /* sticky bar (phones): out of the way while the checkout section is on screen */
  var bar = document.getElementById('tix-bar'), buy = document.getElementById('buy'), buyOnScreen = false;
  if(bar && buy && 'IntersectionObserver' in window){
    new IntersectionObserver(function(es){
      es.forEach(function(e){ buyOnScreen = e.isIntersecting; bar.classList.toggle('off', buyOnScreen); });
    }, { threshold: 0.05 }).observe(buy);
  }
  /* ...and while someone is typing in a form (keeps the keyboard area clear) */
  if(bar){
    document.addEventListener('focusin', function(e){ if(e.target.matches && e.target.matches('input,textarea,select')) bar.classList.add('off'); });
    document.addEventListener('focusout', function(){ if(!buyOnScreen) bar.classList.remove('off'); });
  }
})();

/* ---------- Restore language (/boletos, /comprar or ?lang=es open in Spanish) ---------- */
try{
  var saved = localStorage.getItem('wob-lang');
  if(saved === 'es') setLang('es');
  else if(!saved && (/^\/(boletos|comprar)/.test(location.pathname) || /[?&]lang=es(&|$)/.test(location.search))) setLang('es');
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
