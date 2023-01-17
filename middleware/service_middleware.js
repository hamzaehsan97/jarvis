"use strict";
const MongoBot = require("../db/mongo");

// Check if service is activated for req author
exports.service_activated = (service) => {
  return async (req, res, next) => {
    const email = req.email;
    const result = await MongoBot.Users.getUser(email);
    if (
      result === undefined ||
      result.services[service] == false ||
      !result.services[service]
    ) {
      res
        .status(401)
        .json({ message: "This service is not activated for the user" })
        .end();
    } else {
      req.service = service;
    }
    next();
  };
};
