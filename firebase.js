import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAauZcB6rPEfhqlr_c-B1Uc_MXVbAUY_iQ",
  authDomain: "stasgpt-471f8.firebaseapp.com",
  projectId: "stasgpt-471f8",
  storageBucket: "stasgpt-471f8.appspot.com",
  messagingSenderId: "317537424062",
  appId: "1:317537424062:web:ecdb013cf65c235430c4ef"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
