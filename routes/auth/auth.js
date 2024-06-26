const jwt = require("jsonwebtoken");
const MongoBot = require("../../db/mongo");
const encryption = require("../../util/encryption");
const logger = require("../../util/logger")
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
    logger.log({exception: "access denied exception. Incorrect username.", username: email}, req)
    return res
      .status(404)
      .clearCookie("token")
      .send({
        error: true,
        message: "access denied exception. Incorrect username.",
      })
      .end();
  } else if (decrypted_password !== password) {
    logger.log({exception: "access denied exception. Invalid username or login.", username: email}, req)
    return res
      .status(403)
      .clearCookie("token")
      .send({
        error: true,
        message: "access denied exception. Invalid username or login.",
      })
      .end();
  } else if (user.activated === false) {
    logger.log({exception: "User is not verified yet. Please check account verification email or request account verification.", username: email}, req)
    res
      .status(405)
      .clearCookie("token")
      .send({
        error: true,
        message:
          "User is not verified yet. Please check account verification email or request account verification.",
      })
      .end();
  } else if (
    user !== undefined &&
    decrypted_password === password &&
    user.activated === true
  ) {
    logger.log({message: "User is successfully logged in.", username: email}, req)
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
