import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../services/firebase";

export function waitForUser(): Promise<User> {
  return new Promise((resolve, reject) => {
    const off = onAuthStateChanged(auth, (u) => {
      off();
      if (!u) return reject(new Error("Not signed in"));
      resolve(u);
    });
  });
}
