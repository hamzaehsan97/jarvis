"use strict";

const MongoBot = require("../mongo");
const CryptoJS = require("crypto-js");

// get account secret
const get_secret = async function (req, res) {
  const user = req.email;
  const result = await MongoBot.Users.getUser(user);
  if (result === undefined) {
    res.status(404).send({ message: "user not found" }).end();
  } else {
    if (result.secret) {
      return result.secret;
    } else {
      res.status(404).send({ message: "secret not set for this user" }).end();
    }
    return false;
  }
};

const encryptPassword = async function (req, res) {
  const secret = await get_secret(req, res);
  const req_data = req.query.content;
  const ciphertext = CryptoJS.AES.encrypt(req_data, secret).toString();
  return ciphertext;
};

const decrypt_data = function (data, provided_secret) {
  let bytes = CryptoJS.AES.decrypt(data, provided_secret);
  let decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return decrypted;
};

// posts password
exports.create = async function (req, res) {
  const user = req.email;
  const secret = await get_secret(req, res);
  const password = req.query.password;
  const time = req.requestTime;
  const type = req.query.type ? req.query.type : "password";
  const portal = req.query.portal ? req.query.portal : "";
  if (user && secret) {
    let ciphertext = CryptoJS.AES.encrypt(password, secret).toString();
    let body = {
      content: ciphertext,
      portal: portal,
      type: type,
      creationTime: time,
      email: req.email,
    };
    let result = await MongoBot.Passwords.addPassword(body);
    res.send(result).end();
  } else {
    res.status(403).send({ message: "invalid request" }).end();
  }
};

// gets either all passwords
exports.list = async function (req, res) {
  let key = req.query.key;
  delete req.query.key;
  req.query.email = req.email;
  req.query.portal = req.query.portal
    ? { $regex: req.query.portal }
    : { $regex: "" };
  let query = req.query;
  let result = await MongoBot.Passwords.findPassword(query);
  if (key && result.length > 0) {
    try {
      result.forEach(function (arr, index, item) {
        let decrypted = decrypt_data(arr.content, key);
        if (decrypted) {
          arr.content = decrypted;
        }
      });
    } catch {
      console.log("incorrect pin provided");
    }
  }
  res.send(result).end();
};

// update texties based on id
exports.update = async function (req, res) {
  const id = req.query.id;
  let body = {};
  req.query.content ? (body.content = await encryptPassword(req, res)) : {};
  req.query.type ? (body.type = req.query.type) : {};
  req.query.portal ? (body.portal = req.query.portal) : {};
  body.lastUpdateTime = req.requestTime;
  body.email = req.email;
  const result = await MongoBot.Passwords.updatePassword(id, body);
  res.send(result).end();
};

// delete texties based on _id
exports.delete = async function (req, res) {
  const id = req.query.id;
  const result = await MongoBot.Passwords.delPassword(id);
  res.json({ password_deleted: result }).end();
};
