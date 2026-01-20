// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD3g9WiUf_LNAkphCkIubFE8Di9UftiAJw",
    authDomain: "ai-lumina-a14b1.firebaseapp.com",
    projectId: "ai-lumina-a14b1",
    storageBucket: "ai-lumina-a14b1.firebasestorage.app",
    messagingSenderId: "779883879598",
    appId: "1:779883879598:web:84e08de4b8f7796ed2613f",
    measurementId: "G-RTLQEG4MMQ"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const db = firebase.firestore();

// Make available globally for other scripts
window.db = db;
console.log("Firebase initialized successfully");
