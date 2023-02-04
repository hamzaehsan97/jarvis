"use strict";

const MongoBot = require("../db/mongo");
const mailman = require("../util/mailman");
const constants = require("../constants/comms_constants");
const otp_check = require("../util/verify_otp");
const encryption = require("../util/encryption");
require("dotenv").config();

// create user
exports.create = async function (req, res) {
  const user = {
    email: req.query.email,
    password: await encryption.encrypt(
      process.env.AUTH_SECRET,
      req.query.password
    ),
    first_name: req.query.first_name,
    last_name: req.query.last_name,
    phone_number: req.query.phone_number,
    activated: false,
  };
  const result = await MongoBot.Users.addUser(user);
  const verify = await sendVerificationEmail(req.query.email);
  if (result.status == 200 && verify.status == 200) {
    result.next = "Email verification sent to " + req.query.email;
    res.send(result).end();
  } else {
    res
      .status(403)
      .send({ message: "Invalid request. User not created successfully" });
  }
};

const sendVerificationEmail = async (email) => {
  const otp = Math.floor(1000 + Math.random() * 9000);
  const add_otp = await otp_check.update_OTP(otp, email);
  if (add_otp == false) {
    return { status: 403 };
  } else {
    const mail = await mailman.send_mail(
      email,
      constants.verify_email.subject,
      constants.account_retrieval.text + otp
    );
    return mail;
  }
};
exports.sendVerificationEmail = sendVerificationEmail;

// get user by email
const read = async function (req, res) {
  let email = "";
  req.query.email ? (email = req.query.email) : (email = null);
  const result = await MongoBot.Users.getUser(email);
  if (result === undefined) {
    res.status(404).send({ message: "user not found" }).end();
  } else {
    res.send(result).end();
  }
};
exports.read = read;

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
    let add_otp = otp_check.update_OTP(otp, email);
    if (add_otp == false) {
      res.status(404).send({ message: "unable to send retrieval code" }).end();
    } else {
      mailman
        .send_mail(
          email,
          constants.account_retrieval.subject,
          constants.account_retrieval.text + otp
        )
        .then((response) =>
          res.json({ message: "Password reset email send successfully" }).end()
        )
        .catch((error) => res.status(500).send(error.message));
    }
  }
};

// verify if otp is correct
exports.verify_otp = async function (req, res) {
  const email = req.query.email;
  const otp = req.query.otp;
  let check = await otp_check.verify_otp(email, otp);
  if (check.status !== 200) {
    res.status(500).send({
      message: "Could not verify OTP. Try again please.",
      status: 403,
    });
  } else {
    res.send({ message: check.message, status: 200 }).end();
  }
};

// Verify account
exports.verify_account = async function (req, res) {
  const email = req.query.email;
  const otp = req.query.otp;
  let check = await otp_check.verify_otp(email, otp);
  if (check === null) {
    res
      .status(500)
      .send({ message: "Internal Service Exception. could not verify OTP." });
  } else {
    let result = await MongoBot.Users.updateUser(email, {
      activated: true,
    });
    if (result.modifiedCount > 0) {
      res.send({ message: check.message, status: 200 }).end();
    } else {
      res.send({ message: "Error activating account.", status: 500 }).end();
    }
  }
};

// Check if otp correct, change password
exports.update_password = async function (req, res) {
  const email = req.query.email;
  const new_password = encryption.encrypt(
    process.env.AUTH_SECRET,
    req.query.password
  );
  const otp = req.query.otp;
  let check = await otp_check.verify_otp(email, otp);
  if (check.status === 200) {
    let result = await MongoBot.Users.updateUser(email, {
      password: new_password,
    });
    if (result.modifiedCount > 0 && result.modifiedCount < 2) {
      res.json({ message: "password changed successfully" }).end();
    } else {
      res
        .status(500)
        .json({
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
  if (secret === null || secret === undefined || secret === "") {
    res.status(403).json({ message: "validation exception" }).end();
  } else {
    let encrypted = encryption.encrypt(process.env.AUTH_SECRET, secret);
    const body = {
      secret: encrypted,
    };
    let add_secret = await MongoBot.Users.updateUser(user, body);
    if (add_secret.modifiedCount > 0) {
      res.json({ message: "secret set successfully" }).end();
    } else {
      res
        .status(500)
        .json({ message: "unknown error in setting status" })
        .end();
    }
  }
};

// logout user
exports.logout = function (req, res) {
  res.clearCookie("token");
  res.json({ token: null }).end();
};
