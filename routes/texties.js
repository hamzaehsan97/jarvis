"use strict";

const MongoBot = require("../db/mongo");
const CryptoJS = require("crypto-js");
const dateUtil = require("../util/date");
// posts texties based on type
exports.create = async function (req, res) {
  const content = req.query.content ? req.query.content : "";
  const time = req.requestTime;
  const date = dateUtil.getDate(time);
  const type = req.query.type ? req.query.type : "note";
  let body = {
    content: content,
    type: type,
    creationTime: time,
    date: date,
    email: req.email,
  };
  let result = await MongoBot.Notes.addNotes(body);
  res.send(result).end();
};

// gets either all texties or by filters
exports.list = async function (req, res) {
  req.query.email = req.email;
  req.query.content = req.query.content
    ? { $regex: req.query.content }
    : { $regex: "" };
  let query = req.query;
  let result = await MongoBot.Notes.findNotes(query);
  res.send(result).end();
};

// update texties based on id
exports.update = async function (req, res) {
  const id = req.query.id;
  let body = {};
  req.query.content ? (body.content = req.query.content) : {};
  req.query.type ? (body.type = req.query.type) : {};
  body.lastUpdateTime = req.requestTime;
  body.email = req.email;
  const result = await MongoBot.Notes.updateNote(id, body);
  res.send(result).end();
};

// delete texties based on _id
exports.delete = async function (req, res) {
  const id = req.query.id;
  const result = await MongoBot.Notes.delNote(id);
  res.json({ notes_deleted: result }).end();
};

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

// post secrets with account secrets
exports.create_password = async function (req, res) {
  const user = req.email;
  const secret = await get_secret(req, res);
  const password = req.query.password;
  if (user && secret) {
    let ciphertext = CryptoJS.AES.encrypt(password, secret).toString();
    let bytes = CryptoJS.AES.decrypt(ciphertext, secret);
    let originalText = bytes.toString(CryptoJS.enc.Utf8);
    res
      .send({ encrypted: ciphertext, original: originalText, secret: secret })
      .end();
  } else {
    res.status(403).send({ message: "invalid request" }).end();
  }
};
