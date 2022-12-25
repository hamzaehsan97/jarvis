"use strict";

const mailman = require("../util/mailman");
const constants = require("../constants/comms_constants");

exports.send_email = function (req, res) {
  mailman
    .send_mail(req.query.receiver, req.query.subject, req.query.text)
    .then((response) => res.send(response.message))
    .catch((error) => res.status(500).send(error.message));
};
