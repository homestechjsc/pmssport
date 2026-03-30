import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, onValue, push, set, update, increment, remove, runTransaction, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBDHLEhcMPuI6CaC9MGrnAJxSnnZdMZwx8",
    databaseURL: "https://pms-pickleball-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "pms-pickleball",
    appId: "1:34607569124:web:85977243452d0549a734f1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ĐẨY RA CỬA SỔ TOÀN CỤC (WINDOW) ĐỂ CÁC FILE JS KHÁC SỬ DỤNG ĐƯỢC
window.db = db;
window.ref = ref;
window.get = get;
window.onValue = onValue;
window.push = push;
window.set = set;
window.update = update;
window.increment = increment;
window.remove = remove;
window.runTransaction = runTransaction;
window.fbQuery = query;
window.fbLimit = limitToLast;

console.log("✅ 1. Firebase đã sẵn sàng và đã cấp quyền window.");