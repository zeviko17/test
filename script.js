let isProcessing = false;
let shouldStop = false;
let groups = [];
let sendResults = []; // מערך לשמירת תוצאות השליחה

window.addEventListener('configLoaded', () => {
    window.apiBaseUrl = `https://7103.api.greenapi.com/waInstance${window.ENV_idInstance}/sendMessage/${window.ENV_apiTokenInstance}`;
    window.apiSendFileUrl = `https://7103.api.greenapi.com/waInstance${window.ENV_idInstance}/sendFileByUrl/${window.ENV_apiTokenInstance}`;
    const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${window.ENV_sheetId}/gviz/tq?tqx=out:json&sheet=קבוצות%20להודעות`;
    
    console.log('idInstance:', window.ENV_idInstance);
    console.log('apiTokenInstance:', window.ENV_apiTokenInstance);
    console.log('sheetId:', window.ENV_sheetId);
    
    loadGroups(googleSheetsUrl);
    setupEventListeners();
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
    const maxRetries = 3;
    let lastError = null;
    let apiResponse = null;
    // const chatIdRegex = /^(\d+@c\.us|\d+-\d+@g\.us)$/; // בדיקה מיותרת הוסרה

    // if (!chatIdRegex.test(group.id)) {  // בדיקה מיותרת הוסרה
    //      sendResults.push({
    //         groupName: group.name,
    //         chatId: group.id,
    //         status: 'failed',
    //         error: 'פורמט מזהה קבוצה לא תקין',
    //           fullResponse: null
    //       });
    //     return false;
    // }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (imageUrl) {
                apiResponse = await sendImageMessage(group.id, messageText, imageUrl);
            } else {
                apiResponse = await sendTextMessage(group.id, messageText);
            }

            if (!apiResponse) {
                  sendResults.push({
                      groupName: group.name,
                    chatId: group.id,
                    status: 'failed',
                      error: 'תגובה ריקה מהשרת',
                      fullResponse: null
                    });
                  throw new Error('תגובה ריקה מהשרת');
            }

            if (apiResponse.error || apiResponse.message) {
                    sendResults.push({
                        groupName: group.name,
                        chatId: group.id,
                        status: 'failed',
                        error: `תגובת שגיאה מהשרת: ${JSON.stringify(apiResponse)}`,
                        fullResponse: apiResponse
                     });
                    throw new Error(`תגובת שגיאה מהשרת: ${JSON.stringify(apiResponse)}`);
            }
             if (!apiResponse.idMessage) {
                  sendResults.push({
                        groupName: group.name,
                       chatId: group.id,
                      status: 'warning',
                      error: 'תגובה לא תקינה מהשרת (אין idMessage)',
                       fullResponse: apiResponse
                     });
                   console.warn(`תגובה לא תקינה מהשרת (אין idMessage) for ${group.name}:`, apiResponse);
                  
            } else {
                  sendResults.push({
                    groupName: group.name,
                    chatId: group.id,
                    status: 'success',
                    idMessage: apiResponse.idMessage,
                    fullResponse: apiResponse
                });
            }
            return true;

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
            }
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
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
    sendResults = [];

    const results = {
        total: selectedGroups.length,
        success: 0,
        failed: 0,
       warning: 0
    };

    const sendPromises = selectedGroups.map(group =>
        sendMessageWithRetry(group, messageText, imageUrl)
    );
    
     await Promise.all(sendPromises);

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


async function sendTextMessage(chatId, message) {
    try {
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
            let errorJson;
            try {
                errorJson = JSON.parse(errorDetails);
            } catch (parseError) {
                 errorJson = { error: errorDetails };
            }
            throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorJson)}`);
         }
        const responseData =  await response.json();
        console.log("API Response (Success):", responseData);
        return responseData;
    } catch (error) {
       console.error('Error in sendTextMessage:', error);
         throw error;
    }
}

async function sendImageMessage(chatId, message, imageUrl) {
    try{
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
            let errorJson;
            try {
                errorJson = JSON.parse(errorDetails);
            } catch (parseError) {
                 errorJson = { error: errorDetails };
            }
             throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorJson)}`);
         }
        const responseData = await response.json();
         console.log("API Response (Success):", responseData);
        return responseData;

    } catch (error) {
        console.error('Error in sendImageMessage:', error);
       throw error;
    }
}


function displaySendResults() {
    const statusDiv = document.getElementById('sendingStatus');
    statusDiv.innerHTML = '';
  
    const table = document.createElement('table');
    table.className = 'results-table';
  
    const headerRow = table.insertRow();
    headerRow.innerHTML = `
      <th>קבוצה</th>
      <th>מזהה</th>
      <th>סטטוס</th>
      <th>שגיאה</th>
      <th>מזהה הודעה</th>
      <th>תגובה מלאה</th>
    `;
    
    sendResults.forEach(result => {
      const row = table.insertRow();
      row.innerHTML = `
        <td>${result.groupName}</td>
        <td>${result.chatId}</td>
        <td class="${result.status === 'success' ? 'status-success' : (result.status === 'warning' ? 'status-warning' : 'status-error')}">${result.status === 'success' ? 'הצלחה' : (result.status === 'warning' ? 'אזהרה' : 'כישלון')}</td>
        <td>${result.error || ''}</td>
        <td>${result.idMessage || ''}</td>
        <td><pre>${result.fullResponse ? JSON.stringify(result.fullResponse, null, 2) : ''}</pre></td>
      `;
    });
  
    statusDiv.appendChild(table);
  }