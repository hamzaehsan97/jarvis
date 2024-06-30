"use strict"

const ddb = require("../aws/ddb/putItem");
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

    s3Client.upload(params, function (err, data) {
        if (err) {
            logger.log("S3 folder creation failed for:"+campaignOwner+err, req);
            next(err);
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
                    next(err);
                } else {
                    logger.log("Campaign created successfully for customer:"+campaignOwner+" campaignID:"+campaignID, req);
                    res.send({"campaignId": campaignID});
                }
            });

        }
    });

}
