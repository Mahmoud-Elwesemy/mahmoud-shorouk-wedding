// طبقة التخزين: Firebase Firestore لو متضبط، وإلا وضع التجربة (localStorage).
import { firebaseConfig } from './firebase-config.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2';
export const isConfigured = () => Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);

let fbPromise = null;
export function getFirebase() {
  if (!fbPromise) {
    fbPromise = (async () => {
      const [app, fs, auth] = await Promise.all([
        import(`${FB}/firebase-app.js`),
        import(`${FB}/firebase-firestore.js`),
        import(`${FB}/firebase-auth.js`)
      ]);
      const a = app.initializeApp(firebaseConfig);
      return { app: a, fs, auth, db: fs.getFirestore(a), authInst: auth.getAuth(a) };
    })();
  }
  return fbPromise;
}

const DEMO_KEY = 'rsvps-demo';
export const demoList = () => { try { return JSON.parse(localStorage.getItem(DEMO_KEY) || '[]'); } catch { return []; } };

export async function saveRsvp(data) {
  if (!isConfigured()) {
    const list = demoList();
    list.unshift({ id: 'demo-' + Date.now(), ...data, createdAt: Date.now() });
    localStorage.setItem(DEMO_KEY, JSON.stringify(list));
    console.info('[RSVP demo mode] saved locally — see README to connect Firebase.');
    return;
  }
  const { fs, db } = await getFirebase();
  await fs.addDoc(fs.collection(db, 'rsvps'), { ...data, createdAt: fs.serverTimestamp() });
}
