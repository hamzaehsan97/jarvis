"use strict";

const MongoBot = require("../db/mongo");
const CryptoJS = require("crypto-js");
const encryption = require("../util/encryption");
const dateUtil = require("../util/date");
// get account secret
const get_secret = async function (req, res) {
  const user = req.email;
  const result = await MongoBot.Users.getUser(user);
  if (result === undefined) {
    res.status(404).send({ message: "user not found" }).end();
  } else {
    if (result.secret) {
      return encryption.decrypt(result.secret, process.env.AUTH_SECRET);
    } else {
      res.status(404).send({ message: "secret not set for this user" }).end();
    }
    return false;
  }
};

// posts password
exports.create = async function (req, res) {
  const user = req.email;
  const secret = await get_secret(req, res);
  const password = req.query.password;
  const username = req.query.username ? req.query.username : "N/A";
  const time = req.requestTime;
  const date = dateUtil.getDate(time);
  const type = req.query.type ? req.query.type : "password";
  const portal = req.query.portal ? req.query.portal : "";
  if (user && secret) {
    let ciphertext = CryptoJS.AES.encrypt(password, secret).toString();
    let body = {
      content: ciphertext,
      portal: portal,
      username: username,
      type: type,
      creationTime: time,
      date: date,
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
        let decrypted = encryption.decrypt(arr.content, key);
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
  const secret = await get_secret(req, res);
  const req_data = req.query.content;
  let body = {};
  req.query.content
    ? (body.content = await encryption.encrypt(secret, req_data))
    : {};
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
