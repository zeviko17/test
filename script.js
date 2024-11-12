document.getElementById('sendButton').addEventListener('click', async function () {
    const groupId = '120363291001444894@g.us';
    const message = 'שלום שלום';

    // נתונים שלך מה-Green API
    const idInstance = '7103962196';
    const apiTokenInstance = '64e3bf31b17246f1957f8935b45f7fb5dc5517ee029d41fbae';

    // כתובת הבסיס של ה-API
    const apiBaseUrl = `https://7103.api.greenapi.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;

    // מבנה הבקשה
    const data = {
        chatId: groupId,
        message: message
    };

    // בדיקת שליחת הודעה
    try {
        console.log('Testing send message to:', groupId);
        const response = await fetch(apiBaseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseData = await response.json();
        console.log('Message sent successfully:', responseData);
    } catch (error) {
        console.error('Error in sendMessage:', error);
    }
});
