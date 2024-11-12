document.getElementById('sendButton').addEventListener('click', async function () {
    const messageElement = document.getElementById('messageText');
    const imageUrlElement = document.getElementById('imageUrl');
    const message = messageElement.value.trim();
    const imageUrl = imageUrlElement.value.trim();

    if (!message) {
        console.error('Message text is required');
        return;
    }

    // נתונים שלך מה-Green API
    const idInstance = '7103962196';
    const apiTokenInstance = '64e3bf31b17246f1957f8935b45f7fb5dc5517ee029d41fbae';

    // כתובות ה-API
    const apiBaseUrl = `https://7103.api.greenapi.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
    const apiStatusUrl = `https://7103.api.greenapi.com/waInstance${idInstance}/getMessage/${apiTokenInstance}`;
    const apiSendFileUrl = `https://7103.api.greenapi.com/waInstance${idInstance}/sendFileByUrl/${apiTokenInstance}`;

    // שליפת groupId מגוגל שיטס (גיליון פתוח לקריאה)
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
            console.log('Message sent successfully, ID:', responseData.idMessage);
        } else {
            console.error('Failed to send message:', responseData);
            return;
        }

        // אם יש URL של תמונה, שלח גם אותה
        if (imageUrl) {
            // המתנה קצרה בין ההודעות
            await new Promise(resolve => setTimeout(resolve, 1000));

            // שליחת תמונה
            const imageData = {
                chatId: groupId,
                caption: message,  // שימוש באותה הודעה כמו בטקסט
                urlFile: imageUrl,
                fileName: 'image.jpg'  // שדה חובה ל-Green API
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
                throw new Error(`HTTP error! status: ${response.status}`);
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
        }

    } catch (error) {
        console.error('Error in sendMessage:', error);
    }
});
