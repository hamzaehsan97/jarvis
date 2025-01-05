"use strict";

const uuid = require("uuid");
const dateUtil = require("../../../util/date");
const logger = require("../../../util/logger");
var AWS = require("aws-sdk");
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

  // Create a folder inside S3 campaigns
  var params = {
    Bucket: "agents-directory",
    Key: agentId,
    ACL: "private",
    Body: "body does not matter",
  };

  s3Client.upload(params, async function (err, data) {
    if (err) {
      logger.log("S3 folder creation failed for:" + agentEmail + err, req);
      next(new Error(err));
    } else {
      logger.log("S3 folder creation successful for agent:" + agentEmail, req);

      const agentObject = {
        agentId: agentId,
        agentFirstName: agentFirstName,
        agentLastName: agentLastName,
        dateCreated: dateCreated,
        agentEmail: agentEmail,
        agentBucketLocation: data.Location,
        agentPhoneNumber: agentPhoneNumber,
        agentCountry: agentCountry,
        agentLanguages: agentLanguages,
        campaignId: campaignId,
        status: "ACTIVE",
      };

      // Create the DynamoDB service object
      const ddb = new AWS.DynamoDB.DocumentClient();

      const checkParams = {
        TableName: agents_table_name,
        Key: {
          agentEmail: agentEmail,
          campaignId: campaignId,
        },
      };

      try {
        const existingItem = await ddb.get(checkParams).promise();
        if (existingItem.Item) {
          return next(new Error("Agent already exists for this campaign."));
        }

        const putParams = {
          TableName: agents_table_name,
          Item: agentObject,
          ConditionExpression: "attribute_not_exists(agentEmail) AND attribute_not_exists(campaignId)",
        };

        await ddb.put(putParams).promise();
        logger.log("Agent created successfully: " + agentEmail, req);
        res.send({ agentId: agentId });
      } catch (err) {
        logger.logError("Failed to create agent: " + agentEmail, err, req);
        next(new Error(err.message));
      }
    }
  });
};

exports.get = async function (req, res, next) {
  const { campaignId, agentEmail } = req.query;

  if (!campaignId || !agentEmail) {
    return next(new Error("Both campaignId and agentEmail are required in the query parameters."));
  }

  const params = {
    TableName: agents_table_name,
    Key: {
      agentEmail: agentEmail,
      campaignId: campaignId,
    },
  };

  AWS.config.update({ region: "us-west-2" });

  const ddb = new AWS.DynamoDB.DocumentClient();

  try {
    const data = await ddb.get(params).promise();

    if (!data.Item) {
      return next(new Error(`Agent with email ${agentEmail} not found in campaign ${campaignId}.`));
    }

    logger.log(
      `Successfully retrieved agent with email ${agentEmail} for campaign ${campaignId}`,
      req
    );
    res.send(data.Item);
  } catch (err) {
    logger.logError(
      `Failed to get agent with email ${agentEmail} for campaign ${campaignId}`,
      err,
      req
    );
    next(new Error(`Failed to fetch agent: ${err.message}`));
  }
};

exports.list = async function (req, res, next) {
  const campaignId = req.query.campaignId;

  if (!campaignId) {
    return next(new Error("campaignId is required in the query parameters."));
  }

  const params = {
    TableName: agents_table_name,
    IndexName: "campaignId-index", // Assume a GSI for campaignId
    KeyConditionExpression: "campaignId = :campaignId",
    ExpressionAttributeValues: {
      ":campaignId": campaignId,
    },
  };

  AWS.config.update({ region: "us-west-2" });

  const ddb = new AWS.DynamoDB.DocumentClient();

  try {
    const data = await ddb.query(params).promise();
    logger.log(
      "Successfully returned agents for campaignId: " + campaignId,
      req
    );
    res.send(data.Items);
  } catch (err) {
    logger.logError(
      "Failed to get agents for campaignId: " + campaignId,
      err,
      req
    );
    next(new Error("Failed to fetch agents: " + err.message));
  }
};

exports.updateMetadata = async function (req, res, next) {
  const campaignId = req.query.campaignId;
  const agentEmail = req.query.agentEmail;

  if (!campaignId || !agentEmail) {
    return next(new Error("Both campaignId and agentEmail are required in the query parameters."));
  }

  try {
    const updateAttributes = JSON.parse(req.query.updateAttributeObject);

    if (Object.keys(updateAttributes).length === 0) {
      return next(new Error("No attributes provided to update."));
    }

    const updateExpressionParts = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    for (const [key, value] of Object.entries(updateAttributes)) {
      updateExpressionParts.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }

    const updateExpression = `SET ${updateExpressionParts.join(", ")}`;

    const params = {
      TableName: agents_table_name,
      Key: {
        agentEmail: agentEmail,
        campaignId: campaignId,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "UPDATED_NEW",
    };

    AWS.config.update({ region: "us-west-2" });
    const ddb = new AWS.DynamoDB.DocumentClient();

    const updateResult = await ddb.update(params).promise();

    logger.log(
      `Successfully updated metadata for agent with email ${agentEmail} in campaign ${campaignId}`,
      req
    );
    res.send(updateResult.Attributes);
  } catch (err) {
    logger.logError(
      `Failed to update metadata for agent with email ${agentEmail} in campaign ${campaignId}`,
      err,
      req
    );
    next(new Error(`Failed to update agent metadata: ${err.message}`));
  }
};

exports.delete = async function (req, res, next) {
  const campaignId = req.query.campaignId;
  const agentEmail = req.query.agentEmail;

  if (!campaignId || !agentEmail) {
    return next(new Error("Both campaignId and agentEmail are required in the query parameters."));
  }

  AWS.config.update({ region: "us-west-2" });

  const params = {
    TableName: agents_table_name,
    Key: {
      agentEmail: agentEmail,
      campaignId: campaignId,
    },
  };

  const ddb = new AWS.DynamoDB.DocumentClient();

  try {
    await ddb.delete(params).promise();
    logger.log(
      `Successfully deleted agent ${agentEmail} in campaign ${campaignId}`,
      req
    );
    res.send({ message: `Agent ${agentEmail} successfully deleted.` });
  } catch (err) {
    logger.logError(
      `Failed to delete agent ${agentEmail} in campaign ${campaignId}`,
      err,
      req
    );
    next(new Error(`Failed to delete agent: ${err.message}`));
  }
};
