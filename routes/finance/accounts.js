require("dotenv").config();
const services = require("../services/services");
const MongoBot = require("../../db/mongo");
const SERVICE_NAME = "finance";

const list_finance_accounts = async function (request, response) {
    const email = request.email;
    const finance_activated = await services.is_activated(email, SERVICE_NAME);
    if (finance_activated) {
      const query = {
        email: email,
      };
      console.log("Fetching finance accounts for user", request.email);
      const results = await MongoBot.BankAccounts.findAccessToken(query);
      response.send({
        data: results,
      });
    } else {
      console.log("No bank accounts connected for this user", request.email);
      response.send({
        data: null,
        message: "No bank accounts connected for this user.",
      });
    }
  };
  exports.list_finance_accounts = list_finance_accounts;