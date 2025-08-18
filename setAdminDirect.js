const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

async function setAdminClaim() {
  try {
    const email = 'us@homelistingai.com';
    console.log(`Setting admin claim for: ${email}`);
    
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${user.uid}`);
    
    // Set admin claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log('Admin claim set successfully!');
    
    // Verify the claim was set
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('Updated user claims:', updatedUser.customClaims);
    
    console.log('✅ Admin claim set successfully for us@homelistingai.com');
  } catch (error) {
    console.error('❌ Error setting admin claim:', error);
  }
}

setAdminClaim();
