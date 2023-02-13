const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.validate = (req, res, next) => {
  let token = req.get("token");
  if (!token) {
    console.log("token not in header, checking for token in parameters");
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
    req.email = user.email;
    next();
  } catch (err) {
    // console.log(err);
    res.clearCookie("token");
    res.json({
      error: "accessDeniedException",
      message: err,
    });
  }
};
