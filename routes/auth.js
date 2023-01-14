const jwt = require("jsonwebtoken");
const MongoBot = require("../db/mongo");
const encryption = require("../util/encryption");
require("dotenv").config();

module.exports = async (req, res) => {
  const email = req.query.email;
  const password = req.query.password;
  const user = await MongoBot.Users.getUser(email);
  const decrypted_password = encryption.decrypt(
    user.password,
    process.env.AUTH_SECRET
  );
  if (user === undefined) {
    return res
      .status(404)
      .clearCookie("token")
      .send({
        error: "access denied exception. Incorrect username.",
      })
      .end();
  } else if (decrypted_password !== password) {
    return res
      .status(403)
      .clearCookie("token")
      .send({
        error: "access denied exception. Invalid username or login.",
      })
      .end();
  } else if (user.activated === false) {
    res
      .status(405)
      .clearCookie("token")
      .send({
        message:
          "User is not verified yet. Please check account verification email or request account verification.",
      })
      .end();
  } else if (
    user !== undefined &&
    decrypted_password === password &&
    user.activated === true
  ) {
    const token = jwt.sign(user, process.env.AUTH_SECRET, {
      expiresIn: "3h",
    });
    return res
      .cookie("token", token, { maxAge: 10800 })
      .setHeader("token", token)
      .status(200)
      .send({ token: token })
      .end();
  }
};
