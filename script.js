document.getElementById('sendButton').addEventListener('click', async function () {
    const message = 'שלום שלום';

    // נתונים שלך מה-Green API
    const idInstance = '7103962196';
    const apiTokenInstance = '64e3bf31b17246f1957f8935b45f7fb5dc5517ee029d41fbae';

    // כתובות ה-API
    const apiBaseUrl = `https://7103.api.greenapi.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
    const apiSendFileUrl = `https://7103.api.greenapi.com/waInstance${idInstance}/sendFileByUrl/${apiTokenInstance}`;

    // שליפת groupIdים מגוגל שיטס (גיליון פתוח לקריאה)
    const sheetId = '10IkkOpeD_VoDpqMN23QFxGyuW0_p0TZx4NpWNcMN-Ss';
    const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=קבוצות%20להודעות`;

    try {
        const sheetResponse = await fetch(googleSheetsUrl);
        if (!sheetResponse.ok) {
            throw new Error(`HTTP error! status: ${sheetResponse.status}`);
        }
        const text = await sheetResponse.text();
        const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);/)[1]);

        const rows = json.table.rows;

        for (let i = 1; i < rows.length; i++) { // שליחת עבור על כל ה-IDים שבעמודה D החל משורה 2
            const groupIdCell = rows[i].c[3]; // גישה לתא בעמודה D
            let groupId = null;

            if (groupIdCell) {
                if (groupIdCell.v !== null && groupIdCell.v !== undefined) {
                    groupId = groupIdCell.v;
                } else if (groupIdCell.f !== null && groupIdCell.f !== undefined) {
                    groupId = groupIdCell.f;
                }
            }

            if (!groupId) {
                console.error(`No valid group ID found in cell D${i + 1}`);
                continue;
            }

            // וידוא שה-groupId מסתיים ב-@g.us
            if (!groupId.endsWith('@g.us')) {
                groupId = `${groupId}@g.us`;
            }

            // הצגת ערך התא D בלוג
            console.log(`Value of cell D${i + 1}:`, groupId);

            // שליחת הודעה טקסטואלית
            const data = {
                chatId: groupId,
                message: message
            };

            console.log('Testing send message to:', groupId);
            let response = await fetch(apiBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
                continue;
            }
            let responseData = await response.json();

            // בדיקת תגובת Green API להודעה טקסטואלית
            if (responseData.idMessage) {
                console.log('Message sent successfully, ID:', responseData.idMessage);
            } else {
                console.error('Failed to send message:', responseData);
                continue;
            }

            // שליחת תמונה
            const imageUrl = 'https://cdn.britannica.com/16/234216-050-C66F8665/beagle-hound-dog.jpg';
            const imageData = {
                chatId: groupId,
                caption: 'תמונה נחמדה של כלב',
                urlFile: imageUrl
            };

            console.log('Sending image with data:', imageData);
            console.log('To URL:', apiSendFileUrl);
            
            response = await fetch(apiSendFileUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(imageData)
            });

            console.log('Image API Response Status:', response.status);
            const responseText = await response.text();
            console.log('Image API Response Text:', responseText);

            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
                continue;
            }
            
            try {
                responseData = JSON.parse(responseText);
                if (responseData.idMessage) {
                    console.log('Image sent successfully, ID:', responseData.idMessage);
                } else {
                    console.error('Failed to send image:', responseData);
                }
            } catch (error) {
                console.error('Error parsing image response:', error);
                console.error('Raw response:', responseText);
            }

            // המתנה של 10 שניות לפני ההודעה הבאה
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

    } catch (error) {
        console.error('Error in sendMessage:', error);
    }
});
