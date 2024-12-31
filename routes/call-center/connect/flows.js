"use strict";
const AWS = require("aws-sdk");
const logger = require("../../../util/logger");
const constants = require("../../../constants/connect_constants");
const dateUtil = require("../../../util/date");
const ddbUpdateExpressionGenerator = require("../../../util/ddbUpdateExpression");

var s3Client = new AWS.S3();
const flows_table_name = "Flows";

const create = async function (req, res, next) {
  const contactFlowName = req.body.contactFlowName;
  const contactFlowContent = req.body.contactFlowContent;
  const contactFlowType = req.body.contactFlowType;
  const campaignID = req.body.campaignID;
  const flowDescription = req.body.flowDescription ? req.body.flowDescription : contactFlowName + "-" + campaignID;
  const dateCreated = dateUtil.getDate(req.requestTime);

  AWS.config.update({ region: "us-west-2" });

  const connectInstanceID = req.instanceID;
  var params = {
    InstanceId: connectInstanceID,
    Name: contactFlowName,
    Content: JSON.stringify(contactFlowContent),
    Type: contactFlowType,
  };

  AWS.config.update({ region: "us-west-2" });

  var connectClient = new AWS.Connect();
  connectClient.createContactFlow(params, (err, data) => {
    if (err) {
      logger.logError(
        "failed to create contactFlow for customer: " + req.email,
        err,
        req
      );
      next(err.message);
    } else {
      logger.log(
        "successfully created contactFlow for customer: " +
          req.email +
          " with contactFlowID: " +
          data.ContactFlowId,
        req
      );
      const flowObject = {
        flowID: { S: data.ContactFlowId },
        flowName: { S: contactFlowName },
        flowDescription: { S: flowDescription },
        flowType: { S: contactFlowType },
        flowOwner: { S: req.email },
        flowArn: { S: data.ContactFlowArn },
        campaignID: { S: campaignID },
        dateCreated: { S: dateCreated },
        dateUpdated: { S: dateCreated },
      };

      var ddbParams = {
        TableName: flows_table_name,
        Item: flowObject,
      };

      var ddbClient = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

      ddbClient.putItem(ddbParams, function (err, result) {
        if (err) {
          logger.logError(
            "flow creation failed for customer: " + req.email,
            err,
            req
          );
          next(err.message);
        } else {
          logger.log(
            "flow created successfully for customer: " +
              req.email +
              " flowID:" +
              data.ContactFlowId,
            req
          );
          res.send({ FlowID: data.ContactFlowId });
        }
      });
    }
  });
};
exports.create = create;

const list = async function (req, res, next) {
  const flowOwner = req.email;
  var params = {
    KeyConditionExpression: "flowOwner = :co",
    ExpressionAttributeValues: {
      ":co": { S: flowOwner },
    },
    TableName: flows_table_name,
    // Limit: 10, // Limit the number of items to 10
  };

  AWS.config.update({ region: "us-west-2" });

  var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

  ddb.query(params, function (err, data) {
    if (err) {
      logger.log("Failed to get flows for customer: " + req.email, err, req);
      next(err.message);
    } else {
      logger.log("Successfully returned flows for customer: " + req.email, req);
      res.send(data);
    }
  });
};
exports.list = list;

const get = async function (req, res, next) {
  const flowID = req.query.flowID;
  const flowOwner = req.email;
  var params = {
    Key: {
      flowID: {
        S: flowID,
      },
      flowOwner: {
        S: flowOwner,
      },
    },
    TableName: flows_table_name,
  };

  AWS.config.update({ region: "us-west-2" });

  var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

  ddb.getItem(params, function (err, data) {
    if (err) {
      logger.log(
        "Failed to get flow for customer: " +
          flowOwner +
          " with flowID: " +
          flowID,
        err,
        req
      );
      next(err.message);
    } else {
      logger.log(
        "Successfully returned flow for customer: " +
          flowOwner +
          " with flowID: " +
          flowID,
        req
      );
      res.send(data);
    }
  });
};
exports.get = get;

exports.delete = function (req, res, next) {
  const flowOwner = req.email;
  const flowID = req.query.flowID;
  AWS.config.update({ region: "us-west-2" });
  const connect = new AWS.Connect();

  const deleteParams = {
    InstanceId: constants.connect_instances.defaultInstanceID,
    ContactFlowId: flowID,
  };

  //delete contact flow from connect instance
  connect.deleteContactFlow(deleteParams, (err, data) => {
    if (err) {
      logger.logError("Error deleting contact flow:" + flowID, err, req);
      next(err.message);
    } else {
      logger.log("successfully deleted flow with flowID:" + flowID, req);
      var params = {
        Key: {
          flowID: flowID,
          flowOwner: flowOwner,
        },
        TableName: flows_table_name,
      };

      AWS.config.update({ region: "us-west-2" });
      const dynamoDB = new AWS.DynamoDB.DocumentClient();

      //Read contact flow from flows db to get associated campaignID
      dynamoDB.get(params, function (err, data) {
        if (err) {
          logger.log("Failed to get flow for customer: " + flowOwner + " with flowID: " + flowID, err, req);
          next(err.message);
        } else {

            var params = {
                Key:{
                    "campaignOwner":req.email,
                    "campaignID":data.Item.campaignID
                },
                TableName: "Campaigns"
            }
            dynamoDB.get(params, function(err, campaignData) {
                if (err){
                    logger.logError("Failed to get campaign for customer: "+req.email+" with campaign: "+data.Item.campaignID, err, req);
                   next(err.message);
                }else{
                    logger.log("Successfully returned campaign for customer: "+req.email+" with campaign: "+data.Item.campaignID, req);
                    const { associatedFlows } = campaignData.Item;
                    if (!associatedFlows || !Array.isArray(associatedFlows)) {
                        console.log(associatedFlows)
                        return res.status(404).json({ error: 'No associated flows found' });
                    }
                    const index = associatedFlows.indexOf(flowID);
                    if (index === -1) {
                        return res.status(404).json({ error: 'Flow ID not found in associated flows' });
                    }
                    // Remove the flowId from the list
                    associatedFlows.splice(index, 1);

                    const updateParams = {
                        TableName: 'Campaigns',
                        Key: { campaignOwner:req.email, campaignID: data.Item.campaignID},
                        UpdateExpression: 'SET associatedFlows = :associatedFlows',
                        ExpressionAttributeValues: {
                          ':associatedFlows': associatedFlows
                        },
                        ReturnValues: 'UPDATED_NEW'
                    };
        // Remove the flow association from the campaigns 
          dynamoDB.update(updateParams, (err, removeAssociationData) => {
            if (err) {
              logger.logError("failed to delete flow association for campaigns for flowID: " + flowID +" in campaign: " +data.Item.campaignID,err,req);
              next(err.message);
            } else {
                logger.log("successfully deleted flow association for campaigns for flowID: " + flowID +" in campaign: " + data.Item.campaignID, req);
                var ddbDeleteParams = {
                    Key: {
                    flowOwner:  flowOwner,
                    flowID: flowID,
                    },
                    TableName: flows_table_name,
                };
                // delete flows record from flows table
                dynamoDB.delete(ddbDeleteParams, function (err, deleteFlowItemData) {
                if (err) {
                    logger.logError("failed to delete flow: " + flowID +" for customer " + flowOwner, err, req);
                    next(err.message);
                } else {
                    logger.log("successfully deleted flow: " + flowID +" for customer " + flowOwner, req);
                    res.send("successfully deleted flow: "+flowID);
                }
                });
                }
            });
            }
        });
        }
      });
    }
  });
};
