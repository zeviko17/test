window.ENV_idInstance = '{{ .Env.NEXT_PUBLIC_idInstance }}';
window.ENV_apiTokenInstance = '{{ .Env.NEXT_PUBLIC_apiTokenInstance }}';
window.ENV_sheetId = '{{ .Env.NEXT_PUBLIC_sheetId }}';
window.ENV_accessCode = '{{ .Env.NEXT_PUBLIC_ACCESS_CODE }}';

if (!window.ENV_idInstance || window.ENV_idInstance.includes('{{')) {
    console.error('Environment variables not loaded from Vercel!');
}
