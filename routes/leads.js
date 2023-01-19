"use strict";

const MongoBot = require("../db/mongo");

// posts leads
exports.create = async function (req, res) {
  const name = req.query.name;
  const phone_number = req.query.phone_number;
  const size = req.query.size ? req.query.size : -1;
  const society = req.query.society ? req.query.society : "";
  const budget = req.query.budget ? req.query.budget : -1;
  const assignee = req.query.assignee ? req.query.assignee : req.email;
  const wants_to = req.query.wants_to ? req.query.wants_to : "";
  const block = req.query.block ? req.query.block : "";

  req.query.block ? (body.block = req.query.block) : {};
  req.query.wants_to ? (body.wants_to = req.query.wants_to) : {};
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
      assignee: assignee,
      block: block,
      wants_to: wants_to,
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

// update texties based on id
exports.update = async function (req, res) {
  const id = req.query.id;
  let body = {};
  req.query.name ? (body.name = req.query.name) : {};
  req.query.society ? (body.society = req.query.society) : {};
  req.query.size ? (body.size = req.query.size) : {};
  req.query.phone_number ? (body.phone_number = req.query.phone_number) : {};
  req.query.assignee ? (body.assignee = req.query.assignee) : {};
  req.query.block ? (body.block = req.query.block) : {};
  req.query.wants_to ? (body.wants_to = req.query.wants_to) : {};
  body.lastUpdateTime = req.requestTime;
  try {
    const result = await MongoBot.Leads.updateLead(id, body);
    res.send(result).end();
  } catch {
    res
      .status(400)
      .json({
        message: "error in updating lead.",
      })
      .end();
  }
};

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
