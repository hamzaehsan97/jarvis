"use strict";

const MongoBot = require("../db/mongo");

// posts leads
exports.create = async function (req, res) {
  const name = req.query.name;
  const phone_number = req.query.phone_number;
  const size = req.query.size ? req.query.size : -1;
  const society = req.query.society ? req.query.society : "any";
  const budget = req.query.budget ? req.query.budget : -1;
  const time = req.requestTime;
  if (name && phone_number && size && society && society) {
    let body = {
      name: name,
      phone_number: phone_number,
      size: size,
      society: society,
      author: req.email,
      creationTime: time,
      budget: budget,
    };
    let result = await MongoBot.Leads.addLead(body);
    res.send(result).end();
  } else {
    res.status(403).json({ message: "invalid request." });
  }
};

// gets either all texties or by filters
exports.list = async function (req, res) {
  req.query.author = req.email;
  req.query.name = req.query.name ? { $regex: req.query.name } : { $regex: "" };
  let query = req.query;
  let result = await MongoBot.Leads.findLeads(query);
  res.send(result).end();
};

// // update texties based on id
// exports.update = async function (req, res) {
//   const id = req.query.id;
//   let body = {};
//   req.query.content ? (body.content = req.query.content) : {};
//   req.query.type ? (body.type = req.query.type) : {};
//   body.lastUpdateTime = req.requestTime;
//   body.email = req.email;
//   const result = await MongoBot.Notes.updateNote(id, body);
//   res.send(result).end();
// };

// delete texties based on _id
exports.delete = async function (req, res) {
  const id = req.query.id;
  const result = await MongoBot.Leads.delLead(id);
  res.json({ leads_deleted: result }).end();
};

// // get account secret
// const get_secret = async function (req, res) {
//   const user = req.email;
//   const result = await MongoBot.Users.getUser(user);
//   if (result === undefined) {
//     res.status(404).send({ message: "user not found" }).end();
//   } else {
//     if (result.secret) {
//       return result.secret;
//     } else {
//       res.status(404).send({ message: "secret not set for this user" }).end();
//     }
//     return false;
//   }
// };

// // post secrets with account secrets
// exports.create_password = async function (req, res) {
//   const user = req.email;
//   console.log("here");
//   const secret = await get_secret(req, res);
//   const password = req.query.password;
//   if (user && secret) {
//     console.log("user", user);
//     console.log("secret", secret);
//     let ciphertext = CryptoJS.AES.encrypt(password, secret).toString();
//     console.log("ciphertext", ciphertext);
//     let bytes = CryptoJS.AES.decrypt(ciphertext, secret);
//     let originalText = bytes.toString(CryptoJS.enc.Utf8);
//     console.log("original", originalText);
//     res
//       .send({ encrypted: ciphertext, original: originalText, secret: secret })
//       .end();
//   } else {
//     res.status(403).send({ message: "invalid request" }).end();
//   }
// };
