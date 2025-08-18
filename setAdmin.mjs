import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

async function setAdmin(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log("Admin set for:", email);
    console.log("User UID:", user.uid);
  } catch (error) {
    console.error("Error setting admin:", error);
  }
}

setAdmin("us@homelistingai.com");
