require("dotenv").config();

const finance = require("./finance");
const util = require("util");
const prettyPrintResponse = (response) => {
  console.log(util.inspect(response.data, { colors: true, depth: 4 }));
};

// Retrieve real-time Balances for each of an Item's accounts
// https://plaid.com/docs/#balance
exports.get_balance = async function (request, response, next) {
  const account_tokens = await finance.get_account_access_token(request.email);
  if (account_tokens.length > 0) {
    console.log("getting account balance for user ", request.email)
    account_tokens.forEach((account_token) => {
      Promise.resolve()
        .then(async function () {
          const balanceResponse = await finance.plaid_client.accountsBalanceGet({
            access_token: account_token,
          });
          response.json(balanceResponse.data);
        })
        .catch((error) => {console.error(error); response.status(500).json({error: error})});
    });
  } else {
    response.status(404).json({
      message: "Access tokens not found for this account",
    });
  }
};