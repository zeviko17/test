window.ENV_idInstance = '{{ .Env.NEXT_PUBLIC_idInstance }}';
window.ENV_apiTokenInstance = '{{ .Env.NEXT_PUBLIC_apiTokenInstance }}';
window.ENV_sheetId = '{{ .Env.NEXT_PUBLIC_sheetId }}';

if (!window.ENV_idInstance || window.ENV_idInstance.includes('{{')) {
    window.ENV_idInstance = '7103962196';
    window.ENV_apiTokenInstance = '64e3bf31b17246f1957f8935b45f7fb5dc5517ee029d41fbae';
    window.ENV_sheetId = '10IkkOpeD_VoDpqMN23QFxGyuW0_p0TZx4NpWNcMN-Ss';
}

// נוסיף לוג שיעזור לנו לדעת מאיפה הגיעו הערכים
console.log('Config values:', {
    source: window.ENV_idInstance.includes('{{') ? 'Default' : 'Vercel',
    idInstance: window.ENV_idInstance,
    apiTokenInstance: window.ENV_apiTokenInstance,
    sheetId: window.ENV_sheetId
});
