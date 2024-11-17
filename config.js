// קריאת המשתנים מהסביבה
window.ENV_idInstance = '__NEXT_PUBLIC_idInstance__';
window.ENV_apiTokenInstance = '__NEXT_PUBLIC_apiTokenInstance__';
window.ENV_sheetId = '__NEXT_PUBLIC_sheetId__';

// הוספת לוג לבדיקה
console.log('Environment Variables:', {
    idInstance: window.ENV_idInstance,
    apiTokenInstance: window.ENV_apiTokenInstance,
    sheetId: window.ENV_sheetId
});
