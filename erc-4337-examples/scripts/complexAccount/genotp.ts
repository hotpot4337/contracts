const TOTP = require('totp.js');

// const log = console.log;
const log = function (...args: any) {};

export default function main(): { key: string, otps: any[]} {

  // generate a base32 secret key
  // const key = 'GAXHMMZSNB3DOOBU'
  const key = TOTP.randomKey();
  // 'GAXGGYT2OU2DEOJR' => 'otpauth://totp/handsome@totp.js?issuer=Totp.js&secret=GAXGGYT2OU2DEOJR'
  log('import manually:', key)

  // const totp = new TOTP(key);
  const hotpot = new TOTP.HOTP(key)

  const timeStep = 30
  const count = 16;
  const movingFactorOffset = Math.floor((Date.now() / 1000) / timeStep);
  const otps: string[] = [];
  for (let i = 0; i < count; i++) {
    otps.push(hotpot.genOTP(movingFactorOffset + i))
    log(hotpot.genOTP(movingFactorOffset + i))
  }

  log(`next ${count} otps = ${count/2} minutes:`, otps)

  return { key, otps }
}