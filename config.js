window.ENV_idInstance = process.env.NEXT_PUBLIC_idInstance;
window.ENV_apiTokenInstance = process.env.NEXT_PUBLIC_apiTokenInstance;
window.ENV_sheetId = process.env.NEXT_PUBLIC_sheetId;

// נוסיף לוג לבדיקה
console.log('Config values:', {
    idInstance: window.ENV_idInstance,
    apiTokenInstance: window.ENV_apiTokenInstance,
    sheetId: window.ENV_sheetId
});
