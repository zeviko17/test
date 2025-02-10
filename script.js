let isProcessing = false;
let shouldStop = false;
let groups = [];
let sendResults = []; // מערך לשמירת תוצאות השליחה

window.addEventListener('configLoaded', () => {
    window.apiBaseUrl = `https://gate.whapi.cloud/messages`; // שינוי לכתובת הבסיסית
    window.apiTokenInstance = window.ENV_apiTokenInstance;
    const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${window.ENV_sheetId}/gviz/tq?tqx=out:json&sheet=קבוצות%20להודעות`;

    console.log('apiTokenInstance:', window.ENV_apiTokenInstance);
    console.log('sheetId:', window.ENV_sheetId);

    loadGroups(googleSheetsUrl);
    setupEventListeners();
    setupPlaceholders(); // הוספת קריאה לפונקציה להגדרת placeholders
});

function setupPlaceholders() {
    document.getElementById('messageText').placeholder = 'הקלד את תוכן ההודעה כאן...';
    document.getElementById('imageUrl').placeholder = 'הכנס קישור לתמונה';
    document.getElementById('securityCode').placeholder = 'הכנס קוד לשליחה';
}


async function loadGroups(googleSheetsUrl) {
    console.log('Loading groups from updated URL:', googleSheetsUrl);
    try {
        const response = await fetch(googleSheetsUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);/)[1]);

        groups = json.table.rows.slice(1).map(row => ({
            name: row.c[1]?.v || '',
            id: row.c[3]?.v || '',
            tag: row.c[0]?.v || '',
            checked: false
        })).filter(group => group.name && group.id);

        renderGroups();
    } catch (error) {
        console.error('Error loading groups:', error);
        console.log('Failed to load groups from URL:', googleSheetsUrl);
        alert('שגיאה בטעינת הקבוצות');
    }
}

function setupEventListeners() {
    document.getElementById('filterHebrewButton').addEventListener('click', filterHebrewGroups);
    document.getElementById('filterArabicButton').addEventListener('click', filterArabicGroups);
    document.getElementById('searchGroups').addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim().toLowerCase();
        filterGroups(searchTerm);
    });
    document.getElementById('sendButton').addEventListener('click', startSending);
    document.getElementById('stopButton').addEventListener('click', stopSending);
    document.getElementById('selectAllButton').addEventListener('click', selectAll);
    document.getElementById('clearAllButton').addEventListener('click', clearAll);
}

function filterGroups(searchTerm) {
    const groupElements = document.querySelectorAll('.group-item');
    groupElements.forEach(element => {
        const groupName = element.querySelector('label').textContent.toLowerCase();
        element.style.display = groupName.includes(searchTerm) ? '' : 'none';
    });
}

function filterHebrewGroups() {
    console.log('מפעיל סינון קבוצות עברית');
    const groupElements = document.querySelectorAll('.group-item');

    groupElements.forEach(element => {
        const index = parseInt(element.getAttribute('data-index'));
        if (!isNaN(index) && index < groups.length) {
            const group = groups[index];
            const isHebrewGroup = !group.tag || !group.tag.includes('#');
            element.style.display = isHebrewGroup ? '' : 'none';
        }
    });
}

function filterArabicGroups() {
    console.log('מפעיל סינון קבוצות ערבית');
    const groupElements = document.querySelectorAll('.group-item');

    groupElements.forEach(element => {
        const index = parseInt(element.getAttribute('data-index'));
        if (!isNaN(index) && index < groups.length) {
            const group = groups[index];
            const isArabicGroup = group.tag && group.tag.includes('#');
            element.style.display = isArabicGroup ? '' : 'none';
        }
    });
}

function renderGroups() {
    const groupsList = document.getElementById('groupsList');
    groupsList.innerHTML = '';

    groups.forEach((group, index) => {
        const div = document.createElement('div');
        div.className = 'group-item';
        div.setAttribute('data-index', index);
        div.innerHTML =
            `<input type="checkbox" id="group${index}" ${group.checked ? 'checked' : ''}>
            <label for="group${index}">${group.name}</label>`;

        div.querySelector('input').addEventListener('change', (e) => {
            groups[index].checked = e.target.checked;
        });

        groupsList.appendChild(div);
    });
}

function selectAll() {
    const visibleGroups = document.querySelectorAll('.group-item:not([style*="display: none"]) input[type="checkbox"]');
    visibleGroups.forEach(checkbox => {
        checkbox.checked = true;
        const index = parseInt(checkbox.id.replace('group', ''));
        groups[index].checked = true;
    });
}

function clearAll() {
    const visibleGroups = document.querySelectorAll('.group-item:not([style*="display: none"]) input[type="checkbox"]');
    visibleGroups.forEach(checkbox => {
        checkbox.checked = false;
        const index = parseInt(checkbox.id.replace('group', ''));
        groups[index].checked = false;
    });
}

async function sendMessageWithRetry(group, messageText, imageUrl = null) {
    const maxRetries = 3; // 3 ניסיונות
    let lastError = null;
    let apiResponse = null;

    const addStatusToList = (status, groupName, groupId, attempt = 0, error = null, apiResponse = null) => {
        const statusDiv = document.getElementById('sendingStatus');
        const statusItem = document.createElement('div');
        statusItem.className = 'status-item';
        const timestamp = new Date().toLocaleTimeString('he-IL');

        let messageContent = `
            <div style="display: flex; justify-content: space-between;">
                <span><strong>שעה:</strong> ${timestamp}</span>
            </div>
            <strong>קבוצה:</strong> ${groupName}<br>
            <strong>מזהה:</strong> ${groupId}<br>
        `;
        if (attempt > 0) {
            messageContent += `<strong>ניסיון:</strong> ${attempt} <br>`;
        }
        messageContent += `<strong>סטטוס:</strong> ${status}`;

        if (error) {
            messageContent += `<br><strong>שגיאה:</strong> ${error}`;
        }
        statusItem.innerHTML = messageContent;
        statusDiv.insertBefore(statusItem, statusDiv.firstChild);
    };


    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 1) {
                addStatusToList('מנסה שוב', group.name, group.id, attempt);
                await new Promise(resolve => setTimeout(resolve, 20000)); // המתנה 20 שניות בין ניסיונות
            }
            apiResponse = await sendTextMessage(group.id, messageText, imageUrl);

            if (!apiResponse) {
                sendResults.push({
                    groupName: group.name,
                    chatId: group.id,
                    status: 'failed',
                    error: 'תגובה ריקה מהשרת',
                    fullResponse: null
                });
                addStatusToList('שליחה נכשלה', group.name, group.id, attempt, 'תגובה ריקה מהשרת', null);
                throw new Error('תגובה ריקה מהשרת');
            }
            if (apiResponse.error) {
                sendResults.push({
                    groupName: group.name,
                    chatId: group.id,
                    status: 'failed',
                    error: `תגובת שגיאה מהשרת: ${JSON.stringify(apiResponse)}`,
                    fullResponse: apiResponse
                });
                addStatusToList('שליחה נכשלה', group.name, group.id, attempt, `תגובת שגיאה מהשרת: ${JSON.stringify(apiResponse)}`, apiResponse);
                throw new Error(`תגובת שגיאה מהשרת: ${JSON.stringify(apiResponse)}`);
            }

            if (apiResponse.sent && apiResponse.message?.status === 'sent') {
                sendResults.push({
                    groupName: group.name,
                    chatId: group.id,
                    status: 'success',
                    messageId: apiResponse.message.id,
                    fullResponse: apiResponse
                });
                addStatusToList('נשלח בהצלחה', group.name, group.id);
                return true; // שליחה הצליחה
            } else if (apiResponse.sent && apiResponse.message?.status === 'pending') {
                sendResults.push({
                    groupName: group.name,
                    chatId: group.id,
                    status: 'warning',
                    error: 'התקבל סטטוס "pending"',
                    fullResponse: apiResponse
                });
                addStatusToList('אזהרה - סטטוס pending', group.name, group.id, 0, 'התקבל סטטוס "pending"', apiResponse);
                console.warn(`תגובה מהשרת (סטטוס pending) for ${group.name}:`, apiResponse);
                return true; // אם הסטטוס pending אז אל תנסה שוב
            } else {
                sendResults.push({
                    groupName: group.name,
                    chatId: group.id,
                    status: 'failed',
                    error: 'סטטוס לא מוכר או חסר',
                    fullResponse: apiResponse
                });
                addStatusToList('שליחה נכשלה', group.name, group.id, attempt, 'סטטוס לא מוכר או חסר', apiResponse);
                throw new Error('סטטוס לא מוכר או חסר');
            }
        } catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt} failed for ${group.name}:`, error);
            if (attempt === maxRetries) {
                sendResults.push({
                    groupName: group.name,
                    chatId: group.id,
                    status: 'failed',
                    error: error.message,
                    fullResponse: apiResponse
                });
                addStatusToList('שליחה נכשלה - סופי', group.name, group.id, attempt, error.message, apiResponse);
            }
        }
    }
    return false; // כל הניסיונות נכשלו
}

