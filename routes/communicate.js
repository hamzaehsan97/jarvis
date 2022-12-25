"use strict";

const jwt = require("jsonwebtoken");
const MongoBot = require("../mongo");

let users = [
  { name: "TJ", email: "tj@vision-media.ca" },
  { name: "Tobi", email: "tobi@vision-media.ca" },
];

exports.list = function (req, res) {
  res.send(users);
};
