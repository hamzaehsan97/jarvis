"use strict"

const uuid = require("uuid");
const dateUtil = require("../../util/date");
const logger = require("../../util/logger");
var AWS = require("aws-sdk");
var s3Client = new AWS.S3();


exports.create = async function(req, res, next) {
    const campaigns_table_name = "Campaigns"
    const campaignID = uuid.v4();
    const campaignOwner = req.email;
    const campaignName = req.query.campaignName;
    const campaignType =  req.query.campaignType;
    const dateCreated = dateUtil.getDate(req.requestTime);
    const campaignStartDate = String(req.query.campaignStartDate);
    const campaignEndDate = String(req.query.campaignEndDate);
    const campaignStatus = req.query.campaignStatus;
    const campaignRegion = req.query.campaignRegion;
    const campaignCountry = req.query.campaignCountry;
    const campaignZipCode = req.query.ZipCode ?  req.query.ZipCode : "NA";

    AWS.config.update({ region: "us-west-2" });

    // Create a folder inside s3 campaigns
    var params = { Bucket: 'campaignsdirectory', Key: campaignID, ACL: 'private', Body:'body does not matter' };

    s3Client.upload(params, async function (err, data) {
        if (err) {
            logger.log("S3 folder creation failed for:"+campaignOwner+err, req);
           next(err.message);
        } else {
            logger.log("S3 folder creation successful for customer:"+campaignOwner+" campaignID:"+campaignID, req);

            const campaignObject = {
                campaignID: {S: campaignID},
                campaignName: {S: campaignName},
                campaignType: {S: campaignType},
                dateCreated: {S: dateCreated},
                dateUpdated: {S: dateCreated},
                campaignBucketLocation: {S: data.Location},
                campaignRegion: {S: campaignRegion},
                campaignStatus: {S: campaignStatus},
                campaignStartDate: {S: campaignStartDate},
                campaignEndDate: {S: campaignEndDate},
                campaignOwner: {S: campaignOwner},
                campaignCountry: {S: campaignCountry},
                campaignZipCode: {S: campaignZipCode},
                campaignZipCode: {S: campaignZipCode}
            }

            // Create the DynamoDB service object
            var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

            var params = {
                TableName: campaigns_table_name,
                Item: campaignObject,
                ConditionExpression: "attribute_not_exists(campaignName)"
              };
        
            ddb.putItem(params, function (err, data) {
                if (err) {
                    logger.log("Campaign creation failed for customer"+campaignOwner+err, req);
                   next(err.message);
                } else {
                    logger.log("Campaign created successfully for customer:"+campaignOwner+" campaignID:"+campaignID, req);
                    res.send({"campaignID": campaignID});
                }
            });

        }
    });

}

exports.get = async function(req, res, next){
    const campaignOwner = req.email;
    const campaignID = req.query.campaignID;
    var params = {
        Key:{
            "campaignOwner":{
                S: campaignOwner
            },
            "campaignID":{
                S: campaignID
            }
        },
        TableName: "Campaigns"
    }

    AWS.config.update({ region: "us-west-2" });

    var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

    ddb.getItem(params, function(err, data) {
        if (err){
            logger.log("Failed to get campaign for customer: "+campaignOwner+" with campaign: "+campaignID + err, req);
           next(err.message);
        }else{
            logger.log("Successfully returned campaign for customer: "+campaignOwner+" with campaign: "+campaignID, req);
            res.send(data);
        }
    });

}

exports.list = async function(req, res, next){
    const campaignOwner = req.email;
    var params = {
        KeyConditionExpression: 'campaignOwner = :co',
        ExpressionAttributeValues: {
          ':co': { S: campaignOwner},
        },
        TableName: "Campaigns",
        // Limit: 10, // Limit the number of items to 10
    }

    AWS.config.update({ region: "us-west-2" });

    var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

    ddb.query(params, function(err, data) {
        if (err){
            logger.log("Failed to get campaigns for customer: "+campaignOwner + err, req);
           next(err.message);
        }else{
            logger.log("Successfully returned campaign for customer: "+campaignOwner, req);
            res.send(data);
        }
    });
}

exports.updateMetadata = async function(req, res, next){
    const campaignOwner = req.email;
    const campaignID = req.query.campaignID;
    let updateAttributeList = req.query.updateAttributeList.split(',');
    let updateAttributeObject = JSON.parse(req.query.updateAttributeObject);
    let validQuery = validateUpdateItems(updateAttributeList, updateAttributeObject);
    if(validQuery){
        const updateObject = generateExpressionAttributeNames(updateAttributeList, updateAttributeObject);

        const params = {
            TableName: "Campaigns",
            Key: {
              campaignOwner: {S: campaignOwner},
              campaignID: {S: campaignID},
    
            },
            UpdateExpression: updateObject.UpdateExpression, // Update expression
    
            ExpressionAttributeNames: updateObject.ExpressionAttributeNames,
            ExpressionAttributeValues: updateObject.ExpressionAttributeValues,
            ReturnValues: 'UPDATED_NEW', // Return the updated attributes
          };
    
        AWS.config.update({ region: "us-west-2" });
    
        var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
        ddb.updateItem(params, function(err, data) {
            if (err){
                logger.logError("Unable to update item:"+campaignID, err, req);
               next(err.message);
            }else{
                logger.log("Successfully returned campaign for customer: "+campaignOwner, req);
                res.send(data);
            }
        });
    }else{
        res.status(404).send("validation exception");
    }

}

exports.delete = function(req, res){
    const campaignOwner = req.email;
    const campaignID = req.query.campaignID;
    AWS.config.update({ region: "us-west-2" });

    var params = {
        Key:{
            "campaignOwner":{
                S: campaignOwner
            },
            "campaignID":{
                S: campaignID
            }
        },
        TableName: "Campaigns"
    }
    
    var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
    ddb.deleteItem(params, function(err, data) {
        if(err){
            logger.logError("failed to delete campaign: "+campaignID+" for customer "+campaignOwner,err, req)
           next(err.message);
        }else{
            logger.log("successfully deleted campaign: "+campaignID+" for customer "+campaignOwner, req)
            res.send(data);
        }
    });
}



const generateExpressionAttributeNames = function(updateAttributeList, updateAttributeObject){
    let UpdateExpression = "set ";
    let ExpressionAttributeValues = {};
    let ExpressionAttributeNames = {};
    updateAttributeList.forEach(element => {
        let hashtagName = "#"+element;
        let colonName = ":"+element;
        UpdateExpression = UpdateExpression + hashtagName+" = " + colonName+ ","
        ExpressionAttributeNames[hashtagName] = element;
        ExpressionAttributeValues[colonName] = {S: updateAttributeObject[element]};
    });
    UpdateExpression = UpdateExpression.substring(0, UpdateExpression.length - 1);
    let updateObject = {};
    updateObject.UpdateExpression = UpdateExpression;
    updateObject.ExpressionAttributeNames = ExpressionAttributeNames;
    updateObject.ExpressionAttributeValues = ExpressionAttributeValues;
    return updateObject;
}

const validateUpdateItems = function(updateList, updateObject){
    let valid = true;
    updateList.forEach(element => {
        if(updateObject[element] != undefined){
        }else{
            valid = false;
        }
    });
    return valid;
}