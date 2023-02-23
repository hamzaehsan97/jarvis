const MongoBot = require("../db/mongo");
const finance = require("../routes/finance");
const mailman = require("../util/mailman");
const constants = require("../constants/comms_constants");
//Find all users with finance services activate
//Check if they have a bank account connected

exports.runFinanceReports = async function () {
  const query = { "services.finance": true };
  const financeUsers = await MongoBot.Users.getAllUsers(query);
  let usersWithAccessTokens = [];
  for (const user of financeUsers) {
    const accessTokens = await finance.get_account_access_tokens(user.email);
    if (accessTokens) {
      usersWithAccessTokens.push(user.email);
    }
  }
  console.log("users with access tokens", usersWithAccessTokens);
  usersWithAccessTokens.forEach(async (user) => {
    console.log("Running scheduled finance report for user", user);
    console.log(
      "finance report schedular results",
      await finance.generateFinanceReport({ email: user, query: {} }, null, {
        internal: true,
      }),
      "\n"
    );
    await mailman.send_mail(
      user,
      constants.scheduled_finance_report.subject,
      constants.scheduled_finance_report.text
    );
  });
};
