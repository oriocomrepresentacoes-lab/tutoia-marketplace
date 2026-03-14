import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBfB6QYnvfuVyFWbw4NiwC6uF8aITDAS7U",
  authDomain: "tutshop-marketplace.firebaseapp.com",
  projectId: "tutshop-marketplace",
  storageBucket: "tutshop-marketplace.firebasestorage.app",
  messagingSenderId: "538795891753",
  appId: "1:538795891753:web:543e41b0fb80139a695038"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const VAPID_KEY = "BFqQWzWFnL3id0SLETnI1rq-R_2lLc1elv2de37bTjpp0ax0VnU-Of_RNdAmpQCmhK6Gn-VFmmpNYnVbf4oO9vk";
