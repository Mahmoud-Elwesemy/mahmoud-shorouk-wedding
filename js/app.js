import { CONFIG } from './config.js';
import { I18N } from './i18n.js';
import { saveRsvp } from './rsvp-store.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const safe = (fn) => { try { return fn(); } catch { /* storage/blocked */ } };

/* ------------------------------------------------------------------ */
/*  اللغة                                                             */
/* ------------------------------------------------------------------ */
const params = new URLSearchParams(location.search);
let lang = params.get('lang') || safe(() => localStorage.getItem('lang')) || 'ar';
if (!I18N[lang]) lang = 'ar';
const t = (k) => I18N[lang][k] ?? k;
// أرقام لاتينية (10 · 2027 · 7:00) بدل الهندية: شكلها أنضف مع خط Cormorant
const locale = () => (lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US');

function dateParts(iso) {
  const d = new Date(iso);
  const f = (o) => new Intl.DateTimeFormat(locale(), { timeZone: CONFIG.timeZone, ...o }).format(d);
  return { day: f({ day: 'numeric' }), month: f({ month: 'long' }), year: f({ year: 'numeric', useGrouping: false }), weekday: f({ weekday: 'long' }) };
}
const fmtTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(Date.UTC(2000, 0, 1, h, m));
  return new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' }).format(d);
};

/* ------------------------------------------------------------------ */
/*  بناء الصفحة                                                       */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  خانات الصور (assets/img): لو الملف مش موجود الصورة بتفضل مخفية      */
/* ------------------------------------------------------------------ */
function watchSlots(root = document) {
  $$('img[data-slot]:not([data-w])', root).forEach((img) => {
    img.dataset.w = '1';
    const ok = () => img.classList.add('ok');
    const bad = () => img.classList.add('bad');
    if (img.complete) { img.naturalWidth ? ok() : bad(); return; }
    img.addEventListener('load', ok, { once: true });
    img.addEventListener('error', bad, { once: true });
  });
}
watchSlots();

// ورق الدعوة (اختياري): assets/img/paper.webp — لو مش موجود بيفضل الملمس المرسوم بالـ CSS
(() => {
  const im = new Image();
  im.onload = () => document.documentElement.style.setProperty('--paper-img', 'url("assets/img/paper.webp")');
  im.src = 'assets/img/paper.webp';
})();

