const jwt = require("jsonwebtoken");
require("dotenv").config();
const logger = require("../util/logger");

exports.validate = (req, res, next) => {
  let token = req.get("token");
  if (!token) {
    logger.log("token not in header, checking for token in parameters",req);
    token = req.query.token;
    if (!token) {
      res.json({
        error: "accessDeniedException",
        message: "Token is missing from request",
      });
    }
  }
  try {
    const user = jwt.verify(token, process.env.AUTH_SECRET);
    req.user = user;
    req.email = user.accountEmail;
    req.instanceID = user.instanceID;
    next();
  } catch (err) {
    res.clearCookie("token");
    res.json({
      error: "accessDeniedException",
      message: err,
    });
  }
};
