import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const response = await fetch("/api/firebase-config");
if (!response.ok) {
  throw new Error("Failed to load Firebase configuration");
}
const firebaseConfig = await response.json();

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
