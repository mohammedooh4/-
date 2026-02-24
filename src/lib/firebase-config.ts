import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyDNIA9TwvTEgXNSUVP305xWTVu4Aqrp0ek",
    authDomain: "market-management-6129d.firebaseapp.com",
    projectId: "market-management-6129d",
    storageBucket: "market-management-6129d.firebasestorage.app",
    messagingSenderId: "318547026343",
    appId: "1:318547026343:web:fc34f297cf750e852e1682",
    measurementId: "G-SBGCMS9KT5"
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messagingInstance: Messaging | null = null;

/**
 * Get Firebase Messaging instance (only on supported browsers)
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
    if (typeof window === "undefined") return null;

    try {
        const supported = await isSupported();
        if (!supported) {
            console.log("Firebase Messaging: Not supported in this browser");
            return null;
        }
        if (!messagingInstance) {
            messagingInstance = getMessaging(app);
        }
        return messagingInstance;
    } catch (error) {
        console.error("Firebase Messaging: Error initializing:", error);
        return null;
    }
}

export { getToken, onMessage };
