// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "product-showcase-f0j2q",
  "appId": "1:860688427657:web:1aed58ba41bd0b89603458",
  "storageBucket": "product-showcase-f0j2q.firebasestorage.app",
  "apiKey": "AIzaSyCyE5t1H1lsw2iuWEalsG6FSgpDrnm0rrU",
  "authDomain": "product-showcase-f0j2q.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "860688427657"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
export const messaging = () => getMessaging(app);
