const express = require("express");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");
const path = require("path");
const communicate = require("./routes/communicate/communicate");
const auth = require("./routes/auth/auth");
const users = require("./routes/users/users");
const texties = require("./routes/texties/texties");
const services = require("./routes/services/services");
const passwords = require("./routes/passwords/passwords");
const finance = require("./routes/finance/finance");
const finance_plaid = require("./routes/finance/plaid");
const finance_accounts = require("./routes/finance/accounts");
const finance_balance = require("./routes/finance/balance");
const finance_liabilities_reports = require("./routes/finance/reports/liabilities");
const tokenValidator = require("./middleware/auth_middleware");
const service_middleware = require("./middleware/service_middleware");
const time_middleware = require("./middleware/time_middleware");
const users_middleware = require("./middleware/users_middleware");
const role_middleware = require("./middleware/role_middleware");
const validate_params = require("./constants/validate");
const schedular = require("./util/schedular");
const validator = require("./middleware/validation");
const params = validate_params.api_params;
const cors = require("cors");
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const app = express();
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.set("port", PORT);

const MongoBot = require("./db/mongo");
async function start() {
  await MongoBot.init();
  app.listen(PORT);
}
start();

app.use(cors());
app.use(cookieParser());
app.use(time_middleware.requestTime);

app.get("/", (req, res) => {
  res.status(200).send("welcome young'n").end();
});

// User routes

//** User CRUD Routes */
app.route("/users")
  .post(users_middleware.createUser, users.create) //create a new user
  .get( tokenValidator.validate, users.read) //read a user
  .patch(tokenValidator.validate, users.update) //update a user
  .delete(tokenValidator.validate, users.delete); //delete a user

//** User Custom Routes */
app.post("/users/verify", validator.validate(params.verify.post), users.verify_account); //verify user account with email and otp
app.patch("/users/otp", validator.validate(params.otp.patch), users.create_otp); //create a new otp code for the user
app.get("/users/otp", validator.validate(params.otp.get), users.verify_otp); //verify user otp
app.patch("/users/password", validator.validate(params.user_password.patch), users.update_password); //update user password, otp required
app.post("/users/secret", validator.validate(params.secret.post), tokenValidator.validate, users.set_secret); //update user secret
app.get("/users/logout", users.logout);

// Auth routes
app.get("/auth", validator.validate(params.auth.get), auth);

// Comms routes
app.post("/comms", tokenValidator.validate, communicate.send_email);

// Textie routes
app.route("/texties")
  .post([tokenValidator.validate, service_middleware.service_activated("notes")], texties.create)
  .get([tokenValidator.validate, service_middleware.service_activated("notes")], texties.list)
  .patch([tokenValidator.validate, service_middleware.service_activated("notes"),validator.validate(["content"])], texties.update)
  .delete([tokenValidator.validate, service_middleware.service_activated("notes")], texties.delete);

// Services routes
app.route("/services")
  .post([tokenValidator.validate, validator.validate(params.services.post)], services.activate_service)
  .get(tokenValidator.validate, services.read_services);

// Passwords routes
app.route("/passwords")
  .post([tokenValidator.validate, service_middleware.service_activated("passwords")], passwords.create)
  .get([tokenValidator.validate, service_middleware.service_activated("passwords")], passwords.list)
  .patch([tokenValidator.validate, service_middleware.service_activated("passwords"),validator.validate(params.passwords.patch)], passwords.update)
  .delete([tokenValidator.validate, service_middleware.service_activated("passwords")], passwords.delete);


// Finance routes
//** Plaid routes */
app.get(
  "/finance/plaid/create_link_token",
  [tokenValidator.validate, service_middleware.service_activated("finance")],
  finance_plaid.create_link_token
);

app.post(
  "/finance/plaid/set_access_token",
  [tokenValidator.validate, service_middleware.service_activated("finance")],
  finance_plaid.set_access_token
);

//** Balance routes */
app.get(
  "/finance/balance",
  [tokenValidator.validate, service_middleware.service_activated("finance")],
  finance_balance.get_balance
);

//** Liabilities routes */
app.post(
  "/finance/liabilities",
  [tokenValidator.validate, service_middleware.service_activated("finance")],
  finance_liabilities_reports.update_liabilities_report
);

app.patch(
  "/finance/liabilities",
  [tokenValidator.validate, service_middleware.service_activated("finance")],
  finance_liabilities_reports.get_liabilities_report
);

//** Accounts routes */
app.get(
  "/finance/accounts",
  [tokenValidator.validate, service_middleware.service_activated("finance")],
  finance_accounts.list_finance_accounts
);


//** Finance report routes */
app.get(
  "/finance/report",
  [tokenValidator.validate, service_middleware.service_activated("finance")],
  finance_liabilities_reports.get_liabilities_report
);

app.get(
  "/finance/generate_report",
  [tokenValidator.validate, service_middleware.service_activated("finance")],
  finance_liabilities_reports.generateFinanceReport
);

// Scheduled tasks below using node-cron

// Run report at 1:00 am UTC Friday => 5:00 pm PST on Thursday
cron.schedule("00 01 * * 5", function () {
  console.log("running finance schedular");
  schedular.runFinanceReports();
});

module.exports = app;