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
      .clearCookie("token")
      .send({
        error: "access denied exception. Incorrect username.",
      })
      .end();
  } else if (user.password !== password) {
    return res
      .status(403)
      .clearCookie("token")
      .send({
        error: "access denied exception. Invalid username or login.",
      })
      .end();
  } else if (user !== undefined && user.password === password) {
    const token = jwt.sign(user, process.env.AUTH_SECRET, {
      expiresIn: "1h",
    });
    return res
      .cookie("token", token, { maxAge: 10800 })
      .setHeader("token", token)
      .status(200)
      .send({ token: token })
      .end();
  }
};
