// utils/uuid.js
export const uuidv4 = () => {
  // Prefer secure randomness if available
  const cryptoObj = global.crypto || (global).crypto;
  let bytes;

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    bytes = cryptoObj.getRandomValues(new Uint8Array(16));
  } else {
    // Fallback: not cryptographically secure, but fine for IDs in most apps
    bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  // RFC 4122: set version (4) and variant (10xxxxxx)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
