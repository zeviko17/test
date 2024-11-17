window.ENV_idInstance = '{{ .Env.NEXT_PUBLIC_idInstance }}';
window.ENV_apiTokenInstance = '{{ .Env.NEXT_PUBLIC_apiTokenInstance }}';
window.ENV_sheetId = '{{ .Env.NEXT_PUBLIC_sheetId }}';
window.ENV_accessCode = '{{ .Env.NEXT_PUBLIC_ACCESS_CODE }}';

// Log the environment variables to check if they loaded correctly
console.log('idInstance:', window.ENV_idInstance);
console.log('apiTokenInstance:', window.ENV_apiTokenInstance);
console.log('sheetId:', window.ENV_sheetId);
console.log('accessCode:', window.ENV_accessCode);

if (!window.ENV_idInstance || window.ENV_idInstance.includes('{{')) {
    console.error('Environment variables not loaded from Vercel!');
}
