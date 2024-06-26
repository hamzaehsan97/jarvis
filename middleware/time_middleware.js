"use strict";
const logger = require('../util/logger');


exports.requestTime = function (req, res, next) {
  req.requestTime = Date.now();
  var requestLog = logger.createRequestLog(req);
  console.log(requestLog);
  next();
};

