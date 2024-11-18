async function loadConfig() {
    try {
        const response = await fetch('https://wispy-darkness-a08f.zaviner.workers.dev/', {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Network response was not ok ' + response.status);
        const config = await response.json();
        window.ENV_idInstance = config.idInstance;
        window.ENV_apiTokenInstance = config.apiTokenInstance;
        window.ENV_sheetId = config.sheetId;
        console.log('Config loaded successfully:', config);
    } catch (error) {
        console.error('Error loading config:', error);
        window.ENV_idInstance = 'ERROR_LOADING';
        window.ENV_apiTokenInstance = 'ERROR_LOADING';
        window.ENV_sheetId = 'ERROR_LOADING';
    }
    console.log('Config values:', {
        idInstance: window.ENV_idInstance,
        apiTokenInstance: window.ENV_apiTokenInstance,
        sheetId: window.ENV_sheetId
    });
}

loadConfig();
