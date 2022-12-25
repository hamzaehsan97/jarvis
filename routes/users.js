"use strict";

const MongoBot = require("../mongo");

// create user
exports.create = async function (req, res) {
  const user = {
    email: req.query.email,
    password: req.query.password,
    first_name: req.query.first_name,
    last_name: req.query.last_name,
    phone_number: req.query.phone_number,
  };
  let result = await MongoBot.Users.addUser(user);
  res.send(result).end();
};

// get user by email
exports.read = async function (req, res) {
  let email = "";
  req.query.email ? (email = req.query.email) : (email = null);
  const result = await MongoBot.Users.getUser(email);
  if (result === undefined) {
    res.status(404).send({ message: "user not found" }).end();
  } else {
    res.send(result).end();
  }
};

// update user
exports.update = async function (req, res) {
  const body = {};
  req.query.first_name ? (body.first_name = req.query.first_name) : {};
  req.query.last_name ? (body.last_name = req.query.last_name) : {};
  req.query.password ? (body.password = req.query.password) : {};
  req.query.phone_number ? (body.phone_number = req.query.phone_number) : {};
  try {
    let result = await MongoBot.Users.updateUser(req.email, body);
    return res.send(result).end();
  } catch (e) {
    throw new Error("Internal Service Exception");
  }
};

// delete by email
exports.delete = async function (req, res) {
  if (req.query.email == null) {
    throw new Error("Validation error: email cannot be null.");
  }
  try {
    console.log("trynna delete");
    let result = await MongoBot.Users.delUser(req.query.email);
    if (result === undefined || result < 1) {
      res.status(404).json({ message: "User not found" }).end();
    } else {
      res
        .status(200)
        .json({
          message: "account deleted successfully",
          account: req.query.email,
          num_deleted: result,
        })
        .end();
    }
  } catch (e) {
    throw new Error("Internal Service Exception");
  }
};

// logout user
exports.logout = function (req, res) {
  res.clearCookie("token");
  res.json({ token: null }).end();
};
