const jwt = require("jsonwebtoken");
const MongoBot = require("../../../db/mongo");
const encryption = require("../../../util/encryption");
const logger = require("../../../util/logger")
var AWS = require("aws-sdk");
require("dotenv").config();

module.exports = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  AWS.config.update({ region: "us-west-2" });

  const ddb = new AWS.DynamoDB.DocumentClient();

  var authParams = {
    Key: {
      accountEmail: email,
    },
    TableName: "Accounts",
  };

  ddb.get(authParams, function(err, data){
    if(err || Object.keys(data).length < 1){
      logger.logError("failed to load user for authentication. Email: "+email, err, req);
    }else{
      logger.log("successfully loaded user for authentication. Email: "+email, req);
      const user = data.Item;
      const decrypted_password = encryption.decrypt(
        user.password,
        process.env.AUTH_SECRET
      );
      if(user.emailVerified !== true){
        logger.logError("authentication failed because user is not verified: "+user.email, {}, req);
        next("User account is not verified. Please verify account to authenticate.")
      }else if(password !== decrypted_password){
        logger.logError("authentication failed because incorrect password was provided for email: "+user.email, {}, req);
        next("Incorrect email or password")
      }else if(password === decrypted_password && user.emailVerified === true){
        logger.log("Successfully authenticated user. Email:"+email, req);
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
    }
  });
};
