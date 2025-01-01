let isProcessing = false;
let shouldStop = false;
// מערך לשמירת הקבוצות
let groups = [];

// אתחול הדף
window.addEventListener('configLoaded', () => {
    // אתחול הפרמטרים עם הערכים שנטענו
    window.apiBaseUrl = `https://7103.api.greenapi.com/waInstance${window.ENV_idInstance}/sendMessage/${window.ENV_apiTokenInstance}`;
    window.apiSendFileUrl = `https://7103.api.greenapi.com/waInstance${window.ENV_idInstance}/sendFileByUrl/${window.ENV_apiTokenInstance}`;
    const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${window.ENV_sheetId}/gviz/tq?tqx=out:json&sheet=קבוצות%20להודעות`;
    
    // התחלת האתחול
    console.log('idInstance:', window.ENV_idInstance);
    console.log('apiTokenInstance:', window.ENV_apiTokenInstance);
    console.log('sheetId:', window.ENV_sheetId);
    loadGroups(googleSheetsUrl);
    setupEventListeners();
});

// טעינת קבוצות מהגיליון
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
            name: row.c[1]?.v || '',  // עמודה B
            id: row.c[3]?.v || '',    // עמודה D
            tag: row.c[0]?.v || '',   // עמודה A
            checked: false
        })).filter(group => group.name && group.id);

        renderGroups();
    } catch (error) {
        console.error('Error loading groups:', error);
        console.log('Failed to load groups from URL:', googleSheetsUrl);
        alert('שגיאה בטעינת הקבוצות');
    }
}

// הגדרת מאזיני אירועים
function setupEventListeners() {
    // כפתור סינון עברית
    document.getElementById('filterHebrewButton').addEventListener('click', filterHebrewGroups);
    // כפתור סינון ערבית
    document.getElementById('filterArabicButton').addEventListener('click', filterArabicGroups);
    // חיפוש קבוצות
    document.getElementById('searchGroups').addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim().toLowerCase();
        filterGroups(searchTerm);
    });

    // כפתור שליחה
    document.getElementById('sendButton').addEventListener('click', startSending);
    
    // כפתור עצירה
    document.getElementById('stopButton').addEventListener('click', stopSending);
}

// סינון קבוצות לפי טקסט חיפוש
function filterGroups(searchTerm) {
    const groupElements = document.querySelectorAll('.group-item');
    groupElements.forEach(element => {
        const groupName = element.querySelector('label').textContent.toLowerCase();
        element.style.display = groupName.includes(searchTerm) ? '' : 'none';
    });
}

// סינון קבוצות לפי תגית #
function filterHebrewGroups() {
    console.log('מפעיל סינון קבוצות עברית');
    const groupElements = document.querySelectorAll('.group-item');
    
    groupElements.forEach(element => {
        const index = parseInt(element.getAttribute('data-index'));
        if (!isNaN(index) && index < groups.length) {
            const group = groups[index];
            console.log(`Checking group ${index}:`, { 
                name: group.name, 
                tag: group.tag,
                isHebrew: !group.tag.includes('#')
            });
            
            const isHebrewGroup = !group.tag || !group.tag.includes('#');
            element.style.display = isHebrewGroup ? '' : 'none';
        }
    });
}

// סינון קבוצות לפי תגית # - ערבית
function filterArabicGroups() {
    console.log('מפעיל סינון קבוצות ערבית');
    const groupElements = document.querySelectorAll('.group-item');
    
    groupElements.forEach(element => {
        const index = parseInt(element.getAttribute('data-index'));
        if (!isNaN(index) && index < groups.length) {
            const group = groups[index];
            console.log(`Checking group ${index}:`, { 
                name: group.name, 
                tag: group.tag,
                isArabic: group.tag?.includes('#')
            });
            
            const isArabicGroup = group.tag && group.tag.includes('#');
            element.style.display = isArabicGroup ? '' : 'none';
        }
    });
}

// הצגת הקבוצות בדף
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

// בחירת כל הקבוצות המוצגות
function selectAll() {
    const visibleGroups = document.querySelectorAll('.group-item:not([style*="display: none"]) input[type="checkbox"]');
    visibleGroups.forEach(checkbox => {
        checkbox.checked = true;
        const index = parseInt(checkbox.id.replace('group', ''));
        groups[index].checked = true;
    });
}

// ניקוי כל הבחירות המוצגות
function clearAll() {
    const visibleGroups = document.querySelectorAll('.group-item:not([style*="display: none"]) input[type="checkbox"]');
    visibleGroups.forEach(checkbox => {
        checkbox.checked = false;
        const index = parseInt(checkbox.id.replace('group', ''));
        groups[index].checked = false;
    });
}

// פונקציה חדשה - שליחת הודעה עם ניסיונות חוזרים
async function sendMessageWithRetry(group, messageText, imageUrl = null) {
    const maxRetries = 3;
    let lastError = null;
    let apiResponse = null;

    // הוספת סטטוס חדש לרשימה
    const addStatusToList = (status, error = null) => {
        const statusDiv = document.getElementById('sendingStatus');
        const statusItem = document.createElement('div');
        statusItem.className = `status-item ${error ? 'status-error' : 'status-success'}`;
        const timestamp = new Date().toLocaleTimeString('he-IL');
        statusItem.innerHTML = `
            <div style="display: flex; justify-content: space-between;">
                <span><strong>שעה:</strong> ${timestamp}</span>
                <span class="status-badge" style="padding: 2px 8px; border-radius: 4px; background-color: ${error ? '#ffebee' : '#e8f5e9'}; color: ${error ? '#d32f2f' : '#2e7d32'}">
                    ${error ? 'נכשל' : 'הצלחה'}
                </span>
            </div>
            <strong>קבוצה:</strong> ${group.name}<br>
            <strong>מזהה:</strong> ${group.id}<br>
            ${error ? `<div style="color: #d32f2f; margin-top: 4px;"><strong>שגיאה:</strong> ${error}</div>` : ''}
        `;
        statusDiv.insertBefore(statusItem, statusDiv.firstChild);
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (imageUrl) {
                apiResponse = await sendImageMessage(group.id, messageText, imageUrl);
            } else {
                apiResponse = await sendTextMessage(group.id, messageText);
            }

            // עדכון סטטוס הצלחה
            addStatusToList('נשלח בהצלחה');
            return true;

        } catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt} failed for ${group.name}:`, error);

            if (attempt === maxRetries) {
                // עדכון סטטוס כישלון
                addStatusToList('שליחה נכשלה', error.message);
            }

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
                continue;
            }
        }
    }

    return false;
}

