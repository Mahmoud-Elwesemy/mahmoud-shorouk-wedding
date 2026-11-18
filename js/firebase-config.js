// =====================================================================
//  إعدادات Firebase (تخزين ردود تأكيد الحضور)
//  اتبع الخطوات في README.md ثم الصق القيم هنا.
//  ملحوظة: هذه القيم ليست أسرارًا — الحماية الحقيقية في firestore.rules
//  لو projectId فاضي، الموقع يشتغل بوضع التجربة (الردود تتخزن في متصفحك بس).
// =====================================================================

export const firebaseConfig = {
  apiKey: 'AIzaSyAps4SlF7eUpcdEv3LpsMoju0vD1Losp_c',
  authDomain: 'mahmoud-shorouk-wedding.firebaseapp.com',
  projectId: 'mahmoud-shorouk-wedding',
  appId: '1:601246140656:web:615d5e0cc1f42a4d68da35'
};

// الإيميل الوحيد المسموح له يشوف الردود (لازم يطابق firestore.rules)
export const ADMIN_EMAIL = 'mahmoudweso430@gmail.com';
