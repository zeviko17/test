async function loadConfig() {
    try {
        const response = await fetch('https://whatsapp.zaviner.workers.dev', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Network response was not ok ' + response.status);
        const config = await response.json();
        window.ENV_idInstance = config.idInstance;
        window.ENV_apiTokenInstance = config.apiTokenInstance;
        window.ENV_sheetId = config.sheetId;
    } catch (error) {
        console.error('Error loading config:', error);
        window.ENV_idInstance = 'ERROR_LOADING';
        window.ENV_apiTokenInstance = 'ERROR_LOADING';
        window.ENV_sheetId = 'ERROR_LOADING';
    }
}

document.addEventListener('DOMContentLoaded', loadConfig);
