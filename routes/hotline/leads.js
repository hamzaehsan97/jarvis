"use strict";

const MongoBot = require("../../db/mongo");
const mailman = require("../../util/mailman");
const constants = require("../../constants/comms_constants");
const inputValidation = require("../../util/validation");
const date = require("../../util/date");

const budget_map = {
  thousand: 1000,
  lakh: 1000,
  million: 1000000,
  crore: 10000000,
};

const size_map = {
  marla: 1,
  kanal: 20,
  acre: 160,
};

// posts leads
exports.create = async function (req, res) {
  try {
    const name = inputValidation.capitalize(req.query.name);
    // validate phone number
    inputValidation.phone_number_validate(req.query.phone_number);
    const phone_number = req.query.phone_number;
    const size = req.query.size ? req.query.size : -1;
    const society = req.query.society
      ? inputValidation.capitalize(req.query.society)
      : "";
    const budget = req.query.budget ? req.query.budget : -1;
    const budget_unit = req.query.budget_unit ? req.query.budget_unit : "lakh";
    const size_unit = req.query.size_unit ? req.query.size_unit : "marla";
    const assignee = req.query.assignee ? req.query.assignee : req.email;
    const wants_to = req.query.wants_to ? req.query.wants_to : "";
    const block = req.query.block ? req.query.block : "";
    const time = req.requestTime;
    if (name && phone_number && size && society && society) {
      const budget_int = parseInt(budget) * budget_map[budget_unit];
      const size_in_marla = parseInt(size) * size_map[size_unit];
      let body = {
        name: name,
        phone_number: phone_number,
        size: {
          size_in_marla: size_in_marla,
          size_string: size + " " + inputValidation.capitalize(size_unit),
        },
        society: society,
        author: req.user.first_name + " " + req.user.last_name,
        creationTime: {
          timestamp: time,
          date: date.getDate(time),
        },
        budget: {
          budget_string: budget_int
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ","),
          budget_int: budget_int,
          budget_with_unit:
            budget + " " + inputValidation.capitalize(budget_unit),
        },
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
    console.log(ex);
    res.send({
      error: ex,
      message: "Error in creating new lead",
    });
  }
};

const notify_lead_assigned = async function (body) {
  const lead =
    "<br/><br/><b>Name:</b> " +
    body.name +
    "<br/><b>Phone Number:</b> " +
    body.phone_number +
    "<br/><b>Client Type:</b> " +
    body.wants_to +
    "<br/><b>Society:</b> " +
    body.society +
    "<br/><b>Size:</b> " +
    body.size.size_string +
    "<br/><b>Block:</b> " +
    body.block +
    "<br/><b>Budget:</b> " +
    body.budget.budget_with_unit +
    "<br/><b>Created Time:</b> " +
    body.creationTime.date +
    "<br/><b>Author:</b> " +
    body.author +
    "<br/><b>Assigned To:</b> " +
    body.assignee;

  const lead_sms =
    "\n\nName : " +
    body.name +
    "\nPhone Number: " +
    body.phone_number +
    "\nClient Type: " +
    body.wants_to +
    "\nSociety: " +
    body.society +
    "\nBlock: " +
    body.block +
    "\nSize: " +
    body.size.size_string +
    "\nBudget: " +
    body.budget.budget_with_unit +
    "\nAuthor: " +
    body.author;
  await mailman.send_mail(
    body.assignee,
    constants.lead_assigned.subject + body.author,
    constants.lead_assigned.text + lead
  );
  const assigneeBody = await MongoBot.Users.getUser(body.assignee);
  try {
    await mailman.send_text(
      assigneeBody.phone_number,
      constants.lead_assigned.text + lead_sms
    );
  } catch (ex) {
    console.log("Exception in sending text message", ex);
  }
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
