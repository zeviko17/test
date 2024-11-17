// קריאת משתני הסביבה
const idInstance = process.env.NEXT_PUBLIC_idInstance;
const apiTokenInstance = process.env.NEXT_PUBLIC_apiTokenInstance;
const sheetId = process.env.NEXT_PUBLIC_sheetId;

// לוג לבדיקה
console.log('Environment loaded:', {
    idInstance,
    apiTokenInstance,
    sheetId
});

// בדיקת שגיאות
if (!sheetId) {
    console.error('Failed to load sheetId from environment variables');
}
