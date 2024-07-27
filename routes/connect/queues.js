"use strict";
const AWS = require("aws-sdk");
const logger = require("../../util/logger");

exports.delete = async function(req,res,next){
    const queueID = req.body.queueID;
    const instanceID = req.body.instanceID;
  
    AWS.config.update({ region: "us-west-2" });

    const connectClient = new AWS.Connect();

    var params = {
        InstanceId: instanceID,
        QueueId: queueID
    }

    connectClient.deleteQueue(params, function(err, data){
        if(err){
            logger.logError("failed to delete queue for customer: "+req.email, err, req);
            next(err.message)
        }else{
            logger.log("successfully deleted queue for customer: "+req.email, req);
            res.send(data);
        }

    })


}