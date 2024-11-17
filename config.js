const config = {
    idInstance: process.env.NEXT_PUBLIC_idInstance,
    apiTokenInstance: process.env.NEXT_PUBLIC_apiTokenInstance,
    sheetId: process.env.NEXT_PUBLIC_sheetId
};

window.ENV_idInstance = config.idInstance;
window.ENV_apiTokenInstance = config.apiTokenInstance;
window.ENV_sheetId = config.sheetId;
