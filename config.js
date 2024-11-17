// הגדרת המשתנים מ-Vercel
window.ENV_idInstance = '%NEXT_PUBLIC_idInstance%';
window.ENV_apiTokenInstance = '%NEXT_PUBLIC_apiTokenInstance%';
window.ENV_sheetId = '%NEXT_PUBLIC_sheetId%';

// לוג לבדיקה שהערכים נקראו נכון
console.log('Environment loaded from Vercel:', {
    idInstance: window.ENV_idInstance,
    apiTokenInstance: window.ENV_apiTokenInstance,
    sheetId: window.ENV_sheetId
});

// בדיקת שגיאה אם יש בעיה בטעינה
if (window.ENV_idInstance.includes('%NEXT_PUBLIC')) {
    console.error('Failed to load environment variables from Vercel');
}
