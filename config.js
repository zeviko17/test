// Define environment-specific configuration at build time
// These values will be replaced by Vercel during build
const ENV = {
    idInstance: '__VERCEL_INSTANCE_ID__',
    apiTokenInstance: '__VERCEL_API_TOKEN__',
    sheetId: '__VERCEL_SHEET_ID__'
};

// Expose to window for use in other scripts
window.ENV_idInstance = ENV.idInstance;
window.ENV_apiTokenInstance = ENV.apiTokenInstance;
window.ENV_sheetId = ENV.sheetId;
