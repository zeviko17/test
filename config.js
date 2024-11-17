window.ENV_idInstance = '{{ .Env.NEXT_PUBLIC_idInstance }}';
window.ENV_apiTokenInstance = '{{ .Env.NEXT_PUBLIC_apiTokenInstance }}';
window.ENV_sheetId = '{{ .Env.NEXT_PUBLIC_sheetId }}';

// נוסיף בדיקה והשמת ערכי ברירת מחדל אם המשתנים ריקים
if (!window.ENV_idInstance || window.ENV_idInstance.includes('{{')) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
        throw new Error('Environment variables are required in production!');
    } else {
        console.log('Using default values - VERCEL variables not loaded');
        window.ENV_idInstance = '7103962196';
        window.ENV_apiTokenInstance = '64e3bf31b17246f1957f8935b45f7fb5dc5517ee029d41fbae';
        window.ENV_sheetId = '10IkkOpeD_VoDpqMN23QFxGyuW0_p0TZx4NpWNcMN-Ss';
    }
}

console.log('Config loaded:', {
    idInstance: window.ENV_idInstance,
    apiTokenInstance: window.ENV_apiTokenInstance,
    sheetId: window.ENV_sheetId
});
