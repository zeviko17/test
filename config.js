// הגדרת המשתנים מ-Vercel
window.ENV_idInstance = '{{ .Env.NEXT_PUBLIC_idInstance }}';
window.ENV_apiTokenInstance = '{{ .Env.NEXT_PUBLIC_apiTokenInstance }}';
window.ENV_sheetId = '{{ .Env.NEXT_PUBLIC_sheetId }}';

// לוג לבדיקה שהערכים נקראו נכון
console.log('Environment loaded from Vercel:', {
    idInstance: window.ENV_idInstance,
    apiTokenInstance: window.ENV_apiTokenInstance,
    sheetId: window.ENV_sheetId
});

// בדיקת שגיאה אם יש בעיה בטעינה
if (window.ENV_idInstance.includes('{{')) {
    console.error('Failed to load environment variables from Vercel');
}
