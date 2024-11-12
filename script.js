document.getElementById('sendButton').addEventListener('click', function () {
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

    // בקשת Fetch עם הגדרת ה-POST
    fetch(apiBaseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Message sent:', data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});
