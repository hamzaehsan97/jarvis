"use strict";

const uuid = require("uuid");
const dateUtil = require("../../util/date");
const logger = require("../../util/logger");
var AWS = require("aws-sdk");
var ddbUpdateExpression = require("../../util/ddbUpdateExpression");
const { connect } = require("../..");
var s3Client = new AWS.S3();
const agents_table_name = "Agents";

exports.addUserToInstance = async function (req, res, next) {
  const agentID = req.body.agentID;
  const campaignOwner = req.email;
  const agentEmail = req.body.agentEmail;
  const agentPassword = req.body.agentPassword;
  const securityProfile = req.body.securityProfile ? req.body.securityProfile : "Agent";
  const instanceID = req.instanceID;
  const campaignID = req.body.campaignID;

  AWS.config.update({ region: "us-west-2" });

  var ddb = new AWS.DynamoDB.DocumentClient();
  const connect = new AWS.Connect();

  var campaign_params = {
    Key:{
        "campaignOwner":campaignOwner,
        "campaignID":campaignID
    },
    TableName: "Campaigns"
  }

  var agentParams = {
    Key: {
      agentEmail: agentEmail,
      agentID: agentID,
    },
    TableName: "Agents",
  };

  const securityProfilesParams = {
    InstanceId: req.instanceID
  };

  const campaignData = await ddb.get(campaign_params).promise();
  const agentData = await ddb.get(agentParams).promise();
  if(Object.keys(campaignData).length < 1 || Object.keys(campaignData).length < 1){
    logger.logError("Agent or campaignData not found while adding user to instance for customer: "+req.email,{},req);
    next(new Error("AgentID or campaignID is incorrect").message);
  }
  const securityProfileData = await connect.listSecurityProfiles(securityProfilesParams).promise();
  const RoutingProfileId = campaignData.Item.campaignRoutingProfile;
  var agentSecurityProfileID;
  securityProfileData.SecurityProfileSummaryList.forEach(
    function (item, index) {
      if (item.Name === securityProfile) {
        agentSecurityProfileID = item.Id;
      }
    }
  );

  const userParams = {
    InstanceId: instanceID,
    Username:
      agentData.Item.agentFirstName + "_" +
      agentData.Item.agentLastName,
    Password: agentPassword,
    IdentityInfo: {
      FirstName: agentData.Item.agentFirstName,
      LastName: agentData.Item.agentLastName,
      Email: agentData.Item.agentEmail,
    },
    PhoneConfig: {
      PhoneType: "SOFT_PHONE",
      AutoAccept: true,
      AfterContactWorkTimeLimit: 0,
    },
    SecurityProfileIds: [agentSecurityProfileID],
    RoutingProfileId: RoutingProfileId,
    Tags: {
      'campaign': campaignID,
      'owner': req.email
    }
  };

  connect.createUser(userParams, (err, userData) => {
    if (err) {
      logger.logError("Error creating user for campaignOwner:" +campaignOwner, err, req);
      next(err.message);
    } else {
      logger.log("User created successfully for customer:" +campaignOwner +" .User: " +agentData.agentEmail + " added to instance: " +
        instanceID,
        req
      );
      res.send(userData);
    }
  });
}


exports.getUsersInInstance = function (req, res, next) {
  const instanceID = req.body.instanceID;
  const connect = new AWS.Connect();

  const params = {
    InstanceId: instanceID
  };

  connect.listUsers(params, (err, data) => {
    if (err) {
      logger.logError('Error listing users for customer:' + req.email, err, req);
      next(err.message);
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
      next(err.message);
    } else {
      logger.log("Successfully deleted instance user for customer:" + req.email + " with userID: " + userID, req);
      res.send(data);
    }
  });
}