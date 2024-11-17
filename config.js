window.config = {
    idInstance: '__NEXT_PUBLIC_idInstance__',
    apiTokenInstance: '__NEXT_PUBLIC_apiTokenInstance__',
    sheetId: '__NEXT_PUBLIC_sheetId__'
};

// העברה למשתני ENV לתאימות עם הקוד הקיים
window.ENV_idInstance = window.config.idInstance;
window.ENV_apiTokenInstance = window.config.apiTokenInstance;
window.ENV_sheetId = window.config.sheetId;

// לוג לבדיקה
console.log('Config loaded:', window.config);
