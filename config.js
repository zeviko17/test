async function loadConfig() {
    try {
        const configSheetId = '1NCqsgITFH1TdlkWsb5NR3-SOjDyAgmGidHBLq2FPe0I';
        const url = `https://docs.google.com/spreadsheets/d/${configSheetId}/gviz/tq?tqx=out:json&sheet=Sheet1`;
        
        const response = await fetch(url);
        const text = await response.text();
        const data = JSON.parse(text.substr(47).slice(0, -2));

        data.table.rows.forEach(row => {
            const key = row.c[0].v;
            const value = row.c[1].v;
            
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

        // רק אחרי שהקונפיג נטען, נפעיל את האירוע
        window.dispatchEvent(new Event('configLoaded'));

    } catch (error) {
        console.error('Error loading config:', error);
    }
}

loadConfig();  // מפעיל את הטעינה
