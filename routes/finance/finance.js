require("dotenv").config();
const services = require("../services/services");
const MongoBot = require("../../db/mongo");
const Encryption = require("../../util/encryption");

require("dotenv").config();

const {
  Configuration,
  PlaidApi,
  Products,
  ItemPublicTokenExchangeRequest,
  PlaidEnvironments,
} = require("plaid");
const SERVICE_NAME = "finance";

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

const get_account_access_token = async function (email) {
  const finance_activated = await services.is_activated(email, SERVICE_NAME);
  if (finance_activated) {
    const query = {
      email: email,
    };
    console.log("Fetching finance account tokens for user", email);
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
      console.log("Found more than one finance tokens for user", email);
      return tokens;
    } else {
      console.warn("Could not find any finance tokens for user", email);
      return false;
    }
  } else {
    return false;
  }
};
exports.get_account_access_token = get_account_access_token;






