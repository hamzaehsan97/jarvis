"use strict";

const uuid = require("uuid");
const dateUtil = require("../../util/date");
const logger = require("../../util/logger");
var AWS = require("aws-sdk");
var ddbUpdateExpression = require("../../util/ddbUpdateExpression");
var s3Client = new AWS.S3();
const agents_table_name = "Agents";

exports.addUserToInstance = async function (req, res, next) {
  const agentID = req.body.agentID;
  const campaignOwner = req.email;
  const agentEmail = req.body.agentEmail;
  const agentPassword = req.body.password;
  const routingProfile = req.body.routingProfile ? req.body.routingProfile : "Basic Routing Profile";
  const securityProfile = req.body.securityProfile ? req.body.securityProfile : "Agent";
  var params = {
    Key: {
      instanceOwner: {
        S: campaignOwner,
      },
    },
    TableName: "Instances",
  };

  AWS.config.update({ region: "us-west-2" });

  var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

  // Find customers instance
  ddb.getItem(params, function (err, instanceData) {
    if (err || Object.keys(instanceData).length < 1) {
      logger.logError(
        "Failed to get instance for customer: " + campaignOwner,
        err,
        req
      );
      next(err.message);
    } else {
      logger.log(
        "Successfully returned instance for customer: " + campaignOwner + " with instanceID:" + instanceData.Item.instanceID.S,
        req
      );
      const instanceID = instanceData.Item.instanceID.S;
      var agentParams = {
        Key: {
          agentEmail: {
            S: agentEmail,
          },
          agentID: {
            S: agentID,
          },
        },
        TableName: "Agents",
      };
      ddb.getItem(agentParams, function (err, agentData) {
        if (err || Object.keys(agentData).length < 1) {
          logger.logError(
            "Failed to get agent for customer: " + campaignOwner,
            err,
            req
          );
          next(err);
        } else {
          logger.log(
            "Successfully got agent for customer: " + campaignOwner,
            req
          );
          var agentSecurityProfileID = "";
          var RoutingProfileId = "";
          const connect = new AWS.Connect();
          const securityProfilesParams = {
            InstanceId: instanceData.Item.instanceID.S,
          };
          connect.listSecurityProfiles(
            securityProfilesParams,
            async (err, securityProfilesData) => {
              if (err) {
                logger.logError(
                  "Error listing security profiles for customer:" +
                  campaignOwner +
                  " for instance:" +
                  instanceID,
                  err,
                  req
                );
                next(err);
              } else {
                securityProfilesData.SecurityProfileSummaryList.forEach(
                  function (item, index) {
                    if (item.Name === securityProfile) {
                      agentSecurityProfileID = item.Id;
                    }
                  }
                );
                connect.listRoutingProfiles(
                  securityProfilesParams,
                  (err, routingProfileData) => {
                    if (err) {
                      logger.logError(
                        "Error listing routing profiles for customer" +
                        campaignOwner,
                        err,
                        req
                      );
                      next(err);
                    } else {
                      routingProfileData.RoutingProfileSummaryList.forEach(
                        function (item, index) {
                          if (item.Name === routingProfile) {
                            RoutingProfileId = item.Id;
                          }
                        }
                      );
                      const userParams = {
                        InstanceId: instanceID,
                        Username:
                          agentData.Item.agentFirstName.S +
                          agentData.Item.agentLastName.S,
                        Password: agentPassword,
                        IdentityInfo: {
                          FirstName: agentData.Item.agentFirstName.S,
                          LastName: agentData.Item.agentLastName.S,
                          Email: agentData.Item.agentEmail.S,
                        },
                        PhoneConfig: {
                          PhoneType: "SOFT_PHONE",
                          AutoAccept: true,
                          AfterContactWorkTimeLimit: 0,
                        },
                        SecurityProfileIds: [agentSecurityProfileID],
                        RoutingProfileId: RoutingProfileId,
                      };

                      connect.createUser(userParams, (err, userData) => {
                        if (err) {
                          logger.logError(
                            "Error creating user for campaignOwner:" +
                            campaignOwner,
                            err,
                            req
                          );
                          next(err);
                        } else {
                          logger.log(
                            "User created successfully for customer:" +
                            campaignOwner +
                            " .User: " +
                            agentData.Item.agentEmail.S +
                            " added to instance: " +
                            instanceID,
                            req
                          );
                          res.send(userData);
                        }
                      });
                    }
                  }
                );
              }
            }
          );
        }
      });
    }
  });
};


exports.getUsersInInstance = function (req, res, next) {
  const instanceID = req.body.instanceID;
  const connect = new AWS.Connect();

  const params = {
    InstanceId: instanceID
  };

  connect.listUsers(params, (err, data) => {
    if (err) {
      logger.logError('Error listing users for customer:' + req.email, err, req);
      next(err);
    } else {
      logger.log('Users listed successfully for customer:' + req.email, req);
      res.send(data);
    }
  });
}

exports.deleteUserFromInstance = function (req, res, next) {
  AWS.config.update({ region: "us-west-2" });

  const instanceID = req.body.instanceID;
  const userID = req.body.userID;
  const connect = new AWS.Connect();

  const params = {
    InstanceId: instanceID,
    UserId: userID
  };

  connect.deleteUser(params, (err, data) => {
    if (err) {
      logger.logError('Error deleting instance user for customer:' + req.email + " with userID: " + userID, err, req);
      next(err);
    } else {
      logger.log("Successfully deleted instance user for customer:" + req.email + " with userID: " + userID, req);
      res.send(data);
    }
  });
}