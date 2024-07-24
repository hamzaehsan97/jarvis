"use strict";

const MongoBot = require("../../db/mongo");
const mailman = require("../../util/mailman");
const constants = require("../../constants/comms_constants");
const otp_check = require("../../util/verify_otp");
const encryption = require("../../util/encryption");
const validation = require("../../util/validation");
const logger = require("../../util/logger");
const connect_constants = require("../../constants/connect_constants");
const users_table_name = "Accounts";
const emailUtil = require("../../util/email");
var AWS = require("aws-sdk");

require("dotenv").config();

// create user (add user to both DDB and MongoDB)
exports.create = async function (req, res, next) {
      if(!validation.phone_number_validate(req.body.phoneNumber)){
        const phone_number_validation_error = new Error("Phone number validation failed");
        logger.logError("Phone number validation failed for email: "+req.body.email, phone_number_validation_error, req);
        next(phone_number_validation_error.message);
      }else{
        const otp_code = Math.floor(1000 + Math.random() * 9000);
        // Create the DynamoDB service object
        AWS.config.update({ region: "us-west-2" });
  
        const ddb = new AWS.DynamoDB.DocumentClient();
  
        var userObject = {
          accountEmail: req.body.email,
          password: await encryption.encrypt(
            process.env.AUTH_SECRET,
            req.body.password
          ),
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          phoneNumber: req.body.phoneNumber,
          emailVerified: false,
          phoneNumberVerified: false,
          paymentMethodVerified: false,
          otp: otp_code
        }
  
        var params = {
          TableName: users_table_name,
          Item: userObject,
          ConditionExpression: 'attribute_not_exists(accountEmail) AND attribute_not_exists(phoneNumber)'
        };
  
        ddb.put(params, async function (err, data) {
          if(err){
            logger.logError("Error in creating user for email: "+req.body.email, err, req);
            next(err);
          }else{
            logger.log("Successfully created DDB user entry for email: "+req.body.email, req);
            await emailUtil.sendEmail(req.body.email, constants.verify_email.text+otp_code, constants.verify_email.subject)
            res.send("Account verification email sent");            
          }
      });
    }
};

// get user by email
exports.read = async function (req, res) {
  const email = req.body.email;
  if(req.email !== "hamzaehsan75@gmail.com"){

    AWS.config.update({ region: "us-west-2" });

    const ddb = new AWS.DynamoDB.DocumentClient();
  
    var userParams = {
      Key: {
        accountEmail: email,
      },
      TableName: "Accounts",
    };

    ddb.get(userParams, function(err, data){
      if(err || Object.keys(data).length < 1){
        if(err){
          logger.logError("Error in reading user data for user: "+email, err, req);
        }
        next(new Error("User not found.".message));
      }else{
        res.send(data.Item);
      }
    })
  }
}

// update user
exports.update = async function (req, res) {
  const body = {};
  req.query.first_name ? (body.first_name = req.query.first_name) : {};
  req.query.last_name ? (body.last_name = req.query.last_name) : {};
  req.query.phone_number ? (body.phone_number = req.query.phone_number) : {};
  try {
    let result = await MongoBot.Users.updateUser(req.email, body);
    return res.send(result).end();
  } catch (e) {
    throw new Error("Internal Service Exception");
  }
};

// delete by email
exports.delete = async function (req, res) {
  if (req.query.email == null) {
    throw new Error("Validation error: email cannot be null.");
  }
  try {
    let result = await MongoBot.Users.delUser(req.query.email);
    if (result === undefined || result < 1) {
      res.status(404).json({ message: "User not found" }).end();
    } else {
      res
        .status(200)
        .json({
          message: "account deleted successfully",
          account: req.query.email,
          num_deleted: result,
        })
        .end();
    }
  } catch (e) {
    throw new Error("Internal Service Exception");
  }
};

exports.create_otp = async function (req, res) {
  const email = req.query.email;
  let user = await MongoBot.Users.getUser(email);
  if (user === undefined) {
    req.status(404).send({ message: "user not found" });
  } else {
    const otp = Math.floor(1000 + Math.random() * 9000);
    let add_otp = otp_check.update_OTP(otp, email);
    if (add_otp == false) {
      res.status(404).send({ message: "unable to send retrieval code" }).end();
    } else {
      mailman
        .send_mail(
          email,
          constants.account_retrieval.subject,
          constants.account_retrieval.text + otp
        )
        .then((response) =>
          res.json({ message: "Password reset email send successfully" }).end()
        )
        .catch((error) => res.status(500).send(error.message));
    }
  }
};

// verify if otp is correct
exports.verify_otp = async function (req, res) {
  const email = req.query.email;
  const otp = req.query.otp;
  let check = await otp_check.verify_otp(email, otp);
  if (check.status !== 200) {
    res.status(500).send({
      message: "Could not verify OTP. Try again please.",
      status: 403,
    });
  } else {
    res.send({ message: check.message, status: 200 }).end();
  }
};

