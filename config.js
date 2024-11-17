// הגדרת המשתנים ב-window (שיוחלפו על ידי Vercel)
const idInstance = '%NEXT_PUBLIC_idInstance%';
const apiTokenInstance = '%NEXT_PUBLIC_apiTokenInstance%';
const sheetId = '%NEXT_PUBLIC_sheetId%';

// העברה לאובייקט window לשימוש בשאר הקוד
window.ENV_idInstance = idInstance;
window.ENV_apiTokenInstance = apiTokenInstance;
window.ENV_sheetId = sheetId;

// לוג לבדיקה
console.log('Environment loaded:', {
    idInstance,
    apiTokenInstance,
    sheetId
});

// בדיקת שגיאות
if (!sheetId || sheetId.includes('%NEXT_PUBLIC')) {
    console.error('Failed to load sheetId from environment variables');
}
