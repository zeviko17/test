window.ENV_idInstance = '{{ .Env.NEXT_PUBLIC_idInstance }}';
window.ENV_apiTokenInstance = '{{ .Env.NEXT_PUBLIC_apiTokenInstance }}';
window.ENV_sheetId = '{{ .Env.NEXT_PUBLIC_sheetId }}';

if (!window.ENV_idInstance || window.ENV_idInstance.includes('{{')) {
    console.error('Environment variables not loaded from Vercel!');
}
