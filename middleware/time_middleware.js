"use strict";

exports.requestTime = function (req, res, next) {
  req.requestTime = Date.now();
  console.log("Time:", req.requestTime);
  next();
};
