import { createCanvas } from 'canvas';
import crypto from 'crypto';

const canvasWidth = 200;
const canvasHeight = 80;
const fontSize = 50;
const fontFamily = 'Arial';
const fontColor = '#FFFFFF';

export function generateCaptcha() {
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#' + (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const captcha = crypto.randomBytes(4).toString('base64').slice(0, 6);

  ctx.fillStyle = fontColor;
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(captcha, canvasWidth / 2, canvasHeight / 2);

  return {
    image: canvas.toBuffer(),
    captcha: captcha
  };
}