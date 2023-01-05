"use strict";

const MongoBot = require("../mongo");
const mailman = require("../util/mailman");
const constants = require("../constants/comms_constants");
const otp_check = require("../util/verify_otp");

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

exports.create_otp = async function (req, res) {
  const email = req.query.email;
  let user = await MongoBot.Users.getUser(email);
  if (user === undefined) {
    req.status(404).send({ message: "user not found" });
  } else {
    const otp = Math.floor(1000 + Math.random() * 9000);
    const body = {
      otp: otp,
    };
    let add_otp = await MongoBot.Users.updateUser(email, body);
    if (add_otp === undefined) {
      res.status(404).send({ message: "unable to send retrieval code" }).end();
    } else {
      mailman
        .send_mail(
          email,
          constants.account_retrieval.subject,
          constants.account_retrieval.text + otp
        )
        .then((response) => res.send(response.message))
        .catch((error) => res.status(500).send(error.message));
    }
  }
};

// verify if otp is correct
exports.verify_otp = async function (req, res) {
  const email = req.query.email;
  const otp = req.query.otp;
  let check = await otp_check.verify_otp(email, otp);
  if (check === null) {
    res
      .status(500)
      .send({ message: "Internal Service Exception. could not verify OTP." });
  } else {
    res.send(check.message).end();
  }
};

// Check if otp correct, change password
exports.update_password = async function (req, res) {
  const email = req.email;
  const otp = req.query.otp;
  const new_password = req.query.password;
  let check = await otp_check.verify_otp(email, otp);
  if (check.status === 200) {
    let result = await MongoBot.Users.updateUser(email, {
      password: new_password,
    });
    if (result.modifiedCount > 0 && result.modifiedCount < 2) {
      res.send({ message: "password changed successfully" }).end();
    } else {
      res
        .status(500)
        .send({
          message:
            "Interal Service Exception. Password change failed with unknown error.",
        })
        .end();
    }
  } else {
    res.status(403).send({ message: check.message }).end();
  }
};

// set account secret
exports.set_secret = async function (req, res) {
  const user = req.email;
  const secret = req.query.secret;
  const body = {
    secret: secret,
  };
  let add_secret = await MongoBot.Users.updateUser(user, body);
  if (add_secret.modifiedCount > 0) {
    res.json({ message: "secret set successfully" }).end();
  } else {
    res.status(500).json({ message: "unknown error in setting status" }).end();
  }
};

// get account secret
exports.get_secret = async function (req, res) {
  const user = req.email;
  const result = await MongoBot.Users.getUser(user);
  if (result === undefined) {
    res.status(404).send({ message: "user not found" }).end();
  } else {
    if (result.secret) {
      res.json({ secret: result.secret }).end();
    } else {
      res.status(404).send({ message: "secret not set for this user" }).end();
    }
  }
};

// logout user
exports.logout = function (req, res) {
  res.clearCookie("token");
  res.json({ token: null }).end();
};
