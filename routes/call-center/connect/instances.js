"use strict"
const AWS = require('aws-sdk');


const create = async function(req, res, next){
    AWS.config.update({ region: 'us-west-2' });

    const connect = new AWS.Connect();

    const instanceName = req.query.instanceName;
    const instanceOwner = req.email;
    if(instanceOwner === "hamzaehsan75@gmail.com"){
        
        // Define the parameters
        const params = {
            IdentityManagementType: 'CONNECT_MANAGED', // Options: 'SAML', 'CONNECT_MANAGED', 'EXISTING_DIRECTORY'
            InstanceAlias: instanceName, // Optional alias for the instance
            InboundCallsEnabled: true, // Whether inbound calls are enabled
            OutboundCallsEnabled: true // Whether outbound calls are enabled
        };

        // Create the Connect instance
        connect.createInstance(params, (err, data) => {
            if (err) {
            console.error('Error creating instance:', err);
            next(new Error(err));
            } else {
            console.log('Instance created successfully:', data);
            res.send(data);
            }
        });
    }else{
        req.status(401).send("You are not allowed to create an instance.")
    }
}
exports.create = create;