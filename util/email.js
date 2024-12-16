var AWS = require("aws-sdk");
const logger = require("./logger");

exports.sendEmail = async function(destinationEmail, emailContent, emailSubject, req){
    AWS.config.update({ region: "us-west-2" });
    const ses = new AWS.SES({ apiVersion: '2010-12-01' });
    // Email parameters
    const params = {
        Destination: {
        ToAddresses: [destinationEmail], 
        },
        Message: {
        Body: {
            Text: { Data: emailContent }, // Email body
        },
        Subject: { Data: emailSubject }, // Email subject
        },
        Source: 'hamzaehsan75@gmail.com', // Sender email address
    };

    // Send email
    ses.sendEmail(params, (err, data) => {
        if (err) {
            logger.logError("failed to send an email to: "+destinationEmail, err, req);
            return false;
        }else{
            return true;
        }
    });
}