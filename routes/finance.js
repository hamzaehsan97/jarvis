require("dotenv").config();
const services = require("./services");
const MongoBot = require("../db/mongo");
const util = require("util");
const {
  Configuration,
  PlaidApi,
  Products,
  PlaidEnvironments,
} = require("plaid");
const { v4: uuidv4 } = require("uuid");
const PLAID_PRODUCTS = (
  process.env.PLAID_PRODUCTS || Products.Transactions
).split(",");
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
          client_user_id: "ASDQ#@$#owdhgoshgosd",
        },
        client_name: "Plaid Quickstart",
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
      const createTokenResponse = await client.linkTokenCreate(configs);
      // prettyPrintResponse(createTokenResponse);
      response.json(createTokenResponse.data);
    })
    .catch(next);
};

exports.set_access_token = async function (request, response, next) {
  PUBLIC_TOKEN = request.body.public_token;
  Promise.resolve()
    .then(async function () {
      const tokenResponse = await client.itemPublicTokenExchange({
        public_token: PUBLIC_TOKEN,
      });
      prettyPrintResponse(tokenResponse);
      ACCESS_TOKEN = tokenResponse.data.access_token;
      ITEM_ID = tokenResponse.data.item_id;
      const save_token = await MongoBot.BankAccounts.addAccessToken({
        email: req.email,
        access_token: tokenResponse.data.access_token,
        item_id: tokenResponse.data.item_id,
      });
      console.log("SAVE TOKEN STATUS", save_token);
      // if (PLAID_PRODUCTS.includes(Products.Transfer)) {
      //   TRANSFER_ID = await authorizeAndCreateTransfer(ACCESS_TOKEN);
      // }
      response.json({
        // the 'access_token' is a private token, DO NOT pass this token to the frontend in your production environment
        access_token: "Access token received",
        item_id: "Item id received",
        error: null,
      });
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
    if (results.length > 0) {
      return results[0].access_token;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

// Retrieve real-time Balances for each of an Item's accounts
// https://plaid.com/docs/#balance
exports.get_balance = async function (request, response, next) {
  const account_token = get_account_access_token;
  if (account_token) {
    Promise.resolve()
      .then(async function () {
        const balanceResponse = await client.accountsBalanceGet({
          access_token: account_token,
        });
        prettyPrintResponse(balanceResponse);
        response.json(balanceResponse.data);
      })
      .catch(next);
  } else {
    response.status(404).json({
      message: "Access tokens not found for this account",
    });
  }
};
