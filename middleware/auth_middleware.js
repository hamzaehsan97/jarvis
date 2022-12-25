const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.validate = (req, res, next) => {
  const token = req.get("token");
  try {
    const user = jwt.verify(token, process.env.AUTH_SECRET);
    req.user = user;
    req.email = user.email;
    next();
  } catch (err) {
    console.log(err);
    console.log("clearing the token");
    res.clearCookie("token").end();
    throw new Error("Access denied exception. Token is expired.");
  }
};