// جسيمات ذهبية عند فتح المظروف (x/y نسبة مئوية من المشهد)
function burst(host, x = 50, y = 50.5, count = 34) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W = host.clientWidth || 400;
  for (let i = 0; i < count; i++) {
    const c = document.createElement('i');
    const r = 3 + Math.random() * 7;
    c.style.cssText = `left:${x}%;top:${y}%;width:${r}px;height:${r}px;margin:${-r / 2}px 0 0 ${-r / 2}px`;
    host.appendChild(c);
    if (reduce) { setTimeout(() => c.remove(), 50); continue; }
    const a = Math.random() * Math.PI * 2, d = W * (0.1 + Math.random() * 0.36);
    const anim = c.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d - W * 0.08}px) scale(.3)`, opacity: 0 }
    ], { duration: 1000 + Math.random() * 1100, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
    anim.onfinish = () => c.remove();
  }
}

// بتلات متساقطة
(() => {
  const host = $('#petals');
  for (let i = 0; i < 10; i++) {
    const p = document.createElement('span');
    p.className = 'petal';
    const s = 0.6 + Math.random() * 0.9;
    p.style.cssText = `left:${Math.random() * 100}%;width:${11 * s}px;height:${15 * s}px;` +
      `animation-duration:${9 + Math.random() * 8}s;animation-delay:${-Math.random() * 14}s;--dx:${(Math.random() - 0.5) * 140}px`;
    host.appendChild(p);
  }
})();

// غبار ضوئي طافي فوق مشهد الغلاف
(() => {
  const host = $('#dust');
  for (let i = 0; i < 26; i++) {
    const d = document.createElement('i');
    const r = 2 + Math.random() * 5;
    d.style.cssText = `left:${Math.random() * 100}%;width:${r}px;height:${r}px;` +
      `animation-duration:${9 + Math.random() * 10}s;animation-delay:${-Math.random() * 16}s;--dx:${(Math.random() - 0.5) * 60}px`;
    host.appendChild(d);
  }
})();

// بارالاكس خفيف (ماوس / ميل الموبايل) — بيحترم تقليل الحركة
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = $('#hero'), stage = $('#heroStage');
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, orient = false;
  const loop = () => {
    cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
    stage.style.setProperty('--mx', cx.toFixed(3)); stage.style.setProperty('--my', cy.toFixed(3));
    raf = (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) ? requestAnimationFrame(loop) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  window.addEventListener('pointermove', (e) => {
    if (orient || e.pointerType === 'touch') return;
    tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; kick();
  }, { passive: true });
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || e.beta == null) return;
    orient = true;
    tx = Math.max(-1, Math.min(1, e.gamma / 25)); ty = Math.max(-1, Math.min(1, (e.beta - 55) / 25)); kick();
  }, { passive: true });
})();

// لو صورة فشلت: الصفحة تفضل شغالة
{
  const closed = $('#envClosed');
  const fail = () => $('#intro').classList.add('noimg');
  closed.addEventListener('error', fail);
  if (closed.complete && closed.naturalWidth === 0) fail(); // فشلت قبل ما السكربت يشتغل
}
$$('.hero-img').forEach((img) => img.addEventListener('error', () => img.remove()));

// اختيار عدد الضيوف
function buildGuests() {
  const sel = $('#fGuests');
  const cur = sel.value || '1';
  const nf = new Intl.NumberFormat(locale(), { useGrouping: false });
  sel.innerHTML = '';
  for (let i = 1; i <= CONFIG.maxGuests; i++) sel.add(new Option(nf.format(i), String(i)));
  sel.value = cur;
  renderDD();
}

// قايمة منسدلة بتصميم الدعوة (بدل قايمة المتصفح الأصلية). الـ <select> الأصلي بيفضل مخفي وهو مصدر القيمة.
let dd = null;
function renderDD() {
  const sel = $('#fGuests');
  if (!dd) {
    const wrap = document.createElement('div');
    wrap.className = 'dd';
    wrap.innerHTML = '<button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="guestsLbl"><span class="dd-val"></span>'
      + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
      + '<ul class="dd-list" role="listbox" tabindex="-1" aria-labelledby="guestsLbl" hidden></ul>';
    sel.after(wrap);
    sel.classList.add('native-hidden');
    dd = { wrap, btn: $('.dd-btn', wrap), val: $('.dd-val', wrap), list: $('.dd-list', wrap), active: -1 };

    const close = (focusBtn) => { dd.list.hidden = true; dd.wrap.classList.remove('open', 'up'); dd.btn.setAttribute('aria-expanded', 'false'); if (focusBtn) dd.btn.focus(); };
    const setActive = (i) => {
      const items = [...dd.list.children]; if (!items.length) return;
      dd.active = Math.max(0, Math.min(items.length - 1, i));
      items.forEach((li, k) => li.classList.toggle('act', k === dd.active));
      items[dd.active].scrollIntoView({ block: 'nearest' });
    };
    const choose = (i) => { sel.selectedIndex = i; sel.dispatchEvent(new Event('change', { bubbles: true })); renderDD(); close(true); };
    const open = () => {
      renderDD();
      dd.list.hidden = false; dd.wrap.classList.add('open'); dd.btn.setAttribute('aria-expanded', 'true');
      const r = dd.btn.getBoundingClientRect(), h = dd.list.offsetHeight;
      if (window.innerHeight - r.bottom - 84 < h && r.top > h + 20) dd.wrap.classList.add('up'); else dd.wrap.classList.remove('up');
      setActive(sel.selectedIndex);
      dd.list.focus({ preventScroll: true });
      dd.list.scrollIntoView({ block: 'nearest' });
    };
    dd.btn.addEventListener('click', () => (dd.list.hidden ? open() : close(true)));
    dd.btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); } });
    dd.list.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) choose([...dd.list.children].indexOf(li)); });
    dd.list.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowDown') { e.preventDefault(); setActive(dd.active + 1); }
      else if (k === 'ArrowUp') { e.preventDefault(); setActive(dd.active - 1); }
      else if (k === 'Home') { e.preventDefault(); setActive(0); }
      else if (k === 'End') { e.preventDefault(); setActive(99); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(dd.active); }
      else if (k === 'Escape') { e.preventDefault(); close(true); }
      else if (k === 'Tab') close(false);
      else if (/^[0-9]$/.test(k)) { const i = [...sel.options].findIndex((o) => o.text === k); if (i >= 0) setActive(i); }
    });
    document.addEventListener('pointerdown', (e) => { if (!dd.list.hidden && !dd.wrap.contains(e.target)) close(false); });
  }
  dd.val.textContent = sel.options[sel.selectedIndex]?.text || '';
  dd.list.innerHTML = '';
  [...sel.options].forEach((o, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option'); li.textContent = o.text;
    li.setAttribute('aria-selected', i === sel.selectedIndex ? 'true' : 'false');
    dd.list.appendChild(li);
  });
}

// الجدول الزمني
function buildTimeline() {
  const tl = $('#tl');
  $$('.tl-item', tl).forEach((n) => n.remove());
  CONFIG.events.forEach((ev) => {
    const item = document.createElement('div');
    item.className = 'tl-item';
    item.innerHTML = `<div class="tl-text"><span class="tl-time">${fmtTime(ev.time)}</span><span class="tl-label">${t('ev_' + ev.key)}</span></div>
                      <div class="tl-icon"><img data-slot src="assets/img/scene-${ev.icon}.webp" alt=""></div>`;
    tl.appendChild(item);
    watchSlots(item);
  });
}

// معرض صور القاعة (يظهر فقط لو فيه صور)
function buildGallery() {
  const g = $('#gallery');
  const photos = CONFIG.venue.photos || [];
  if (!photos.length) { g.hidden = true; return; }
  g.innerHTML = photos.map((p) => `<img src="${p}" alt="" loading="lazy">`).join('');
  g.hidden = false;
}

// الخريطة
function buildMap() {
  const q = encodeURIComponent(CONFIG.venue.mapQuery);
  const src = `https://maps.google.com/maps?q=${q}&t=k&z=17&output=embed&hl=${lang}`;
  const f = $('#mapFrame');
  if (f.dataset.src !== src) { f.dataset.src = src; f.src = src; }
  $('#mapBtn').href = CONFIG.venue.mapLink;
}

