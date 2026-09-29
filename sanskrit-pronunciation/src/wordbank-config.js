import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export const wordBankConfig = {
  firebase: {
    apiKey: "AIzaSyAhG1DgCvjg4rSmd1cNzRsylEdRnXG6ON4",
    authDomain: "sanskrit-pronounciation.firebaseapp.com",
    projectId: "sanskrit-pronounciation",
    storageBucket: "sanskrit-pronounciation.firebasestorage.app",
    messagingSenderId: "357826577553",
    appId: "1:357826577553:web:a034a0054dd66e6de12b30",
    measurementId: "G-QD9C2BKS70"
  },
  collection: "words",
  documentId: "words_1",
  field: "words"
};

const wordBankAppName = "wordbank";
const wordBankApp = getApps().some((app) => app.name === wordBankAppName)
    ? getApp(wordBankAppName)
    : initializeApp(wordBankConfig.firebase, wordBankAppName);

export const wordBankDb = getFirestore(wordBankApp);