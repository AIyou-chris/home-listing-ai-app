import * as admin from "firebase-admin";
if (admin.apps.length === 0) admin.initializeApp();
const u = await admin.auth().getUserByEmail("us@homelistingai.com");
await admin.auth().setCustomUserClaims(u.uid, { admin: true });
console.log("Admin claim set successfully for us@homelistingai.com");
