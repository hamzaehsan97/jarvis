"use strict";

const MongoBot = require("../../db/mongo");
const users = require("../users");
const encryption = require("../../util/encryption");
// get all hotline employees

exports.getEmployees = async function (req, res) {
  let body = req.query;
  body.role = "hotline_employee";
  try {
    const result = await MongoBot.Users.getHotlineEmployees(body);
    if (result === undefined) {
      res.status(404).send({ message: "user not found" }).end();
    } else if (result.length === 0) {
      res.status(404).json({
        message: "no employees found with provided filters",
      });
    } else {
      let employees = [];
      result.forEach((employee) => {
        employees.push({
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          phone_number: employee.phone_number,
        });
      });
      res.send(employees).end();
    }
  } catch (ex) {
    res.status(500).json({
      message: "Hotline employee list internal service exception",
    });
  }
};

// create user
exports.createEmployee = async function (req, res) {
  try {
    const user = {
      email: req.query.email,
      password: await encryption.encrypt(
        process.env.AUTH_SECRET,
        req.query.password
      ),
      first_name: req.query.first_name,
      last_name: req.query.last_name,
      phone_number: req.query.phone_number,
      role: "hotline_employee",
      activated: false,
    };
    const result = await MongoBot.Users.addUser(user);
    const verify = await users.sendVerificationEmail(req.query.email);
    if (result.status == 200 && verify.status == 200) {
      result.next = "Email verification sent to " + req.query.email;
      res.send(result).end();
    } else {
      res
        .status(403)
        .send({ message: "Invalid request. User not created successfully" });
    }
  } catch (ex) {
    console.log("Hotline employee create employee exception", ex);
    res
      .status(500)
      .json({
        message: ex.message,
        error: true,
      })
      .end();
  }
};
