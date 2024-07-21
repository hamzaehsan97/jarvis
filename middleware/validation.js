"use strict";
var logger = require('../util/logger');

// Validate request content before passing to
exports.validate = (fields) => {
  return (req, res, next) => {
    logger.log("Validating request content for user "+req.email, req);
    let error = false;
    let missingFields = [];
    fields.forEach((field) => {
      if (!req.query[field] && !req.body[field]) {
        error = true;
        missingFields.push(field);
      }
    });
    if (error === true) {
      logger.log("Request is missing required fields [" + missingFields + "]", req);
      res
        .status(400)
        .send({
          message: "Request is missing required fields [" + missingFields + "]",
          error: error,
        })
        .end();
    } else {
      next();
    }
  };
};