// פונקציית השליחה הראשית המעודכנת
async function startSending() {
    const securityCode = document.getElementById('securityCode').value.trim();
    if (securityCode !== window.ENV_code) {
        alert('קוד שגוי');
        return;
    }
    const messageText = document.getElementById('messageText').value.trim();
    const imageUrl = document.getElementById('imageUrl').value.trim();
    const selectedGroups = groups.filter(group => group.checked);

    if (!messageText) {
        alert('יש להזין תוכן הודעה');
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

    const results = {
        total: selectedGroups.length,
        success: 0,
        failed: 0
    };

    for (const group of selectedGroups) {
        if (shouldStop) {
            break;
        }

        try {
            const success = await sendMessageWithRetry(group, messageText, imageUrl);
            if (success) {
                results.success++;
            } else {
                results.failed++;
            }
            updateProgress(results.success + results.failed, selectedGroups.length);
        } catch (error) {
            results.failed++;
            console.error(`Critical error with ${group.name}:`, error);
        }

        if (!shouldStop && (results.success + results.failed) < selectedGroups.length) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // שמירה על ההשהיה המקורית
        }
    }

    isProcessing = false;
    updateUIForSending(false);
    
    if (shouldStop) {
        alert(`תהליך השליחה הופסק. הצלחות: ${results.success}, כשלונות: ${results.failed}`);
    } else {
        alert(`תהליך השליחה הושלם. הצלחות: ${results.success}, כשלונות: ${results.failed}`);
    }
}

// עדכון ממשק המשתמש בזמן שליחה
function updateUIForSending(isSending) {
    document.getElementById('sendButton').style.display = isSending ? 'none' : 'block';
    document.getElementById('stopButton').style.display = isSending ? 'block' : 'none';
    document.getElementById('progressBar').style.display = isSending ? 'block' : 'none';
    document.getElementById('progressText').style.display = isSending ? 'block' : 'none';
    document.getElementById('sendingStatus').style.display = isSending ? 'block' : 'none';
    
    document.getElementById('messageText').disabled = isSending;
    document.getElementById('imageUrl').disabled = isSending;
    document.getElementById('searchGroups').disabled = isSending;

    // ניקוי רשימת הסטטוסים בתחילת שליחה חדשה
    if (isSending) {
        document.getElementById('sendingStatus').innerHTML = '';
    }
}

// עדכון מד ההתקדמות
function updateProgress(current, total) {
    const percentage = (current / total) * 100;
    document.getElementById('progressFill').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = `נשלחו ${current} מתוך ${total} הודעות`;
}

// עצירת תהליך השליחה
function stopSending() {
    if (isProcessing) {
        shouldStop = true;
    }
}

// שליחת הודעת טקסט
async function sendTextMessage(chatId, message) {
    const response = await fetch(window.apiBaseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chatId: chatId,
            message: message
        })
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorDetails}`);
    }

    return response.json();
}

// שליחת הודעה עם תמונה
async function sendImageMessage(chatId, message, imageUrl) {
    const response = await fetch(window.apiSendFileUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chatId: chatId,
            caption: message,
            urlFile: imageUrl,
            fileName: 'image.jpg'
        })
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorDetails}`);
    }

    return response.json();
}
