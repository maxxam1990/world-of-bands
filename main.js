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
document.getElementById('reg-form').addEventListener('submit', function(ev){
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

/* ---------- Restore language ---------- */
try{
  var saved = localStorage.getItem('wob-lang');
  if(saved === 'es') setLang('es');
}catch(e){}
