"use strict";

const uuid = require("uuid");
const dateUtil = require("../../../util/date");
const logger = require("../../../util/logger");
var AWS = require("aws-sdk");
var ddbUpdateExpression = require("../../../util/ddbUpdateExpression");
var s3Client = new AWS.S3();
const agents_table_name = "Agents";

exports.create = async function (req, res, next) {
  const agentId = uuid.v4();
  const agentFirstName = req.body.agentFirstName;
  const agentLastName = req.body.agentLastName;
  const agentEmail = req.body.agentEmail;
  const dateCreated = dateUtil.getDate(req.requestTime);
  const agentPhoneNumber = String(req.body.agentPhoneNumber);
  const agentCountry = req.body.agentCountry;
  const campaignId = req.body.campaignId;   
  const agentLanguages = req.body.agentLanguages;

  AWS.config.update({ region: "us-west-2" });

  // Create a folder inside s3 campaigns
  var params = {
    Bucket: "agents-directory",
    Key: agentId,
    ACL: "private",
    Body: "body does not matter",
  };

  s3Client.upload(params, async function (err, data) {
    if (err) {
      logger.log("S3 folder creation failed for:" + agentEmail + err, req);
      next(err.message);
    } else {
      logger.log("S3 folder creation successful for agent:" + agentEmail, req);

      const agentObject = {
        agentId: agentId,
        agentFirstName:  agentFirstName,
        agentLastName: agentLastName,
        dateCreated: dateCreated,
        agentEmail: agentEmail,
        agentBucketLocation: data.Location,
        agentPhoneNumber: agentPhoneNumber,
        agentCountry: agentCountry,
        agentLanguages: agentLanguages,
        campaignId:  campaignId,
        status: "ACTIVE",
      };

      // Create the DynamoDB service object
      const ddb = new AWS.DynamoDB.DocumentClient();

      var params = {
        TableName: agents_table_name,
        Item: agentObject,
        ConditionExpression: "attribute_not_exists(agentEmail)",
      };

      ddb.put(params, function (err, data) {
        if (err) {
          logger.logError(
            "agent creation failed for agent" + agentEmail,
            err,
            req
          );
          next(err.name + ":" + err.message);
        } else {
          logger.log(
            "agent created successfully:" +
              agentEmail +
              "for customer:" +
              req.email +
              " agentId:" +
              agentId,
            req
          );
          res.send({ agentId: agentId });
        }
      });
    }
  });
};

exports.get = async function (req, res, next) {
  const campaignId = req.query.campaignId;
  const agentId = req.query.agentId;
  var params = {
    Key: {
      campaignId: {
        S: campaignId,
      },
      agentId: {
        S: agentId,
      },
    },
    TableName: agents_table_name,
  };

  AWS.config.update({ region: "us-west-2" });

  var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

  ddb.getItem(params, function (err, data) {
    if (err) {
      logger.logError(
        "Failed to get agent " +
          agentId +
          " with agentEmail: " +
          agentEmail +
          " for customer: " +
          req.email,
        err,
        req
      );
      next(err.name + ":" + err.message);
    } else {
      logger.log(
        "Successfully returned agent: " +
          agentId +
          " with agentEmail: " +
          agentEmail +
          " for customer: " +
          req.email,
        req
      );
      res.send(data);
    }
  });
};

exports.list = async function (req, res, next) {
  const campaignId = req.query.campaignId;
  var params = {
    TableName: agents_table_name,
    Limit: 100, // Limit the number of items to 10
    Key: {
      campaignId: {
        S: campaignId,
      },
    }
  };

  AWS.config.update({ region: "us-west-2" });

  var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

  ddb.scan(params, function (err, data) {
    if (err) {
      logger.log("Failed to get agents for customer: " + req.email, err, req);
      next(err.name + ":" + err.message);
    } else {
      logger.log(
        "Successfully returned agents for customer: " + req.email,
        req
      );
      res.send(data);
    }
  });
};

exports.updateMetadata = async function (req, res, next) {
  const agentId = req.query.agentId;
  const agentEmail = req.query.agentEmail;
  const campaignId = req.query.campaignId;

  try {
    let updateAttributeList = req.query.updateAttributeList.split(",");
    let updateAttributeObject = JSON.parse(req.query.updateAttributeObject);
    let validQuery = ddbUpdateExpression.validateUpdateItems(
      updateAttributeList,
      updateAttributeObject
    );
    if (validQuery) {
      const updateObject = ddbUpdateExpression.generateExpressionAttributeNames(
        updateAttributeList,
        updateAttributeObject
      );
      const params = {
        TableName: agents_table_name,
        Key: {
          agentId: { S: agentId },
          agentEmail: { S: agentEmail },
          campaignId: { S: campaignId },
        },
        UpdateExpression: updateObject.UpdateExpression, // Update expression

        ExpressionAttributeNames: updateObject.ExpressionAttributeNames,
        ExpressionAttributeValues: updateObject.ExpressionAttributeValues,
        ReturnValues: "UPDATED_NEW", // Return the updated attributes
      };

      AWS.config.update({ region: "us-west-2" });

      var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
      ddb.updateItem(params, function (err, data) {
        if (err) {
          logger.logError("Unable to update item:" + agentEmail, err, req);
          next(err.name + ":" + err.message);
        } else {
          logger.log(
            "Successfully returned agent for customer: " + req.email,
            req
          );
          res.send(data);
        }
      });
    } else {
      res.status(404).send("validation exception");
    }
  } catch (err) {
    next(err.message);
  }
};

exports.delete = function (req, res, next) {
  const campaignId = req.query.campaignId;
  const agentId = req.query.agentId;
  AWS.config.update({ region: "us-west-2" });

  var params = {
    Key: {
      campaignId: {
        S: campaignId,
      },
      agentId: {
        S: agentId,
      },
    },
    TableName: agents_table_name,
  };

  var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
  ddb.deleteItem(params, function (err, data) {
    if (err) {
      logger.logError(
        "failed to delete agent " + agentEmail + " for customer " + req.email,
        err,
        req
      );
      next(err.message);
    } else {
      logger.log(
        "successfully deleted agent " +
          agentEmail +
          " for customer " +
          req.email,
        req
      );
      res.send(data);
    }
  });
};

