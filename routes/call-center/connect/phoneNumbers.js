"use strict"
const AWS = require('aws-sdk');
const logger = require("../../../util/logger");


exports.list_phone_numbers = function(req,res,next){

    AWS.config.update({ region: "us-west-2" });
    var connectClient = new AWS.Connect();

    var list_phone_number_params = {
        InstanceId: req.instanceID,
        MaxResults: 25,
        PhoneNumberCountryCodes: [ "US" ],
     }

    connectClient.listPhoneNumbersV2(list_phone_number_params, function(err, data){
        if(err){
            logger.logError("Unable to list phone numbers for customer"+req.email, err, req);
        }else{
            res.send(data);
        }
    });
}

exports.search_available_phone_numbers = function(req,res,next){

    AWS.config.update({ region: "us-west-2" });
    var connectClient = new AWS.Connect();

    var list_phone_number_params = {
        InstanceId: req.instanceID,
        MaxResults: 10,
        PhoneNumberCountryCode: "US",
        PhoneNumberType: "TOLL_FREE"
     }
     logger.log("Searching available phone numbers for customers: "+req.email, req);

    connectClient.searchAvailablePhoneNumbers(list_phone_number_params, function(err, data){
        if(err){
            logger.logError("Unable to search phone numbers for customer"+req.email, err, req);
            next(err.message);
        }else{
            res.send(data);
        }
    });
}

exports.claim_phone_number = function(req,res,next){

    const phone_number = req.body.phone_number;
    console.log(phone_number);

    AWS.config.update({ region: "us-west-2" });
    var connectClient = new AWS.Connect();

    var claim_phone_number_params = {
        InstanceId: req.instanceID,
        PhoneNumber: phone_number,
        PhoneNumberDescription: req.email,
        Tags: { 
           owner : req.email
        },
    }

    logger.log("Claiming phone number for customers: "+req.email, req);

    connectClient.claimPhoneNumber(claim_phone_number_params, function(err, data){
        if(err){
            logger.logError("Unable to claim phone number for customer"+req.email, err, req);
            next(err.message);
        }else{
            res.send(data);
        }
    });
}

exports.associate_phone_number = function (req, res, next) {
    const flows_table_name = "Flows";
    const contact_flow_id = req.body.contact_flow_id;
    const phone_number_id = req.body.phone_number_id;
    const phone_number = req.body.phone_number;

    AWS.config.update({ region: "us-west-2" });
    const connectClient = new AWS.Connect();

    const associate_phone_number_params = {
        InstanceId: req.instanceID,
        ContactFlowId: contact_flow_id,
        PhoneNumberId: phone_number_id,
    };

    logger.log("Associating phone number to flow for customer: " + req.email, req);

    connectClient.associatePhoneNumberContactFlow(associate_phone_number_params, function (err, data) {
        if (err) {
            logger.logError("Unable to associate phone number to flow for customer: " + req.email, err, req);
            next(err.message);
        } else {
            console.log("Updating Flows table with phone number" + phone_number + " for flow ID: " + contact_flow_id);
            // Add phone number ID to flows DDB table for flow ID
            const params = {
                TableName: flows_table_name,
                Key: {
                    flowOwner: { S: req.email },
                    flowID: { S: contact_flow_id },
                },
                UpdateExpression: "SET #phoneNumber = :phoneNumberValue",
                ExpressionAttributeNames: {
                    "#phoneNumber": "phoneNumber", // Use a placeholder for the attribute name
                },
                ExpressionAttributeValues: {
                    ":phoneNumberValue": { S: phone_number }, // Use a placeholder for the value
                },
                ReturnValues: "UPDATED_NEW", // Return the newly updated attributes
            };

            const ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
            ddb.updateItem(params, function (err, data) {
                if (err) {
                    logger.logError(
                        "Failed to update flow for customer: " +
                            req.email +
                            " with flowID: " +
                            contact_flow_id,
                        err,
                        req
                    );
                    next(err.message);
                } else {
                    logger.log(
                        "Successfully updated flow for customer: " +
                            req.email +
                            " with flowID: " +
                            contact_flow_id,
                        req
                    );
                    res.send(data);
                }
            });
        }
    });
};

exports.describe_phone_number = function(req,res,next){

    const phone_number_id = req.body.phone_number_id;

    AWS.config.update({ region: "us-west-2" });
    var connectClient = new AWS.Connect();

    var phone_number_params = {
        PhoneNumberId: phone_number_id
    }

    logger.log("describing phone number for customers: "+req.email, req);

    connectClient.describePhoneNumber(phone_number_params, function(err, data){
        if(err){
            logger.logError("Unable to describe phone number for customer"+req.email, err, req);
            next(err.message);
        }else{
            res.send(data);
        }
    });
}