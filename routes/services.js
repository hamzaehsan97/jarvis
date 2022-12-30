"use strict";

const MongoBot = require("../mongo");
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
    const services = { [req_service]: active };
    flatten(services);
    const body = { services };
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
