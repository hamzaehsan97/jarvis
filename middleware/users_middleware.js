"use strict";

// create user middleware
exports.createUser = (req, res, next) => {
  if (req.method == "POST") {
    if (req.query.email == null || req.query.password == null) {
      throw new Error("Validation error: email or password cannot be null.");
    }
  }
  next();
};
