// קריאה מהסביבה של Vercel
window.ENV_idInstance = process.env.NEXT_PUBLIC_idInstance;
window.ENV_apiTokenInstance = process.env.NEXT_PUBLIC_apiTokenInstance;
window.ENV_sheetId = process.env.NEXT_PUBLIC_sheetId;

// לוג לבדיקה שהערכים נקראו נכון
console.log('Environment loaded from Vercel:', {
    idInstance: window.ENV_idInstance,
    apiTokenInstance: window.ENV_apiTokenInstance,
    sheetId: window.ENV_sheetId
});

// בדיקת שגיאה אם אין ערכים
if (!window.ENV_idInstance || !window.ENV_apiTokenInstance || !window.ENV_sheetId) {
    console.error('Missing environment variables from Vercel');
}
