document.getElementById('sendButton').addEventListener('click', function () {
    const groupId = '120363291001444894@g.us';
    const message = 'שלום שלום';

    // נתונים שלך מה-Green API
    const idInstance = '7103962196';
    const apiTokenInstance = '64e3bf31b17246f1957f8935b45f7fb5dc5517ee029d41fbae';

    // כתובת הבסיס של ה-API
    const apiBaseUrl = `https://api.green-api.com/waInstance${idInstance}/sendMessage`;

    // מבנה הבקשה
    const data = {
        chatId: groupId,
        message: message
    };

    // בקשת Fetch עם הגדרת ה-POST
    fetch(apiBaseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiTokenInstance}`
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
        if (data.error) {
            console.error('Error:', data.error);
        } else {
            console.log('Message sent successfully:', data);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});
