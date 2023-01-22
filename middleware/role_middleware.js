"use strict";
const MongoBot = require("../db/mongo");

// Check if users role matches required role for API
exports.role_check = (accepted_roles) => {
  return async (req, res, next) => {
    const email = req.email;
    const result = await MongoBot.Users.getUser(email);
    if (
      result === undefined ||
      !result.role ||
      !accepted_roles.includes(result.role)
    ) {
      res
        .status(401)
        .json({ message: "User does not have previlage to access this API." })
        .end();
    } else {
      req.role = result.role;
      next();
    }
  };
};