/* ------------------------------------------------------------------ */
/*  تطبيق اللغة                                                       */
/* ------------------------------------------------------------------ */
function applyLang(first) {
  const L = I18N[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = L.pageTitle;
  $$('[data-i18n]').forEach((el) => (el.textContent = L[el.dataset.i18n] ?? ''));
  $$('[data-i18n-ph]').forEach((el) => (el.placeholder = L[el.dataset.i18nPh] ?? ''));
  $$('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', L[el.dataset.i18nAria] ?? ''));
  $('#langBtn').textContent = L.langBtn;

  const w = dateParts(CONFIG.weddingISO);
  $$('[data-date="short"]').forEach((el) => (el.textContent = `${w.day} ${w.month} ${w.year}`));
  $$('.sc').forEach((c) => ($('.sc-val', c).textContent = w[c.dataset.part]));
  $('#weekday').textContent = w.weekday;

  const s = dateParts(CONFIG.shaylISO);
  $('#shaylDate').textContent = `${s.day} ${s.month} ${s.year}`;
  $('#shaylDay').textContent = s.weekday;

  buildGuests(); buildTimeline(); buildGallery(); buildMap(); tick();
  if (!first) { $('#formMsg').textContent = ''; }
  safe(() => localStorage.setItem('lang', lang));
}

$('#langBtn').addEventListener('click', () => {
  lang = lang === 'ar' ? 'en' : 'ar';
  const u = new URL(location.href); u.searchParams.set('lang', lang);
  history.replaceState(null, '', u);
  applyLang();
  observeAll();
});

