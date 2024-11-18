async function loadConfig() {
    try {
        const response = await fetch('https://wispy-darkness-a08f.zaviner.workers.dev/');
        const config = await response.json();
        window.ENV_idInstance = config.idInstance;
        window.ENV_apiTokenInstance = config.apiTokenInstance;
        window.ENV_sheetId = config.sheetId;
    } catch (error) {
        console.error('Error loading config:', error);
        // במקרה של שגיאה נשתמש בערכי ברירת מחדל (אפשר להסיר או לשנות אותם)
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

// טען את הקונפיגורציה כשהדף נטען
loadConfig();
