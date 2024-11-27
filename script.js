let isProcessing = false;
let shouldStop = false;
let selectedFile = null;
let groups = [];

window.addEventListener('configLoaded', () => {
   window.apiBaseUrl = `https://7103.api.greenapi.com/waInstance${window.ENV_idInstance}/sendMessage/${window.ENV_apiTokenInstance}`;
   window.apiSendFileUrl = `https://7103.api.greenapi.com/waInstance${window.ENV_idInstance}/sendFileByUrl/${window.ENV_apiTokenInstance}`;
   const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${window.ENV_sheetId}/gviz/tq?tqx=out:json&sheet=קבוצות%20להודעות`;
   
   console.log('idInstance:', window.ENV_idInstance);
   console.log('apiTokenInstance:', window.ENV_apiTokenInstance);
   console.log('sheetId:', window.ENV_sheetId);
   loadGroups(googleSheetsUrl);
   setupEventListeners();
   setupFileUpload();
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

function setupFileUpload() {
   const fileInput = document.getElementById('imageFile');
   const preview = document.getElementById('imagePreview');
   
   fileInput.addEventListener('change', (e) => {
       const file = e.target.files[0];
       if (file && file.type.startsWith('image/')) {
           selectedFile = file;
           const reader = new FileReader();
           reader.onload = (e) => {
               preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
           };
           reader.readAsDataURL(file);
       }
   });
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
       div.innerHTML = `
           <input type="checkbox" id="group${index}" ${group.checked ? 'checked' : ''}>
           <label for="group${index}">${group.name}</label>
       `;
       
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

async function startSending() {
   const securityCode = document.getElementById('securityCode').value.trim();
   if (securityCode !== window.ENV_code) {
       alert('קוד שגוי');
       return;
   }
   const messageText = document.getElementById('messageText').value.trim();
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
       alert('תהליך שליחה כבר פעיל');
       return;
   }

   isProcessing = true;
   shouldStop = false;
   updateUIForSending(true);

   let sent = 0;
   for (const group of selectedGroups) {
       if (shouldStop) break;

       try {
           if (selectedFile) {
               const imageUrl = await uploadToGithub(selectedFile);
               await sendImageMessage(group.id, messageText, imageUrl);
           } else {
               await sendTextMessage(group.id, messageText);
           }
           sent++;
           updateProgress(sent, selectedGroups.length);
       } catch (error) {
           console.error(`Error sending to ${group.name}:`, error);
       }

       if (sent < selectedGroups.length && !shouldStop) {
           await new Promise(resolve => setTimeout(resolve, 10000));
       }
   }

   isProcessing = false;
   updateUIForSending(false);
   
   if (shouldStop) {
       alert('תהליך השליחה הופסק');
   } else {
       alert('תהליך השליחה הושלם');
   }
}

function updateUIForSending(isSending) {
   document.getElementById('sendButton').style.display = isSending ? 'none' : 'block';
   document.getElementById('stopButton').style.display = isSending ? 'block' : 'none';
   document.getElementById('progressBar').style.display = isSending ? 'block' : 'none';
   document.getElementById('progressText').style.display = isSending ? 'block' : 'none';
   
   document.getElementById('messageText').disabled = isSending;
   document.getElementById('searchGroups').disabled = isSending;
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

async function uploadToGithub(file) {
   const base64Data = await new Promise((resolve) => {
       const reader = new FileReader();
       reader.onload = (e) => resolve(e.target.result.split(',')[1]);
       reader.readAsDataURL(file);
   });

   const timestamp = new Date().getTime();
   const filename = `images/${timestamp}_${file.name}`;
   
   const response = await fetch(`https://api.github.com/repos/sadikyy/whatsapp-sender/contents/${filename}`, {
       method: 'PUT',
       headers: {
           'Authorization': `Bearer ${window.ENV_githubToken}`,
           'Content-Type': 'application/json',
       },
       body: JSON.stringify({
           message: `Upload ${filename}`,
           content: base64Data
       })
   });

   if (!response.ok) {
       throw new Error('Failed to upload to Github');
   }

   const data = await response.json();
   return data.content.download_url;
}
