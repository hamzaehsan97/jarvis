require("dotenv").config();
const services = require("./services");
const MongoBot = require("../db/mongo");
const Encryption = require("../util/encryption");
const dateUtil = require("../util/date");

require("dotenv").config();

const util = require("util");
const {
  Configuration,
  PlaidApi,
  Products,
  ItemPublicTokenExchangeRequest,
  PlaidEnvironments,
} = require("plaid");
const { v4: uuidv4 } = require("uuid");
const { response } = require("express");
const { report } = require("process");
const PLAID_PRODUCTS = process.env.PLAID_PRODUCTS.split(",");
const PLAID_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES || "US").split(
  ","
);
const PLAID_REDIRECT_URI = process.env.PLAID_REDIRECT_URI || "";
const PLAID_ANDROID_PACKAGE_NAME = process.env.PLAID_ANDROID_PACKAGE_NAME || "";
const SERVICE_NAME = "finance";
let PUBLIC_TOKEN = null;

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

const client = new PlaidApi(configuration);
const prettyPrintResponse = (response) => {
  console.log(util.inspect(response.data, { colors: true, depth: 4 }));
};

// Create a link token with configs which we can then use to initialize Plaid Link client-side.
// See https://plaid.com/docs/#create-link-token
exports.create_link_token = async function (request, response, next) {
  Promise.resolve()
    .then(async function () {
      const configs = {
        user: {
          // This should correspond to a unique id for the current user.
          client_user_id: request.user._id,
        },
        client_name: "ByteButler",
        products: PLAID_PRODUCTS,
        country_codes: PLAID_COUNTRY_CODES,
        language: "en",
      };

      if (PLAID_REDIRECT_URI !== "") {
        configs.redirect_uri = PLAID_REDIRECT_URI;
      }

      if (PLAID_ANDROID_PACKAGE_NAME !== "") {
        configs.android_package_name = PLAID_ANDROID_PACKAGE_NAME;
      }
      try {
        const createTokenResponse = await client.linkTokenCreate(configs);
        prettyPrintResponse(createTokenResponse);
        response.json(createTokenResponse.data);
      } catch (exp) {
        console.log("Exception", exp);
        response.status(400).json({ message: "Error creating link" });
      }
    })
    .catch(next);
};

exports.set_access_token = async function (request, response, next) {
  const publicToken = request.query.public_token;
  const body = {
    public_token: publicToken,
  };
  Promise.resolve()
    .then(async function () {
      let access_token = null;
      let item_id = null;
      try {
        const tokenResponse = await client.itemPublicTokenExchange(body);
        access_token = tokenResponse.data.access_token;
        item_id = tokenResponse.data.item_id;
        if (access_token && item_id) {
          //persist the token permanently
          const save_token = await MongoBot.BankAccounts.addAccessToken({
            email: request.email,
            access_token: await Encryption.encrypt(
              process.env.AUTH_SECRET,
              access_token
            ),
            item: item_id,
            // item_id: await Encryption.encrypt(process.env.AUTH_SECRET, item_id),
          });
          if (save_token !== null) {
            response.json({
              message: "Bank account connected successfully",
              item_id: "Item id created",
              error: null,
            });
          }
        } else {
          response.status(400).json({
            message: "Error is connecting bank account",
            error: "Unknown issue happened",
          });
        }
      } catch (ex) {
        response.status(400).json({
          message: "Error is connecting bank account",
          error: "Unknown issue happened",
        });
        console.log(ex.response.data);
      }
    })
    .catch(next);
};

