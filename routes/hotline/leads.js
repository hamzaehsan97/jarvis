"use strict";

const MongoBot = require("../../db/mongo");
const mailman = require("../../util/mailman");
const constants = require("../../constants/comms_constants");
// posts leads
exports.create = async function (req, res) {
  try {
    const name = req.query.name;
    const phone_number = req.query.phone_number;
    const size = req.query.size ? req.query.size : -1;
    const society = req.query.society ? req.query.society : "";
    const budget = req.query.budget ? req.query.budget : -1;
    const assignee = req.query.assignee ? req.query.assignee : req.email;
    const wants_to = req.query.wants_to ? req.query.wants_to : "";
    const block = req.query.block ? req.query.block : "";
    const time = req.requestTime;
    if (name && phone_number && size && society && society) {
      let body = {
        name: name,
        phone_number: phone_number,
        size: size,
        society: society,
        author: req.email,
        creationTime: time,
        budget: budget,
        assignee: assignee,
        block: block,
        wants_to: wants_to,
      };
      if (body.assignee !== req.email) {
        notify_lead_assigned(body);
      }
      let result = await MongoBot.Leads.addLead(body);
      res.send(result).end();
    } else {
      res.status(403).json({ message: "invalid request." });
    }
  } catch (ex) {
    console.log("hotline leads create internal service exception", ex);
  }
};

const notify_lead_assigned = async function (body) {
  const lead =
    "<br/><br>Name:<b/> " +
    body.name +
    "<br/><b>Phone Number:</b> " +
    body.phone_number;
  await mailman.send_mail(
    body.assignee,
    constants.lead_assigned.subject + body.author,
    constants.lead_assigned.text + lead
  );
};

// gets either all texties or by filters
exports.list = async function (req, res) {
  try {
    req.query.author = req.email;
    req.query.name = req.query.name
      ? { $regex: req.query.name }
      : { $regex: "" };
    let query = req.query;
    let result = await MongoBot.Leads.findLeads(query);
    res.send(result).end();
  } catch (ex) {
    res.json({
      message: "hotline leads list internal service exception",
      error: ex,
    });
    console.log("hotline leads list internal service exception", ex);
  }
};

// update texties based on id
exports.update = async function (req, res) {
  try {
    const id = req.query.id;
    let body = {};
    req.query.name ? (body.name = req.query.name) : {};
    req.query.phone_number ? (body.phone_number = req.query.phone_number) : {};
    req.query.plot_number ? (body.plot_number = req.query.phone_number) : {};
    req.query.society ? (body.society = req.query.society) : {};
    req.query.size ? (body.size = req.query.size) : {};
    req.query.assignee ? (body.assignee = req.query.assignee) : {};
    req.query.block ? (body.block = req.query.block) : {};
    req.query.wants_to ? (body.wants_to = req.query.wants_to) : {};
    body.lastUpdateTime = req.requestTime;
    if (body.assignee) {
      if (body.assignee != req.email) {
        notify_lead_assigned(body);
      }
    }
    try {
      const result = await MongoBot.Leads.updateLead(id, body);
      res.send(result).end();
    } catch {
      res
        .status(400)
        .json({
          message: "error in updating lead.",
        })
        .end();
    }
  } catch (ex) {
    console.log("hotline leads update internal service exception", ex);
  }
};

// delete texties based on _id
exports.delete = async function (req, res) {
  try {
    const id = req.query.id;
    const result = await MongoBot.Leads.delLead(id);
    res.json({ leads_deleted: result }).end();
  } catch (ex) {
    console.log("hotline leads delete internal service exception", ex);
    res.status(500).json({ message: "error in deleting lead" });
  }
};
