"use strict";

// Validate request content before passing to
exports.validate = (fields) => {
  return (req, res, next) => {
    console.log("Validating request content for user");
    let error = false;
    fields.forEach((field) => {
      if (!req.query[field]) {
        error = true;
        res
          .status(400)
          .json({
            message: "Request is missing required field <" + field + ">",
            error: error,
          })
          .end();
      }
    });
    if (error === false) {
      next();
    }
  };
};
