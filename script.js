// Script.js
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

    // Load security code from local storage
    const storedCode = localStorage.getItem('securityCode');
    if (storedCode) {
        document.getElementById('securityCode').value = storedCode;
    }
});

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
    const maxRetries = 2; // One initial attempt plus one retry
    let lastError = null;
    let apiResponse = null;

    const addStatusToList = (status, error = null, attempt = 1) => {
        const statusDiv = document.getElementById('sendingStatus');
        const statusItem = document.createElement('div');
        statusItem.className = 'status-item';
        const timestamp = new Date().toLocaleTimeString('he-IL');

        let statusHtml = `
            <div style="display: flex; justify-content: space-between;">
                <span><strong>שעה:</strong> ${timestamp}</span>
                <span><strong>ניסיון:</strong> ${attempt}/${maxRetries}</span>
            </div>
            <strong>קבוצה:</strong> ${group.name}<br>
            <strong>מזהה:</strong> ${group.id}<br>
            <strong>סטטוס:</strong> ${status}
        `;

        if (error) {
            statusHtml += `<br><strong>שגיאה:</strong> <span style="color: red;">${error}</span>`;
        }

        statusItem.innerHTML = statusHtml;
        statusDiv.insertBefore(statusItem, statusDiv.firstChild);
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            addStatusToList(`מנסה לשלוח...`, null, attempt);
            apiResponse = await sendTextMessage(group.id, messageText, imageUrl);

            if (!apiResponse) {
                throw new Error('תגובה ריקה מהשרת');
            }

            if (apiResponse.error) {
                throw new Error(`תגובת שגיאה מהשרת: ${JSON.stringify(apiResponse)}`);
            }

            if (apiResponse.sent && apiResponse.message?.status === 'sent') {
                sendResults.push({
                    groupName: group.name,
                    chatId: group.id,
                    status: 'success',
                    messageId: apiResponse.message.id,
                    fullResponse: apiResponse,
                    attempts: attempt
                });
                addStatusToList('✅ נשלח בהצלחה', null, attempt);
                return true;
            } else {
                throw new Error(apiResponse.message?.status === 'pending' ? 
                    'ההודעה ממתינה לאישור' : 'סטטוס לא מוכר או חסר');
            }
        } catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt} failed for ${group.name}:`, error);
            
            addStatusToList('❌ שליחה נכשלה', error.message, attempt);

            if (attempt < maxRetries) {
                const retryDelay = 20000; // 20 seconds delay before retry
                addStatusToList(`ממתין ${retryDelay/1000} שניות לניסיון נוסף...`, null, attempt);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                sendResults.push({
                    groupName: group.name,
                    chatId: group.id,
                    status: 'failed',
                    error: error.message,
                    fullResponse: apiResponse,
                    attempts: attempt
                });
            }
        }
    }
    return false;
}

async function startSending() {
    const securityCode = document.getElementById('securityCode').value.trim();
    if (securityCode !== window.ENV_code) {
        alert('קוד שגוי');
        return;
    }

    // Save security code to local storage
    localStorage.setItem('securityCode', securityCode);

    const messageText = document.getElementById('messageText').value.trim();
    const imageUrl = document.getElementById('imageUrl').value.trim();
    const selectedGroups = groups.filter(group => group.checked);
    const delaySeconds = parseInt(document.getElementById('delaySeconds').value);

    if (isNaN(delaySeconds) || delaySeconds < 0) {
        alert('השהייה בין הודעות חייבת להיות מספר חיובי');
        return;
    }

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

        try {
            const success = await sendMessageWithRetry(group, messageText, imageUrl);
            console.log(`Sending to group ${group.name} ${success ? 'succeeded' : 'failed'}`);
        } catch (error) {
            console.error(`Error sending to ${group.name}:`, error);
        }

        // המתנה בין הודעות רק אם זו לא הקבוצה האחרונה
        if (!shouldStop && selectedGroups.indexOf(group) < selectedGroups.length - 1) {
            console.log(`Waiting ${delaySeconds} seconds before next message...`);
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
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
    document.getElementById('delaySeconds').disabled = isSending;


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
    statusDiv.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'results-table';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '20px';

    const headerRow = table.insertRow();
    headerRow.innerHTML = `
        <th style="padding: 8px; border: 1px solid #ddd; background-color: #f8f9fa;">קבוצה</th>
        <th style="padding: 8px; border: 1px solid #ddd; background-color: #f8f9fa;">מזהה</th>
        <th style="padding: 8px; border: 1px solid #ddd; background-color: #f8f9fa;">סטטוס</th>
        <th style="padding: 8px; border: 1px solid #ddd; background-color: #f8f9fa;">ניסיונות</th>
    `;

    sendResults.forEach(result => {
        const row = table.insertRow();
        const statusStyle = result.status === 'success' ? 'color: green;' : 'color: red;';
        
        row.innerHTML = `
            <td style="padding: 8px; border: 1px solid #ddd;">${result.groupName}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${result.chatId}</td>
            <td style="padding: 8px; border: 1px solid #ddd; ${statusStyle}">
                ${result.status === 'success' ? '✅ נשלח בהצלחה' : `❌ נכשל: ${result.error}`}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">${result.attempts}/${maxRetries}</td>
        `;
    });

    statusDiv.appendChild(table);

    // Summary statistics
    const summary = sendResults.reduce((acc, result) => {
        acc[result.status] = (acc[result.status] || 0) + 1;
        return acc;
    }, {});

    const summaryDiv = document.createElement('div');
    summaryDiv.style.textAlign = 'center';
    summaryDiv.style.marginTop = '20px';
    summaryDiv.style.padding = '10px';
    summaryDiv.style.backgroundColor = '#e8f5e9';
    summaryDiv.style.borderRadius = '4px';
    summaryDiv.style.fontWeight = 'bold';
    summaryDiv.innerHTML = `
        סיכום שליחה:<br>
        ✅ הצלחות: ${summary.success || 0}<br>
        ❌ כשלונות: ${summary.failed || 0}<br>
        תהליך השליחה הסתיים
    `;
    statusDiv.appendChild(summaryDiv);
}
