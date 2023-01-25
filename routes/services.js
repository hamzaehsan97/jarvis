"use strict";

const MongoBot = require("../db/mongo");
const mailman = require("../util/mailman");
const constants = require("../constants/comms_constants");
const otp_check = require("../util/verify_otp");
const service_constants = require("../constants/service_constants");

// Activate/Deactivate service based on service name and boolean active value
exports.activate_service = async function (req, res) {
  const req_service = req.query.service;
  const active = req.query.active;
  if (
    service_constants.services.includes(req_service) &&
    active !== null &&
    active !== undefined
  ) {
    const status = active == "true" ? true : false;
    const services = { [req_service]: status };
    flatten(services);
    let body = { services };
    body = flatten(body);
    const result = await MongoBot.Services.activate_service(req.email, body);
    res.send(result).end();
  } else {
    res
      .status(404)
      .send({ message: "Requested service is not available" })
      .end();
  }
};

const flatten = (obj, prefix, result) => {
  result = result || {};
  for (let key of Object.keys(obj)) {
    let keyExpr = prefix ? `${prefix}.${key}` : `${key}`;
    if (typeof obj[key] === "object") {
      flatten(obj[key], keyExpr, result);
    } else {
      result[keyExpr] = obj[key];
    }
  }
  return result;
};

// Get all acount services
exports.read_services = async function (req, res) {
  let email = req.email;
  const result = await MongoBot.Users.getUser(email);
  if (result === undefined) {
    res.status(404).send({ message: "user not found" }).end();
  } else {
    res.send(result.services).end();
  }
};

// Check if a specific service is activated for the account
exports.is_activated = async function (email, service) {
  try {
    const user = await MongoBot.Users.getUser(email);
    if (user && user.services[service] && user.services[service] === true) {
      return true;
    } else {
      return false;
    }
  } catch (exception) {
    console.log("Error in checking if service is active", exception);
    return false;
  }
};
