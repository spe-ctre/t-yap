const result = require('dotenv').config();

if (result.error) {
  console.log("DOTENV ERROR:", result.error.message);
} else {
  console.log("Dotenv loaded OK");
  const parsedKeys = Object.keys(result.parsed || {});
  console.log("All parsed keys:", parsedKeys);
  console.log("Firebase-related parsed keys:", parsedKeys.filter(k => k.includes('FIREBASE')));
}

console.log(JSON.stringify({
  hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
  hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
  hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY
}, null, 2));
