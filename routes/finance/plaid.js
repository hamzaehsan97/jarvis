require("dotenv").config();
const MongoBot = require("../../db/mongo");
const Encryption = require("../../util/encryption");
const dateUtil = require("../../util/date");

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
const { time } = require("console");
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
        const createTokenResponse = await plaid_client.linkTokenCreate(configs);
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
          const tokenResponse = await plaid_client.itemPublicTokenExchange(body);
          access_token = tokenResponse.data.access_token;
          item_id = tokenResponse.data.item_id;
          if (access_token && item_id) {
            //persist the token permanently
            const date = dateUtil.getDate(Date.now());
            const save_token = await MongoBot.BankAccounts.addAccessToken({
              email: request.email,
              creationTime: {
                date: date,
                year: date.split("/")[2],
                month: date.split("/")[1],
                day: date.split("/")[0],
                timestamp: Date.now(),
              },
              access_token: await Encryption.encrypt(
                process.env.AUTH_SECRET,
                access_token
              ),
              item: item_id,
              // item_id: await Encryption.encrypt(process.env.AUTH_SECRET, item_id),
            });
            if (save_token !== null) {
              console.log(
                "Generating a fresh financial report for user",
                request.email
              );
              generateFinanceReport({ email: request.email, query: {} }, null, {
                internal: true,
              });
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