// Makes the two keys that push notifications need. Run once:  node scripts/vapid-keys.mjs
// Put VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY on Render (the API). Keep the private key secret and never change it later,
// or every phone has to turn reminders on again.
import { generateKeyPairSync } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = publicKey.export({ format: 'jwk' });
const prv = privateKey.export({ format: 'jwk' });
const point = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')]).toString('base64url');
console.log(`VAPID_PUBLIC_KEY=${point}`);
console.log(`VAPID_PRIVATE_KEY=${prv.d}`);
console.log('VAPID_SUBJECT=mailto:you@example.com   (optional, use a real email you own)');
