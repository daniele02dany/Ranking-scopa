const firebaseConfig = {
  apiKey: "AIzaSyAY96Kmkj1kUbQFB3l5u9Guc11pgbj_0TM",
  authDomain: "ranking-scopa.firebaseapp.com",
  projectId: "ranking-scopa",
  storageBucket: "ranking-scopa.firebasestorage.app",
  messagingSenderId: "163226144228",
  appId: "1:163226144228:web:c5d6110d83f4c22e5e4bf1",
  measurementId: "G-0ZFN4NKFFE"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();