const get_account_access_token = async function (email) {
  const finance_activated = await services.is_activated(email, SERVICE_NAME);
  if (finance_activated) {
    const query = {
      email: email,
    };
    const results = await MongoBot.BankAccounts.findAccessToken(query);
    let tokens = [];
    if (results.length > 0) {
      results.forEach((result) => {
        const token = Encryption.decrypt(
          result.access_token,
          process.env.AUTH_SECRET
        );
        tokens.push(token);
      });
      return tokens;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

const get_items = async function (request, response, args) {
  const body = {};
  body.email = request.email;
  request.query.item_type
    ? (body.item_type = request.query.item_type)
    : args.type
    ? (body.item_type = args.type)
    : {};
  args.item_id ? (body.item_id = args.item_id) : {};
  console.log("body", body);
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
  response
    ? response.json({
        response: results,
      })
    : {};
};

exports.get_items = get_items;

// Retrieve real-time Balances for each of an Item's accounts
// https://plaid.com/docs/#balance
exports.get_balance = async function (request, response, next) {
  const account_tokens = await get_account_access_token(request.email);
  if (account_tokens.length > 0) {
    account_tokens.forEach((account_token) => {
      Promise.resolve()
        .then(async function () {
          const balanceResponse = await client.accountsBalanceGet({
            access_token: account_token,
          });
          prettyPrintResponse(balanceResponse);
          response.json(balanceResponse.data);
        })
        .catch(next);
    });
  } else {
    response.status(404).json({
      message: "Access tokens not found for this account",
    });
  }
};

// Retrieve Liabilities for an Item
// https://plaid.com/docs/#liabilities
const update_liabilities = async function (request, response, next) {
  // get all tokens(accounts) for a user
  const account_tokens = await get_account_access_token(request.email);

  const get_all_liabilities = async function () {
    let liabilities_list = [];
    if (account_tokens.length > 0) {
      for (const account_token of account_tokens) {
        if (account_token) {
          const poop = async function () {
            console.log("getting liabilities for user ", account_token);
            const liabilitiesResponse = await client.liabilitiesGet({
              access_token: account_token,
            });
            const date = dateUtil.getDate(request.requestTime);
            let balance = 0;
            let last_payment = 0;
            liabilitiesResponse.data.liabilities.credit.forEach((credit) => {
              balance = balance + credit.last_statement_balance;
              last_payment = last_payment + credit.last_payment_amount;
            });
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
                    timestamp: request.requestTime,
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
    return liabilities_list;
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

exports.update_liabilities = update_liabilities;

const persist_items = async function (req, res, type, bodies) {
  let saved = true;
  bodies.forEach(async (body) => {
    let args = {};
    args.type = type;
    args.item_id = body.item_id;
    const current_items = await get_items(req, res, args);
    if (current_items.length > 0 && current_items.length < 2) {
      console.log(
        "item record already exists for user ",
        req.email,
        ". Updating user finance item now."
      );
      let liabilities_timeline = current_items[0].records;
      console.log(
        "This is the current length of records for this item before update = ",
        liabilities_timeline.length
      );
      liabilities_timeline.push(body.records[0]);
      body.current_balance = body.current_balance;
      body.records = liabilities_timeline;
      body.lastUpdate = dateUtil.getDate(req.requestTime);
      MongoBot.FinanceItems.updateItem(current_items[0]._id, body);
    } else {
      try {
        bodies.forEach(async (body) => {
          console.log("persisting finance data for user ", body.email);
          body.creationDate = dateUtil.getDate(req.requestTime);
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
  const run_liabilities_update = await update_liabilities(request, response, {
    internal: true,
  });
  console.log("ran liabilities update", run_liabilities_update);
  const liabilities_list = await get_items(request, response, {
    type: "liabilities",
  });
  const curr_report = await get_items(request, response, {
    type: "finance_report",
  });
  let total_liabilities_balance = 0;
  let total_last_payments = 0;
  let sum_assets = 0;
  const date = dateUtil.getDate(request.requestTime);

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
        timestamp: request.requestTime,
      },
      item_type: "finance_report",
      lastUpdate: dateUtil.getDate(request.requestTime),
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
            timestamp: request.requestTime,
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
    report.lastUpdate = dateUtil.getDate(request.requestTime);
    let latest_records = report.records;
    latest_records.push({
      creationTime: {
        date: date,
        year: date.split("/")[2],
        month: date.split("/")[1],
        day: date.split("/")[0],
        timestamp: request.requestTime,
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
  const res = await get_items(request, response, {
    type: "finance_report",
  });
  response.send(res).end();
};

exports.generateFinanceReport = generateFinanceReport;
