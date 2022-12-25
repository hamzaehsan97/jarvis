const jwt = require("jsonwebtoken");
const MongoBot = require("../mongo");
require("dotenv").config();

module.exports = async (req, res) => {
  const email = req.query.email;
  const password = req.query.password;
  const user = await MongoBot.Users.getUser(email);
  if (user === undefined) {
    return res
      .status(404)
      .json({
        error: "access denied exception. Incorrect username.",
      })
      .clearCookie("token")
      .end();
  } else if (user.password !== password) {
    return res
      .status(403)
      .json({
        error: "access denied exception. Invalid username or login.",
      })
      .clearCookie("token")
      .end();
  } else {
    console.log("user" + user);
    const token = jwt.sign(user, process.env.AUTH_SECRET, {
      expiresIn: "1h",
    });
    res
      .cookie("token", token, { maxAge: 10800 })
      .status(200)
      .json({ token: token })
      .end();
  }
};
