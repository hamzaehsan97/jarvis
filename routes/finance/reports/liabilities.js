require("dotenv").config();
const MongoBot = require("../../../db/mongo");
const dateUtil = require("../../../util/date");

require("dotenv").config();

const {
  Configuration,
  PlaidApi,
  Products,
  ItemPublicTokenExchangeRequest,
  PlaidEnvironments,
} = require("plaid");

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
      "Plaid-Version": "2020-09-14",
    },
  },
});

const plaid_client = new PlaidApi(configuration);
exports.plaid_client = plaid_client;

const get_liabilities_report = async function (request, response, args) {
    const body = {};
    body.email = request.email;
    request.query.item_type
      ? (body.item_type = request.query.item_type)
      : args.type
      ? (body.item_type = args.type)
      : {};
    args.item_id ? (body.item_id = args.item_id) : {};
    const results = await MongoBot.FinanceItems.findItem(body);
    let function_check = false;
    if (
      args.type === "liabilities" ||
      args.type === "assets" ||
      args.type === "finance_report"
    ) {
      function_check = true;
    }
    if (function_check === true) {
      return results;
    }
  
    // If the last time the report was run was more than 6 days, generate a new report for the user and send a message asking to refresh page.
    let message = null;
    if (results.length > 0 && body.item_type === "finance_report") {
      let timeDiff = Date.now() - results[0].records[0].creationTime.timestamp;
      timeDiff = Math.floor(timeDiff / 1000 / 60 / 60 / 24);
      console.log("Time diff in days", timeDiff);
      if (timeDiff > 6) {
        console.log(
          "Generating a fresh financial report for user because time difference is more than 6 days. Timestamp for prev report is " +
            results[0].records[0].creationTime.timestamp +
            ". Email of user is ",
          request.email
        );
        generateFinanceReport({ email: request.email, query: {} }, null, {
          internal: true,
        });
        message =
          "Generating a fresh financial report for you since the previous report is older than 6 days. Please refresh page to view a fresh report.";
      }
    } else if (results.length == 0) {
      generateFinanceReport({ email: request.email, query: {} }, null, {
        internal: true,
      });
      message =
        "Generating a new report, refresh page to review latest report because length of results is 0";
    }
    response
      ? response.json({
          response: results,
          message: message,
        })
      : {};
  };
  
  exports.get_liabilities_report = get_liabilities_report;


  // Retrieve Liabilities for an Item
// https://plaid.com/docs/#liabilities
const update_liabilities_report = async function (request, response, next) {
    // get all tokens(accounts) for a user
    const account_tokens = await get_account_access_token(request.email);
  
    const get_all_liabilities = async function () {
      let liabilities_list = [];
      if (account_tokens.length > 0) {
        for (const account_token of account_tokens) {
          if (account_token) {
            const poop = async function () {
              // console.log("getting liabilities for user ", account_token);
              const liabilitiesResponse = await plaid_client.liabilitiesGet({
                access_token: account_token,
              });
              const date = dateUtil.getDate(Date.now());
              let balance = 0;
              let last_payment = 0;
              liabilitiesResponse.data.liabilities.credit.forEach((credit) => {
                balance = balance + credit.last_statement_balance;
                last_payment = last_payment + credit.last_payment_amount;
              });
              last_payment = Math.round(last_payment);
              balance = Math.round(balance);
              const total_last_payment = last_payment;
              const total_balance = balance;
              let liabilities_body = {
                item_id: liabilitiesResponse.data.item.item_id,
                email: request.email,
                item_type: "liabilities",
                current_balance: total_balance,
                records: [
                  {
                    creationTime: {
                      date: date,
                      year: date.split("/")[2],
                      month: date.split("/")[1],
                      day: date.split("/")[0],
                      timestamp: Date.now(),
                    },
                    balance: total_balance,
                    last_payment: total_last_payment,
                    accounts: liabilitiesResponse.data.accounts,
                    liabilities: liabilitiesResponse.data.liabilities,
                  },
                ],
              };
              await persist_items(request, response, "liabilities", [
                liabilities_body,
              ]);
              liabilities_list.push(liabilities_body);
            };
            await poop();
          }
        }
      }
      return liabilities_list.slice(-10);
    };
  
    const return_body = await get_all_liabilities();
    if (next.internal) {
      return return_body;
    } else {
      response.json({
        error: null,
        liabilities: return_body,
      });
    }
  };
  
  exports.update_liabilities_report = update_liabilities_report;
  
  const persist_items = async function (req, res, type, bodies) {
    let saved = true;
    bodies.forEach(async (body) => {
      let args = {};
      args.type = type;
      args.item_id = body.item_id;
      const current_items = await get_liabilities_report(req, res, args);
      if (current_items.length > 0 && current_items.length < 2) {
        let liabilities_timeline = current_items[0].records;
        liabilities_timeline.push(body.records[0]);
        body.current_balance = body.current_balance;
        body.records = liabilities_timeline;
        body.lastUpdate = dateUtil.getDate(Date.now());
        MongoBot.FinanceItems.updateItem(current_items[0]._id, body);
      } else {
        try {
          bodies.forEach(async (body) => {
            console.log("persisting finance data for user ", body.email);
            body.creationDate = dateUtil.getDate(Date.now());
            const response = await MongoBot.FinanceItems.addItem(body);
            if (response === undefined || response === null) {
              saved = false;
            } else {
              console.log("successfully saved item to DB:", body.item_type);
            }
          });
        } catch (e) {
          saved = false;
          console.log("DB exception while persisting finance items", e);
        }
      }
    });
    return saved;
};  