/* ------------------------------------------------------------------ */
/*  العد التنازلي                                                     */
/* ------------------------------------------------------------------ */
const target = new Date(CONFIG.weddingISO).getTime();
const shaylTarget = new Date(CONFIG.shaylISO).getTime();
// prefix: 'cd' (الزفاف) أو 'sc' (شيل العزال)
function renderCount(prefix, tgt, capsSel, doneSel) {
  const nf = new Intl.NumberFormat(locale(), { minimumIntegerDigits: 2, useGrouping: false });
  let diff = Math.max(0, tgt - Date.now());
  const d = Math.floor(diff / 864e5); diff -= d * 864e5;
  const h = Math.floor(diff / 36e5); diff -= h * 36e5;
  const m = Math.floor(diff / 6e4); diff -= m * 6e4;
  const s = Math.floor(diff / 1e3);
  $(`#${prefix}-d`).textContent = nf.format(d);
  $(`#${prefix}-h`).textContent = nf.format(h);
  $(`#${prefix}-m`).textContent = nf.format(m);
  $(`#${prefix}-s`).textContent = nf.format(s);
  const done = tgt - Date.now() <= 0;
  $(doneSel).hidden = !done;
  $(capsSel).hidden = done;
}
function tick() {
  renderCount('cd', target, '#caps', '#countDone');
  renderCount('sc', shaylTarget, '#capsS', '#shaylDone');
}
setInterval(tick, 1000);

/* ------------------------------------------------------------------ */
/*  ظهور تدريجي                                                       */
/* ------------------------------------------------------------------ */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
function observeAll() { $$('.rv:not(.in), .tl:not(.in)').forEach((el) => io.observe(el)); }

/* ------------------------------------------------------------------ */
/*  الموسيقى                                                          */
/* ------------------------------------------------------------------ */
// عنصر صوت واحد بس (أضمن على الموبايل): بنبدّل الأغنية بتغيير src، ومفيش Audio جديد بيتعمل.
const audio = new Audio();
audio.preload = 'auto'; audio.id = 'bgAudio'; audio.hidden = true; document.body.appendChild(audio);
let wantMusic = true;          // المستخدم عايز موسيقى؟ (false لو وقّفها بنفسه)
let fadeId = 0;                // أي fade جديد بيلغي القديم
const musicBtn = $('#musicBtn');
const nextBtn = $('#nextBtn');
const tracks = []; let ti = 0;
const VOL = () => CONFIG.music?.volume ?? 0.5;

const showToast = (text) => { const to = $('#toast'); to.textContent = text; to.classList.add('show'); clearTimeout(showToast.t); showToast.t = setTimeout(() => to.classList.remove('show'), 2200); };
const syncBtn = () => musicBtn.classList.toggle('off', !wantMusic);

function fadeTo(v, ms, then) {
  const id = ++fadeId;
  const from = audio.volume, steps = 20, dt = ms / steps; let i = 0;
  const step = () => {
    if (id !== fadeId) return;                       // اتلغى بـ fade أحدث
    i++; audio.volume = Math.min(1, Math.max(0, from + (v - from) * (i / steps)));
    if (i >= steps) { then && then(); return; }
    setTimeout(step, dt);
  };
  step();
}
function setTrack(i) {
  ti = i;
  audio.src = tracks[i].src;
  audio.loop = tracks.length === 1;
  audio.load();
}
let hasPlayed = false;
// soft=true: محاولة تلقائية (من غير لمس) — لو المتصفح منعها بنستنى أول لمسة من الضيف ونشغّل وقتها
function playMusic(soft = false) {
  if (!tracks.length) return;
  fadeId++;                                          // ألغي أي fade-out شغال
  audio.volume = 0.0001;
  const p = audio.play();
  const ok = () => { hasPlayed = true; wantMusic = true; syncBtn(); fadeTo(VOL(), 1200); };
  const fail = () => { if (soft) { armFirstGesture(); return; } wantMusic = false; syncBtn(); };
  if (p && p.then) p.then(ok, fail); else ok();
}
// المتصفحات بتمنع الصوت قبل أي لمس. فأول لمسة/ضغطة في أي مكان (حتى على المظروف) بتبدأ الموسيقى.
let gestureArmed = false;
function armFirstGesture() {
  if (gestureArmed) return; gestureArmed = true;
  const go = () => {
    ['pointerup', 'touchend', 'click', 'keydown'].forEach((e) => window.removeEventListener(e, go, true));
    gestureArmed = false;
    if (wantMusic && audio.paused) playMusic(true);
  };
  ['pointerup', 'touchend', 'click', 'keydown'].forEach((e) => window.addEventListener(e, go, true));
}
function pauseMusic() {
  wantMusic = false; syncBtn();
  fadeTo(0, 450, () => audio.pause());
}
function nextTrack() {
  if (tracks.length < 2) return;
  setTrack((ti + 1) % tracks.length);
  playMusic();
}
audio.addEventListener('ended', () => { if (tracks.length > 1) nextTrack(); });
audio.addEventListener('error', () => {              // أغنية بايظة/مش بتتحمّل: كمّل على اللي بعدها
  if (tracks.length > 1 && wantMusic) { setTrack((ti + 1) % tracks.length); playMusic(); }
});

