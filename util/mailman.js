const nodemailer = require("nodemailer");
require("dotenv").config();
const accountSid = "ACa8d0cb233f2f43304aab97b8f4e52f8e";
const authToken = process.env.TWILIO_TOKEN;
const client = require("twilio")(accountSid, authToken);
const validation = require("./validation");
exports.send_mail = async function (receiver, subject, text, html) {
  return new Promise((resolve, reject) => {
    let transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_SENDER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mail_configs = {
      from: process.env.EMAIL_SENDER,
      to: receiver,
      subject: subject,
      text: text,
      html: text,
    };

    transporter.sendMail(mail_configs, function (error, info) {
      if (error) {
        console.log(error);
        return reject({ status: 403, message: "unable to send email" });
      } else {
        return resolve({ status: 200, message: "email sent successfully" });
      }
    });
  });
};

exports.send_text = async function (phone_number, message) {
  if (validation.phone_number_validate(phone_number)) {
    try {
      client.messages
        .create({
          to: phone_number,
          from: "+15126050927",
          body: message,
        })
        .then((message) => console.log(message.sid))
        .done();
    } catch (ex) {
      console.log("Exception in sending text message", ex);
      throw new Error();
    }
    return true;
  }
  return false;
};
