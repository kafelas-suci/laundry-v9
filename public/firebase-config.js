import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD5iCMLt6XFMI2Wb-JB97a7_DY8tbfLJW4",
  authDomain: "kafilasuci4.firebaseapp.com",
  projectId: "kafilasuci4",
  storageBucket: "kafilasuci4.firebasestorage.app",
  messagingSenderId: "125487710715",
  appId: "1:125487710715:web:337d5032dba2029eb1cb5e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
