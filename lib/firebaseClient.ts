import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAwfuss2PPc6rG3MJIJxZFJ5ZuzC9L4KHI",
  authDomain: "mman-plaza.firebaseapp.com",
  projectId: "mman-plaza",
  storageBucket: "mman-plaza.firebasestorage.app",
  messagingSenderId: "328867796060",
  appId: "1:328867796060:web:af1fd5cc070d3097084299",
};

const app = initializeApp(firebaseConfig);

export async function getMessagingSafe() {
  if (!(await isSupported())) return null;
  return getMessaging(app);
}
