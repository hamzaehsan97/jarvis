const nodemailer = require("nodemailer");
require("dotenv").config();

exports.send_mail = async function (receiver, subject, text) {
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
