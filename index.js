const express = require("express");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");
const communicate = require("./routes/communicate/communicate");
const auth = require("./routes/auth/auth");
const users = require("./routes/users/users");
const texties = require("./routes/texties/texties");
const services = require("./routes/services/services");
const passwords = require("./routes/passwords/passwords");
const tokenValidator = require("./middleware/auth_middleware");
const service_middleware = require("./middleware/service_middleware");
const time_middleware = require("./middleware/time_middleware");
const validate_params = require("./constants/validate");
const validator = require("./middleware/validation");
const amazonConnectRoutes = require("./routes/amazon-connect/index");
const ruid = require('express-ruid');
const params = validate_params.api_params;

process.on('uncaughtException', (error, origin) => {
  console.log('----- Uncaught exception -----')
  console.log(error)
  console.log('----- Exception origin -----')
  console.log(origin)
})

process.on('unhandledRejection', (reason, promise) => {
  console.log('----- Unhandled Rejection at -----')
  console.log(promise)
  console.log('----- Reason -----')
  console.log(reason)
})

const cors = require("cors");
require("dotenv").config();
const PORT = process.env.PORT || 8080;
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', true)
app.use(cors());
app.use(cookieParser());
app.use(ruid());
app.use(time_middleware.requestTime);
// app.use(aws_creds);
app.get("/", (req, res) => {
  res.status(200).send("welcome young'n").end();
});

// User routes

//** User CRUD Routes */
app.route("/users")
  .post(users.create) //create a new user
  .get([tokenValidator.validate, validator.validate(params.verify.post)], users.read) //read a user
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
app.post("/auth", validator.validate(params.auth.get), auth); // login in customer

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
  .patch([tokenValidator.validate, service_middleware.service_activated("passwords"), validator.validate(params.passwords.patch)], passwords.update)
  .delete([tokenValidator.validate, service_middleware.service_activated("passwords")], passwords.delete);

// All amazon connect routes
app.use("/amazon-connect", amazonConnectRoutes);

// Run report at 1:00 am UTC Friday => 5:00 pm PST on Thursday
cron.schedule("00 01 * * 5", function () {
  console.log("running schedular");
});

module.exports = app;