// Verify account
exports.verify_account = async function (req, res, next) {
  const email = req.body.email;
  logger.log("Verifying account for user: "+email, req);
  const otp = req.body.otp;

  AWS.config.update({ region: "us-west-2" });

  const ddb = new AWS.DynamoDB.DocumentClient();

  var userParams = {
    Key: {
      accountEmail: email,
    },
    TableName: users_table_name,
  };

  ddb.get(userParams, function(err, data){
    if(err || Object.keys(data).length < 1){
      logger.logError("Error in reading user during account verification for user email: "+email, err, req);
      res.status(404);
      next(new Error("Account verification failed for customer. Customer account not found.").message);
    }else{
      logger.log("Succesfully got customer account data during account verification: "+email, req);
      const customer_otp = data.Item.otp;
      if(customer_otp === otp){
        logger.log("OTP verification successful for customer account: "+email, req);
        const emailSplit = email.split('@');
        const instanceName = emailSplit[0];

        const instance_params = {
          IdentityManagementType: 'CONNECT_MANAGED', // Options: 'SAML', 'CONNECT_MANAGED', 'EXISTING_DIRECTORY'
          InstanceAlias: instanceName, // Optional alias for the instance
          InboundCallsEnabled: true, // Whether inbound calls are enabled
          OutboundCallsEnabled: true // Whether outbound calls are enabled
        };
        const connect = new AWS.Connect();
        if(req.query.customer_type === "LARGE_VENDOR"){
        // Create the Connect instance
        connect.createInstance(instance_params, (err, instanceData) => {
          if (err) {
            logger.logError('Error creating instance for user during account verification email: '+email, err, req);
            next(err);
          } else {
            logger.log('Instance created successfully during account verification for email: '+email, data);
            const verification_params = {
              TableName: users_table_name,
              Key: {
                  'accountEmail': email
              },
              UpdateExpression: 'SET #emailVerified = :emailVerified, #instanceID = :instanceID',
              ExpressionAttributeNames: {
                  '#emailVerified': 'emailVerified',
                  '#instanceID': 'instanceID'
              },
              ExpressionAttributeValues: {
                  ':emailVerified': true,
                  ':instanceID': instanceData.Id
              },
              ReturnValues: 'UPDATED_NEW'
          };
    
          ddb.update(verification_params, async function(err, data){
            if(err){
              logger.logError("Failed to update email verification status for customer: "+email, err, req);
              next(new Error("Failed to update account verification status").message);
            }else{
              logger.log("Successfully updated email verification for customer: "+email, req);
              res.send("account verification successful.")
            }
          });
          }
        });
        }else{
          logger.log("Skipping instance creation since customer is not a large vendor. Using default instance id:" , req);
          const verification_params = {
            TableName: users_table_name,
            Key: {
                'accountEmail': email
            },
            UpdateExpression: 'SET #emailVerified = :emailVerified, #instanceID = :instanceID',
            ExpressionAttributeNames: {
                '#emailVerified': 'emailVerified',
                '#instanceID': 'instanceID'
            },
            ExpressionAttributeValues: {
                ':emailVerified': true,
                ':instanceID': connect_constants.connect_instances.defaultInstanceID
            },
            ReturnValues: 'UPDATED_NEW'
          };
  
          ddb.update(verification_params, async function(err, data){
            if(err){
              logger.logError("Failed to update email verification status for customer: "+email, err, req);
              next(new Error("Failed to update account verification status").message);
            }else{
              logger.log("Successfully updated email verification status for customer: "+email, req);
              res.send("account verification successful.")
            }
          });

        }
      }else{
        logger.logError("Account verification failed, OTP code is incorrect", new Error("Account verification failed, OTP code is incorrect"), req);
        next(new Error("Account verification failed, OTP code is incorrect").message);
      }
    }
  });
};

// Check if otp correct, change password
exports.update_password = async function (req, res) {
  const email = req.query.email;
  const new_password = encryption.encrypt(
    process.env.AUTH_SECRET,
    req.query.password
  );
  const otp = req.query.otp;
  let check = await otp_check.verify_otp(email, otp);
  if (check.status === 200) {
    let result = await MongoBot.Users.updateUser(email, {
      password: new_password,
    });
    if (result.modifiedCount > 0 && result.modifiedCount < 2) {
      res.json({ message: "password changed successfully" }).end();
    } else {
      res
        .status(500)
        .json({
          message:
            "Interal Service Exception. Password change failed with unknown error.",
        })
        .end();
    }
  } else {
    res.status(403).send({ message: check.message }).end();
  }
};

// set account secret
exports.set_secret = async function (req, res) {
  const user = req.email;
  const secret = req.query.secret;
  if (secret === null || secret === undefined || secret === "") {
    res.status(403).json({ message: "validation exception" }).end();
  } else {
    let encrypted = encryption.encrypt(process.env.AUTH_SECRET, secret);
    const body = {
      secret: encrypted,
    };
    let add_secret = await MongoBot.Users.updateUser(user, body);
    if (add_secret.modifiedCount > 0) {
      res.json({ message: "secret set successfully" }).end();
    } else {
      res
        .status(500)
        .json({ message: "unknown error in setting status" })
        .end();
    }
  }
};

// logout user
exports.logout = function (req, res) {
  res.clearCookie("token");
  res.json({ token: null }).end();
};
