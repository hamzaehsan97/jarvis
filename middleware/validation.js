"use strict";

// Validate request content before passing to
exports.validate = (fields) => {
  return (req, res, next) => {
    console.log("Validating request content for user");
    let error = false;
    let missingFields = [];
    fields.forEach((field) => {
      console.log("this is the req.query" + req.query);
      if (!req.query[field]) {
        error = true;
        missingFields.push(field);
      }
    });
    if (error === true) {
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
