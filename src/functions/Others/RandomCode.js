import crypto from 'crypto';

export async function generateRandomCode() {
  const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()-_=+';
  const codeLength = 8;
  let code = '';

  return new Promise((resolve, reject) => {
    crypto.randomBytes(codeLength, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        const randomBytes = buffer.toString('base64');
        for (let i = 0; i < codeLength; i++) {
          const randomIndex = Math.floor(randomBytes.charCodeAt(i) / 255 * characters.length);
          code += characters[randomIndex];
        }
        resolve(code);
      }
    });
  });
}