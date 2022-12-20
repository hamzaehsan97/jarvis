const jwt = require("jsonwebtoken");

exports.cookieJwtAuth = (req, res, next) => {
  const token = req.cookies.token;
  try {
    const user = jwt.verify(token, process.env.AUTH_SECRET);
    req.user = user;
    console.log("user = ", user);
    next();
  } catch (err) {
    console.log(err);
    res.clearCookie("token").end();
    throw new Error("Access denied exception. Token is expired.");
  }
};