const generateFinanceReport = async function (request, response, next) {
    // Update recent liability report
    const run_liabilities_update = await update_liabilities_report(request, response, {
      internal: true,
    });
    console.log("ran liabilities update for user", request.email);
  
    // Get updated list of liability
    const liabilities_list = await get_items_internal(
      request.email,
      "liabilities"
    );
  
    // Get current finance report
    const curr_report = await get_items_internal(request.email, "finance_report");
  
    let total_liabilities_balance = 0;
    let total_last_payments = 0;
    let sum_assets = 0;
    const date = dateUtil.getDate(Date.now());
  
    // If a liability report does not exist, initialize a liability report
    if (curr_report.length < 1) {
      // Collect liabilities information
      for (const liability in liabilities_list) {
        console.log(
          "liability.current_balance",
          liabilities_list[liability].current_balance
        );
        total_liabilities_balance =
          total_liabilities_balance + liabilities_list[liability].current_balance;
        total_last_payments =
          total_last_payments +
          liabilities_list[liability].records[0].last_payment;
      }
      const body = {
        email: request.email,
        creationTime: {
          date: date,
          year: date.split("/")[2],
          month: date.split("/")[1],
          day: date.split("/")[0],
          timestamp: Date.now(),
        },
        item_type: "finance_report",
        lastUpdate: dateUtil.getDate(Date.now()),
        liabilities: {
          liabilities_balance: total_liabilities_balance,
          prev_liabilities_balance: 0,
          last_payment: total_last_payments,
          prev_last_payment: 0,
        },
        assets: {
          total_assets: sum_assets,
          prev_total_assets: 0,
        },
        records: [
          {
            creationTime: {
              date: date,
              year: date.split("/")[2],
              month: date.split("/")[1],
              day: date.split("/")[0],
              timestamp: Date.now(),
            },
            liabilities: {
              liabilities_balance: total_liabilities_balance,
              last_payment: total_last_payments,
            },
            assets: {
              total_assets: sum_assets,
            },
            records: [],
          },
        ],
      };
      await persist_items(request, response, "finance_report", [body]);
    } else {
      let total_liabilities_balance = 0;
      let total_last_payments = 0;
      let sum_assets = 0;
      for (const liability in liabilities_list) {
        total_liabilities_balance =
          total_liabilities_balance + liabilities_list[liability].current_balance;
        total_last_payments =
          total_last_payments +
          liabilities_list[liability].records[0].last_payment;
      }
      let report = curr_report[0];
      report.liabilities["prev_liabilities_balance"] =
        report.liabilities["liabilities_balance"];
      report.liabilities["prev_last_payment"] =
        report.liabilities["last_payment"];
      report.liabilities["liabilities_balance"] = total_liabilities_balance;
      report.liabilities["last_payment"] = total_last_payments;
      report.assets["prev_total_assets"] = report.assets["total_assets"];
      report.assets["total_assets"] = sum_assets;
      report.lastUpdate = dateUtil.getDate(Date.now());
      let latest_records = report.records;
      latest_records.push({
        creationTime: {
          date: date,
          year: date.split("/")[2],
          month: date.split("/")[1],
          day: date.split("/")[0],
          timestamp: Date.now(),
        },
        liabilities: {
          liabilities_balance: total_liabilities_balance,
          last_payment: total_last_payments,
        },
        assets: {
          total_assets: sum_assets,
        },
      });
      report.records = latest_records;
      delete report.lastModified;
      await MongoBot.FinanceItems.updateItem(report._id, report);
    }
    const res = await get_items_internal(request, response, {
      type: "finance_report",
    });
    return true;
};
  
exports.generateFinanceReport = generateFinanceReport;


const get_items_internal = async function (email, item_type) {
    const body = {};
    body.email = email;
    body.item_type = item_type;
    const results = await MongoBot.FinanceItems.findItem(body);
    return results;
  };
exports.get_items_internal = get_items_internal;