async function setupMusic() {
  const cfg = CONFIG.music || {};
  const list = cfg.tracks || (cfg.src ? [{ src: cfg.src }] : []);
  for (const tr of list) {
    try { const r = await fetch(tr.src, { method: 'HEAD' }); if (r.ok) tracks.push(tr); } catch { /* ملف ناقص */ }
  }
  if (!tracks.length) return;
  setTrack(0);
  musicBtn.hidden = false;
  nextBtn.hidden = tracks.length < 2;
  if (wantMusic) playMusic(true);                    // ابدأ فورًا (قبل فتح المظروف) لو المتصفح سمح، وإلا مع أول لمسة
}
nextBtn.addEventListener('click', nextTrack);
musicBtn.addEventListener('click', () => {
  if (!tracks.length) return;
  if (wantMusic && !audio.paused) pauseMusic(); else playMusic();
});
document.addEventListener('visibilitychange', () => {
  if (!tracks.length) return;
  if (document.hidden) audio.pause();
  else if (wantMusic && hasPlayed) audio.play().catch(() => {});
});

/* ------------------------------------------------------------------ */
/*  تمرير تلقائي                                                      */
/* ------------------------------------------------------------------ */
const scrollBtn = $('#scrollBtn');
let auto = false, lastTs = 0, accY = 0;
function autoStep(ts) {
  if (!auto) return;
  const dt = Math.min(64, ts - (lastTs || ts)); lastTs = ts;
  accY += dt * 0.042;
  const px = Math.floor(accY); accY -= px;
  if (px) window.scrollBy(0, px);
  const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  if (atEnd) return stopAuto();
  requestAnimationFrame(autoStep);
}
function startAuto() { auto = true; lastTs = 0; scrollBtn.classList.add('active'); scrollBtn.classList.remove('pulse'); requestAnimationFrame(autoStep); }
function stopAuto() { auto = false; scrollBtn.classList.remove('active'); }
scrollBtn.addEventListener('click', () => (auto ? stopAuto() : startAuto()));
['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((ev) => window.addEventListener(ev, (e) => {
  if (auto && !e.target.closest?.('#scrollBtn')) stopAuto();
}, { passive: true }));

/* ------------------------------------------------------------------ */
/*  فتح المظروف                                                       */
/* ------------------------------------------------------------------ */
const intro = $('#intro');
const sparks = $('#sparks');
let opened = false;
function finishIntro() {
  intro.classList.add('gone');
  document.body.classList.remove('locked');
  window.scrollTo(0, 0);
}
// الرجوع للمظروف المقفول (زرار المظروف فوق)
function reopenEnvelope() {
  stopAuto();
  safe(() => { sessionStorage.removeItem('inv_opened'); sessionStorage.removeItem('inv_y'); });
  opened = false;
  document.body.classList.remove('ready');
  document.body.classList.add('locked');
  sparks.innerHTML = '';
  intro.classList.remove('gone');
  intro.classList.add('lift');            // شفاف مؤقتًا
  void intro.offsetWidth;
  intro.classList.remove('opening');      // يرجع للمقفول وهو مش باين
  void intro.offsetWidth;
  window.scrollTo(0, 0);
  intro.classList.remove('lift');         // يظهر بنعومة
}
$('#envBtn').addEventListener('click', reopenEnvelope);
function openInvite(instant = false) {
  if (opened) return; opened = true;
  setupReadyAudio();
  if (instant) {
    finishIntro(); document.body.classList.add('ready'); scrollBtn.classList.add('pulse'); observeAll(); return;
  }
  burst(sparks, 50, 50.5, 64);
  intro.classList.add('opening');
  if (wantMusic && audio.paused) playMusic();
  setTimeout(() => { intro.classList.add('lift'); document.body.classList.add('ready'); }, 1500);
  setTimeout(() => { finishIntro(); scrollBtn.classList.add('pulse'); setTimeout(() => scrollBtn.classList.remove('pulse'), 9000); observeAll(); }, 2500);
}
function setupReadyAudio() { /* الصوت جاهز مسبقًا من setupMusic */ }
intro.addEventListener('click', () => openInvite());
$('#sealHit').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInvite(); } });

