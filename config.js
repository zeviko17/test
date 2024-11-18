async function loadConfig() {
    try {
        const configSheetId = '1NCqsgITFH1TdlkWsb5NR3-SOjDyAgmGidHBLq2FPe0I';
        const url = `https://docs.google.com/spreadsheets/d/${configSheetId}/gviz/tq?tqx=out:json&sheet=Sheet1`;
        
        const response = await fetch(url);
        const text = await response.text();
        const data = JSON.parse(text.substr(47).slice(0, -2));

        // מילוי הערכים מהטבלה
        data.table.rows.forEach(row => {
            const key = row.c[0].v;    // עמודה A - סוג הקוד
            const value = row.c[1].v;   // עמודה B - ערך הקוד
            
            switch(key) {
                case 'idInstance':
                    window.ENV_idInstance = value;
                    break;
                case 'apiTokenInstance':
                    window.ENV_apiTokenInstance = value;
                    break;
                case 'sheetId':
                    window.ENV_sheetId = value;
                    break;
            }
        });

        console.log('Config values:', {
            idInstance: window.ENV_idInstance,
            apiTokenInstance: window.ENV_apiTokenInstance,
            sheetId: window.ENV_sheetId
        });
    } catch (error) {
        console.error('Error loading config:', error);
        window.ENV_idInstance = 'ERROR_LOADING';
        window.ENV_apiTokenInstance = 'ERROR_LOADING';
        window.ENV_sheetId = 'ERROR_LOADING';
    }
}

loadConfig();
