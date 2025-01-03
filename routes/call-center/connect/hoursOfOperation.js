"use strict";
const AWS = require("aws-sdk");
const logger = require("../../../util/logger");

exports.describe = async function(req,res,next){
    const hoursOfOperationId = req.body.hoursOfOperationId;
    const instanceID = req.body.instanceID;
  
    AWS.config.update({ region: "us-west-2" });

    const connectClient = new AWS.Connect();

    var params = {
        InstanceId: instanceID,
        HoursOfOperationId: hoursOfOperationId
    }

    connectClient.describeHoursOfOperation(params, function(err, data){
        if(err){
            logger.logError("failed to describe hoursOfOperation for customer: "+req.email, err, req);
            next(err.message)
        }else{
            logger.log("successfully describe hoursOfOperation for customer: "+req.email, req);
            res.send(data);
        }

    })
}

exports.update = async function(req,res,next){
    const hoursOfOperationId = req.body.hoursOfOperationId;
    const instanceID = req.body.instanceID;
    const Config = req.body.Config;
    const TimeZone = req.body.TimeZone;

    AWS.config.update({ region: "us-west-2" });

    const connectClient = new AWS.Connect();

    var params = {
        InstanceId: instanceID,
        HoursOfOperationId: hoursOfOperationId,
        Config: Config,
        TimeZone: TimeZone
    }

    connectClient.UpdateHoursOfOperationCommand(params, function(err, data){
        if(err){
            logger.logError("failed to describe hoursOfOperation for customer: "+req.email, err, req);
            next(err.message)
        }else{
            logger.log("successfully describe hoursOfOperation for customer: "+req.email, req);
            res.send(data);
        }

    })
}