async function startSending() {
    const securityCode = document.getElementById('securityCode').value.trim();
    if (securityCode !== window.ENV_code) {
        alert('קוד שגוי');
        return;
    }
    const messageText = document.getElementById('messageText').value.trim();
    const imageUrl = document.getElementById('imageUrl').value.trim();
    const selectedGroups = groups.filter(group => group.checked);

    if (!messageText && !imageUrl) {
        alert('יש להזין תוכן הודעה או תמונה');
        return;
    }

    if (selectedGroups.length === 0) {
        alert('יש לבחור לפחות קבוצה אחת');
        return;
    }

    if (isProcessing) {
        alert('תהליך שליחה כבר פעל');
        return;
    }

    isProcessing = true;
    shouldStop = false;
    updateUIForSending(true);
    sendResults = [];

    const results = {
        total: selectedGroups.length,
        success: 0,
        failed: 0,
        warning: 0
    };

    for (const group of selectedGroups) {
        // רק אם לחצו על כפתור העצירה
        if (shouldStop) {
            console.log('Stopping sending process by user request');
            break;
        }

        let sendSuccessForGroup = false;
        try {
            sendSuccessForGroup = await sendMessageWithRetry(group, messageText, imageUrl);
            console.log(`Sending to group ${group.name} ${sendSuccessForGroup ? 'succeeded' : 'failed'}`);
        } catch (error) {
            console.error(`Error sending to ${group.name}:`, error);
        }

        if (!shouldStop && selectedGroups.indexOf(group) < selectedGroups.length - 1) {
            console.log('Waiting 10 seconds before next group...');
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }

    sendResults.forEach(result => {
        if (result.status === 'success') {
            results.success++;
        } else if (result.status === 'failed') {
            results.failed++;
        } else if (result.status === 'warning') {
            results.warning++;
        }
    });
    updateProgress(results.success + results.failed + results.warning, selectedGroups.length);

    isProcessing = false;
    updateUIForSending(false);
    displaySendResults();
}

function updateUIForSending(isSending) {
    document.getElementById('sendButton').style.display = isSending ? 'none' : 'block';
    document.getElementById('stopButton').style.display = isSending ? 'block' : 'none';
    document.getElementById('progressBar').style.display = isSending ? 'block' : 'none';
    document.getElementById('progressText').style.display = isSending ? 'block' : 'none';
    document.getElementById('sendingStatus').style.display = 'block';

    document.getElementById('messageText').disabled = isSending;
    document.getElementById('imageUrl').disabled = isSending;
    document.getElementById('searchGroups').disabled = isSending;
    document.getElementById('filterHebrewButton').disabled = isSending;
    document.getElementById('filterArabicButton').disabled = isSending;
    document.getElementById('selectAllButton').disabled = isSending;
    document.getElementById('clearAllButton').disabled = isSending;


    if (isSending) {
        document.getElementById('sendingStatus').innerHTML = '';
    }
}

function updateProgress(current, total) {
    const percentage = (current / total) * 100;
    document.getElementById('progressFill').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = `נשלחו ${current} מתוך ${total} הודעות`;
}

function stopSending() {
    if (isProcessing) {
        shouldStop = true;
    }
}

async function sendTextMessage(chatId, message, imageUrl = null) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.apiTokenInstance}`
        };

        let endpoint, body;

        if (imageUrl) {
            endpoint = `${window.apiBaseUrl}/image`;
            body = {
                to: chatId,
                media: imageUrl,    // שינוי: שליחת ה-URL ישירות כ-string
                caption: message
            };
        } else {
            endpoint = `${window.apiBaseUrl}/text`;
            body = {
                to: chatId,
                body: message
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (response.status === 403) {
            throw new Error('אין הרשאה לשלוח לקבוצה זו. יש לוודא שהמספר מחובר לקבוצה.');
        }

        if (!response.ok) {
            const errorDetails = await response.text();
            let errorJson;
            try {
                errorJson = JSON.parse(errorDetails);
            } catch (parseError) {
                errorJson = { error: errorDetails };
            }
            throw new Error(`שגיאה בשליחה: ${errorJson.error?.message || 'שגיאה לא ידועה'}`);
        }

        const responseData = await response.json();
        console.log("API Response (Success):", responseData);
        return responseData;

    } catch (error) {
        console.error('Error in sendTextMessage:', error);
        throw error;
    }
}

function displaySendResults() {
    const statusDiv = document.getElementById('sendingStatus');
    //statusDiv.innerHTML = ''; // ניקוי תוכן הסטטוס כדי למנוע כפילות

    const table = document.createElement('table');
    table.className = 'results-table';

    const headerRow = table.insertRow();
    headerRow.innerHTML = `
      <th>קבוצה</th>
      <th>מזהה</th>
      <th>סטטוס</th>
      <th>הערות</th>
    `;

    sendResults.forEach(result => {
        const row = table.insertRow();
        row.innerHTML = `
          <td>${result.groupName}</td>
          <td>${result.chatId}</td>
          <td>${result.status}</td>
          <td>${result.error || ''}</td>
        `;
    });

    statusDiv.appendChild(table);

    // הוספת שורת סיום
    const summaryDiv = document.createElement('div');
    summaryDiv.style.textAlign = 'center';
    summaryDiv.style.marginTop = '20px';
    summaryDiv.style.padding = '10px';
    summaryDiv.style.backgroundColor = '#e8f5e9';
    summaryDiv.style.borderRadius = '4px';
    summaryDiv.style.fontWeight = 'bold';
    summaryDiv.innerHTML = '✅ תהליך השליחה הסתיים';
    statusDiv.appendChild(summaryDiv);
}
