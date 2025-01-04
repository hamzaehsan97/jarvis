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
      next(new Error(err));
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

      const checkParams = {
        TableName: agents_table_name,
        IndexName: "agentEmail-index", // Replace with your GSI name
        KeyConditionExpression: "agentEmail = :email",
        ExpressionAttributeValues: {
          ":email": agentEmail,
        },
      };

      const result = await ddb.query(checkParams).promise();
      if (result.Items.length > 0) {
        return next(new Error("Email already exists: " + agentEmail + ". Instead of creating new user, associate this user to the required campaign."));
      }


      var params = {
        TableName: agents_table_name,
        Item: agentObject,
      };

      ddb.put(params, function (err, data) {
        if (err) {
          logger.logError(
            "agent creation failed for agent" + agentEmail,
            err,
            req
          );
          next(new Error(err));
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
  const { campaignId, agentEmail } = req.query;

  if (!campaignId || !agentEmail) {
    return next(new Error("Both campaignId and agentEmail are required in the query parameters."));
  }

  // DynamoDB query parameters
  const params = {
    TableName: agents_table_name,
    KeyConditionExpression: "campaignId = :campaignId", // Query items where partition key matches
    ExpressionAttributeValues: {
      ":campaignId": campaignId,
    },
    FilterExpression: "agentEmail = :agentEmail", // Filter for specific agent
    ExpressionAttributeValues: {
      ":campaignId": campaignId,
      ":agentEmail": agentEmail,
    },
    Limit: 1, // Stop after finding the first match
  };

  AWS.config.update({ region: "us-west-2" });

  const ddb = new AWS.DynamoDB.DocumentClient();

  try {
    const data = await ddb.query(params).promise();

    if (data.Items.length === 0) {
      return next(new Error(`Agent with email ${agentEmail} not found in campaign ${campaignId}.`));
    }

    logger.log(
      `Successfully retrieved agent with email ${agentEmail} for campaign ${campaignId}`,
      req
    );
    res.send(data.Items[0]); // Return the single agent's details
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

  // DynamoDB query parameters
  const params = {
    TableName: agents_table_name,
    KeyConditionExpression: "campaignId = :campaignId", // Query items where partition key matches
    ExpressionAttributeValues: {
      ":campaignId": campaignId, // Bind the campaignId value
    },
    Limit: 100, // Optional: Limit the number of items returned
  };

  AWS.config.update({ region: "us-west-2" });

  const ddb = new AWS.DynamoDB.DocumentClient();

  try {
    const data = await ddb.query(params).promise();
    logger.log(
      "Successfully returned agents for campaignId: " + campaignId,
      req
    );
    res.send(data.Items); // Return the array of agents
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
    // Parse the update attributes
    const updateAttributes = JSON.parse(req.query.updateAttributeObject);

    // Validate input attributes (optional step, based on your needs)
    if (Object.keys(updateAttributes).length === 0) {
      return next(new Error("No attributes provided to update."));
    }

    // Construct the UpdateExpression dynamically
    const updateExpressionParts = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    for (const [key, value] of Object.entries(updateAttributes)) {
      updateExpressionParts.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }

    const updateExpression = `SET ${updateExpressionParts.join(", ")}`;

    // Update parameters
    const params = {
      TableName: agents_table_name,
      Key: {
        campaignId: campaignId,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "UPDATED_NEW",
    };

    // Use DocumentClient
    AWS.config.update({ region: "us-west-2" });
    const ddb = new AWS.DynamoDB.DocumentClient();

    const updateResult = await ddb.update(params).promise();

    logger.log(
      `Successfully updated metadata for agent with email ${agentEmail} in campaign ${campaignId}`,
      req
    );
    res.send(updateResult.Attributes); // Return the updated attributes
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
      campaignId: campaignId, // Partition key
    },
    ConditionExpression: "agentEmail = :agentEmail", // Ensure only the matching agent is deleted
    ExpressionAttributeValues: {
      ":agentEmail": agentEmail,
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
    if (err.name === "ConditionalCheckFailedException") {
      next(new Error(`Agent ${agentEmail} not found in campaign ${campaignId}.`));
    } else {
      logger.logError(
        `Failed to delete agent ${agentEmail} in campaign ${campaignId}`,
        err,
        req
      );
      next(new Error(`Failed to delete agent: ${err.message}`));
    }
  }
};
