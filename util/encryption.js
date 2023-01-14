const CryptoJS = require("crypto-js");

const encryptData = function (secret, content) {
  const ciphertext = CryptoJS.AES.encrypt(content, secret).toString();
  return ciphertext;
};
exports.encrypt = encryptData;

const decryptData = function (data, secret) {
  let bytes = CryptoJS.AES.decrypt(data, secret);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return decrypted;
};
exports.decrypt = decryptData;
