"use strict";

const MongoBot = require("../mongo");

// posts texties based on type
exports.create = async function (req, res) {
  const content = req.query.content ? req.query.content : "";
  const time = req.requestTime;
  const type = req.query.type ? req.query.type : "note";
  let body = {
    content: content,
    type: type,
    creationTime: time,
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
  result = await MongoBot.Notes.delNote(id);
  res.json({ notes_deleted: result }).end();
};
