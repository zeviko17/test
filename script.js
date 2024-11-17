let isProcessing = false;
let shouldStop = false;

// הגדרת נתוני API
const idInstance = window.ENV_idInstance;
const apiTokenInstance = window.ENV_apiTokenInstance;
const apiBaseUrl = `https://7103.api.greenapi.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
const apiSendFileUrl = `https://7103.api.greenapi.com/waInstance${idInstance}/sendFileByUrl/${apiTokenInstance}`;

// הגדרת גיליון
const sheetId = window.ENV_sheetId;
const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=קבוצות%20להודעות`;

// מערך לשמירת הקבוצות
let groups = [];

// אתחול הדף
document.addEventListener('DOMContentLoaded', async () => {
    await loadGroups();
    setupEventListeners();
});

// טעינת קבוצות מהגיליון
async function loadGroups() {
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
        alert('שגיאה בטעינת הקבוצות');
    }
}

// הגדרת מאזיני אירועים
function setupEventListeners() {
    // כפתור סינון עברית
    document.getElementById('filterHebrewButton').addEventListener('click', filterHebrewGroups);
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

// הצגת הקבוצות בדף
function renderGroups() {
    const groupsList = document.getElementById('groupsList');
    groupsList.innerHTML = '';

    groups.forEach((group, index) => {
        const div = document.createElement('div');
        div.className = 'group-item';
        div.setAttribute('data-index', index); // הוסף את המאפיין data-index
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

// התחלת תהליך השליחה
async function startSending() {
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

    // הפעלת מצב שליחה
    isProcessing = true;
    shouldStop = false;
    updateUIForSending(true);

    let sent = 0;
    for (const group of selectedGroups) {
        if (shouldStop) {
            break;
        }

        try {
            // שליחת ההודעה
            if (imageUrl) {
                // שליחת תמונה עם טקסט
                await sendImageMessage(group.id, messageText, imageUrl);
            } else {
                // שליחת טקסט בלבד
                await sendTextMessage(group.id, messageText);
            }
            sent++;
            updateProgress(sent, selectedGroups.length);
        } catch (error) {
            console.error(`Error sending to ${group.name}:`, error);
        }

        if (sent < selectedGroups.length && !shouldStop) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // המתנה של 10 שניות
        }
    }

    // סיום תהליך השליחה
    isProcessing = false;
    updateUIForSending(false);
    
    if (shouldStop) {
        alert('תהליך השליחה הופסק');
    } else {
        alert('תהליך השליחה הושלם');
    }
}

// עדכון ממשק המשתמש בזמן שליחה
function updateUIForSending(isSending) {
    document.getElementById('sendButton').style.display = isSending ? 'none' : 'block';
    document.getElementById('stopButton').style.display = isSending ? 'block' : 'none';
    document.getElementById('progressBar').style.display = isSending ? 'block' : 'none';
    document.getElementById('progressText').style.display = isSending ? 'block' : 'none';
    
    document.getElementById('messageText').disabled = isSending;
    document.getElementById('imageUrl').disabled = isSending;
    document.getElementById('searchGroups').disabled = isSending;
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
    const response = await fetch(apiBaseUrl, {
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
    const response = await fetch(apiSendFileUrl, {
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
