document.getElementById('sendButton').addEventListener('click', function () {
    const groupId = '120363291001444894@g.us';
    const message = 'שלום שלום';

    // נתונים שלך מה-Green API
    const apiInstance = '7103962196';
    const apiBaseUrl = `https://7103.api.greenapi.com/waInstance${apiInstance}/sendMessage/`;

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
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Error:', data.error);
        } else {
            console.log('Message sent:', data);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});
