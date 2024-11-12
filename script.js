document.getElementById('sendButton').addEventListener('click', async function () {
    const message = 'שלום שלום';

    // נתונים שלך מה-Green API
    const idInstance = '7103962196';
    const apiTokenInstance = '64e3bf31b17246f1957f8935b45f7fb5dc5517ee029d41fbae';

    // כתובות ה-API
    const apiBaseUrl = `https://7103.api.greenapi.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
    const apiStatusUrl = `https://7103.api.greenapi.com/waInstance${idInstance}/getMessage/${apiTokenInstance}`;
    const apiSendFileUrl = `https://7103.api.greenapi.com/waInstance${idInstance}/sendFileByUrl/${apiTokenInstance}`;
    const apiHistoryUrl = `https://7103.api.greenapi.com/waInstance${idInstance}/getMessageHistory/${apiTokenInstance}`;

    // שליפת groupId מגוגל שיטס (גיליון פתוח לקריאה)
    const sheetId = '10IkkOpeD_VoDpqMN23QFxGyuW0_p0TZx4NpWNcMN-Ss';
    const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=קבוצות%20להודעות`;

    async function checkMessageStatus(idMessage, groupId) {
        try {
            const response = await fetch(apiHistoryUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "chatId": groupId,
                    "count": 5
                })
            });
            
            if (!response.ok) {
                return false;
            }

            const historyData = await response.json();
            const message = historyData.find(msg => msg.idMessage === idMessage);
            
            return message?.status === "delivered";
        } catch (error) {
            console.error('Error checking message status:', error);
            return false;
        }
    }

    try {
        const sheetResponse = await fetch(googleSheetsUrl);
        if (!sheetResponse.ok) {
            throw new Error(`HTTP error! status: ${sheetResponse.status}`);
        }
        const text = await sheetResponse.text();
        const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);/)[1]);

        const rows = json.table.rows;
        const groupIdCell = rows[1].c[3]; // גישה לתא D2 (שורה 2)
        let groupId = null;

        if (groupIdCell) {
            if (groupIdCell.v !== null && groupIdCell.v !== undefined) {
                groupId = groupIdCell.v;
            } else if (groupIdCell.f !== null && groupIdCell.f !== undefined) {
                groupId = groupIdCell.f;
            }
        }

        if (!groupId) {
            throw new Error('No valid group ID found in cell D2');
        }

        // וידוא שה-groupId מסתיים ב-@g.us
        if (!groupId.endsWith('@g.us')) {
            groupId = `${groupId}@g.us`;
        }

        // הצגת ערך התא D2 בלוג
        console.log('Value of cell D2:', groupId);

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
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let responseData = await response.json();

        // בדיקת תגובת Green API להודעה טקסטואלית
        if (responseData.idMessage) {
            console.log('Message sent with ID:', responseData.idMessage);
            
            // בדיקת סטטוס אמיתי של ההודעה
            const isDelivered = await checkMessageStatus(responseData.idMessage, groupId);
            if (isDelivered) {
                console.log('Message was delivered successfully');
            } else {
                console.error('Message was not delivered');
            }

        } else {
            console.error('Failed to send message:', responseData);
        }

        // שליחת תמונה
        const imageUrl = 'https://cdn.britannica.com/16/234216-050-C66F8665/beagle-hound-dog.jpg';
        const imageData = {
            chatId: groupId,
            urlFile: imageUrl,
            fileName: "image.jpg",
            caption: 'תמונה נחמדה של כלב'
        };

        console.log('Sending image to:', groupId);
        response = await fetch(apiSendFileUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(imageData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        responseData = await response.json();

        // בדיקת תגובת Green API לתמונה
        if (responseData.idMessage) {
            const isDelivered = await checkMessageStatus(responseData.idMessage, groupId);
            if (isDelivered) {
                console.log('Image was delivered successfully');
            } else {
                console.error('Image was not delivered');
            }
        } else {
            console.error('Failed to send image:', responseData);
        }

    } catch (error) {
        console.error('Error in sendMessage:', error);
    }
});