/* ------------------------------------------------------------------ */
/*  تأكيد الحضور                                                      */
/* ------------------------------------------------------------------ */
const form = $('#rsvpForm');
const msg = $('#formMsg');
const sendBtn = $('#sendBtn');
const setMsg = (text, cls = '') => { msg.textContent = text; msg.className = 'msg ' + cls; };

form.addEventListener('change', (e) => {
  if (e.target.name === 'attend') $('#guestsRow').style.display = e.target.value === 'no' ? 'none' : '';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if ($('#fHp').value) return; // روبوت
  const name = $('#fName').value.trim();
  if (!name) { setMsg(t('errName'), 'err'); $('#fName').focus(); return; }
  const last = Number(safe(() => localStorage.getItem('lastRsvpAt')) || 0);
  if (Date.now() - last < 20000) { setMsg(t('errWait'), 'err'); return; }

  const attending = form.attend.value === 'yes';
  sendBtn.disabled = true; $('span', sendBtn).textContent = t('sending'); setMsg('');
  try {
    await saveRsvp({
      name: name.slice(0, 80),
      attending,
      guests: attending ? Math.min(CONFIG.maxGuests, Math.max(1, Number($('#fGuests').value) || 1)) : 0,
      message: $('#fMsg').value.trim().slice(0, 500),
      lang
    });
    safe(() => localStorage.setItem('lastRsvpAt', String(Date.now())));
    form.classList.add('sent');
    setMsg(t(attending ? 'okYes' : 'okNo').replace('{name}', name), 'ok');
    setTimeout(() => $('#thanks').scrollIntoView({ behavior: 'smooth', block: 'start' }), 2600);
  } catch (err) {
    console.error(err);
    setMsg(t('errSend'), 'err');
    sendBtn.disabled = false;
  } finally {
    $('span', sendBtn).textContent = t('send');
  }
});

/* ------------------------------------------------------------------ */
/*  مشاركة                                                            */
/* ------------------------------------------------------------------ */
function shareUrl() { const u = new URL(location.href); u.hash = ''; return u.toString(); }
function wireShare() {
  const url = shareUrl(), text = `${t('pageTitle')} ${url}`;
  $('#shWa').href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  $('#shFb').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}
$('#shCopy').addEventListener('click', async () => {
  const url = shareUrl();
  try { await navigator.clipboard.writeText(url); } catch {
    const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  showToast(t('copied'));
});

/* ------------------------------------------------------------------ */
/*  تشغيل                                                             */
/* ------------------------------------------------------------------ */
applyLang(true);
wireShare();
observeAll();
setupMusic();
// لو الضيف فتح الدعوة وبعدين خرج منها (مثلًا لخرائط جوجل في نفس التاب) ورجع: بنرجّعه مفتوحة وفي نفس مكانه
const skey = (k) => safe(() => sessionStorage.getItem(k));
if (location.hash === '#open') openInvite(true); // للتجربة السريعة
else if (skey('inv_opened') === '1') {
  openInvite(true);
  const y = Number(skey('inv_y')) || 0;
  [60, 400, 1200].forEach((ms) => setTimeout(() => { if (y && Math.abs(window.scrollY - y) > 4) window.scrollTo(0, y); }, ms));
}
window.addEventListener('pagehide', () => { if (opened) safe(() => { sessionStorage.setItem('inv_opened', '1'); sessionStorage.setItem('inv_y', String(Math.round(window.scrollY))); }); });
