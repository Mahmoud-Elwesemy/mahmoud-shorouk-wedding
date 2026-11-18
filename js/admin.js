import { ADMIN_EMAIL } from './firebase-config.js';
import { isConfigured, getFirebase, demoList } from './rsvp-store.js';

const $ = (s) => document.querySelector(s);
let rows = [];
let unsub = null;

const fmtDate = (v) => {
  const d = v && v.toDate ? v.toDate() : new Date(v || Date.now());
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
};

function render() {
  const q = $('#q').value.trim().toLowerCase();
  const f = $('#f').value;
  const shown = rows.filter((r) =>
    (f === 'all' || (f === 'yes') === r.attending) &&
    (!q || (r.name || '').toLowerCase().includes(q) || (r.message || '').toLowerCase().includes(q)));

  $('#sTotal').textContent = rows.length;
  $('#sYes').textContent = rows.filter((r) => r.attending).length;
  $('#sNo').textContent = rows.filter((r) => !r.attending).length;
  $('#sGuests').textContent = rows.reduce((n, r) => n + (r.attending ? Number(r.guests) || 0 : 0), 0);

  const list = $('#list');
  list.textContent = '';
  if (!shown.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'لا توجد ردود بعد'; list.appendChild(e); return; }

  for (const r of shown) {
    const row = document.createElement('div'); row.className = 'row';
    const left = document.createElement('div');
    const name = document.createElement('span'); name.className = 'name'; name.textContent = r.name || '—';
    const badge = document.createElement('span'); badge.className = 'badge ' + (r.attending ? 'yes' : 'no');
    badge.textContent = r.attending ? `سيحضر · ${r.guests || 1}` : 'معتذر';
    const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = fmtDate(r.createdAt) + (r.lang === 'en' ? ' · EN' : '');
    left.append(name, badge, meta);
    const del = document.createElement('button'); del.className = 'danger'; del.type = 'button'; del.textContent = 'حذف';
    del.onclick = () => removeRow(r);
    row.append(left, del);
    if (r.message) { const m = document.createElement('div'); m.className = 'msg'; m.textContent = r.message; row.appendChild(m); }
    list.appendChild(row);
  }
}

async function removeRow(r) {
  if (!confirm(`حذف رد "${r.name}"؟ لا يمكن التراجع.`)) return;
  try {
    if (!isConfigured()) {
      localStorage.setItem('rsvps-demo', JSON.stringify(demoList().filter((x) => x.id !== r.id)));
      rows = rows.filter((x) => x.id !== r.id); render();
    } else {
      const { fs, db } = await getFirebase();
      await fs.deleteDoc(fs.doc(db, 'rsvps', r.id));
    }
  } catch (e) { $('#panelErr').textContent = 'تعذر الحذف: ' + e.message; }
}

function toCsv() {
  const esc = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  const head = ['الاسم', 'الحضور', 'العدد', 'التهنئة', 'التاريخ', 'اللغة'];
  const lines = rows.map((r) => [r.name, r.attending ? 'نعم' : 'لا', r.attending ? r.guests : 0, r.message, fmtDate(r.createdAt), r.lang].map(esc).join(','));
  const blob = new Blob(['﻿' + [head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'rsvps.csv'; a.click(); URL.revokeObjectURL(a.href);
}

async function startPanel() {
  $('#login').hidden = true; $('#panel').hidden = false; $('#panelErr').textContent = '';
  if (!isConfigured()) { rows = demoList(); render(); return; }
  const { fs, db } = await getFirebase();
  unsub && unsub();
  unsub = fs.onSnapshot(
    fs.query(fs.collection(db, 'rsvps'), fs.orderBy('createdAt', 'desc')),
    (snap) => { rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => {
      $('#panelErr').textContent = err.code === 'permission-denied'
        ? 'هذا الحساب غير مصرّح له بعرض الردود.' : 'خطأ: ' + err.message;
    });
}

$('#q').addEventListener('input', render);
$('#f').addEventListener('change', render);
$('#btnCsv').addEventListener('click', toCsv);

(async () => {
  if (!isConfigured()) { $('#demoBanner').hidden = false; startPanel(); $('#btnOut').hidden = true; return; }
  const { auth, authInst } = await getFirebase();
  $('#btnLogin').addEventListener('click', async () => {
    $('#loginErr').textContent = '';
    try { await auth.signInWithPopup(authInst, new auth.GoogleAuthProvider()); }
    catch (e) { $('#loginErr').textContent = 'تعذر تسجيل الدخول: ' + (e.code || e.message); }
  });
  $('#btnOut').addEventListener('click', () => auth.signOut(authInst));
  auth.onAuthStateChanged(authInst, (user) => {
    if (user && (!ADMIN_EMAIL || user.email === ADMIN_EMAIL)) startPanel();
    else {
      unsub && unsub(); $('#panel').hidden = true; $('#login').hidden = false;
      if (user) { $('#loginErr').textContent = 'هذا الحساب غير مصرّح له.'; auth.signOut(authInst); }
    }
  });
})();
