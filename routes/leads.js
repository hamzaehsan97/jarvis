"use strict";

const MongoBot = require("../db/mongo");

// posts leads
exports.create = async function (req, res) {
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
    let result = await MongoBot.Leads.addLead(body);
    res.send(result).end();
  } else {
    res.status(403).json({ message: "invalid request." });
  }
};

// gets either all texties or by filters
exports.list = async function (req, res) {
  req.query.author = req.email;
  req.query.name = req.query.name ? { $regex: req.query.name } : { $regex: "" };
  let query = req.query;
  let result = await MongoBot.Leads.findLeads(query);
  res.send(result).end();
};

// get all hotline employees
exports.employees = async function (req, res) {
  let body = req.query;
  body.role = "hotline_employee";
  try {
    const result = await MongoBot.Users.getHotlineEmployees(body);
    if (result === undefined) {
      res.status(404).send({ message: "user not found" }).end();
    } else if (result.length === 0) {
      res.status(404).json({
        message: "no employees found with provided filters",
      });
    } else {
      let employees = [];
      result.forEach((employee) => {
        employees.push({
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          phone_number: employee.phone_number,
        });
      });
      res.send(employees).end();
    }
  } catch (ex) {
    res.status(500).json({
      message: "error in finding employees",
    });
  }
};

// update texties based on id
exports.update = async function (req, res) {
  const id = req.query.id;
  let body = {};
  req.query.name ? (body.name = req.query.name) : {};
  req.query.society ? (body.society = req.query.society) : {};
  req.query.size ? (body.size = req.query.size) : {};
  req.query.phone_number ? (body.phone_number = req.query.phone_number) : {};
  req.query.assignee ? (body.assignee = req.query.assignee) : {};
  req.query.block ? (body.block = req.query.block) : {};
  req.query.wants_to ? (body.wants_to = req.query.wants_to) : {};
  body.lastUpdateTime = req.requestTime;
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
};

// delete texties based on _id
exports.delete = async function (req, res) {
  try {
    const id = req.query.id;
    const result = await MongoBot.Leads.delLead(id);
    res.json({ leads_deleted: result }).end();
  } catch (ex) {
    res.status(500).json({ message: "error in deleting lead" });
  }
};
