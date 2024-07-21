const express = require("express");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");
const path = require("path");
const communicate = require("./routes/communicate/communicate");
const auth = require("./routes/auth/auth");
const users = require("./routes/users/users");
const agents = require("./routes/agents/agents");
const connectUsers = require("./routes/connect/users")
const texties = require("./routes/texties/texties");
const flows = require("./routes/connect/flows");
const instances = require("./routes/connect/instances");
const services = require("./routes/services/services");
const campaigns = require("./routes/campaigns/campaigns");
const passwords = require("./routes/passwords/passwords");
const tokenValidator = require("./middleware/auth_middleware");
const service_middleware = require("./middleware/service_middleware");
const time_middleware = require("./middleware/time_middleware");
const users_middleware = require("./middleware/users_middleware");
const role_middleware = require("./middleware/role_middleware");
const validate_params = require("./constants/validate");
const schedular = require("./util/schedular");
const validator = require("./middleware/validation");
const ruid = require('express-ruid');

const params = validate_params.api_params;
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
app.get("/auth", validator.validate(params.auth.get), auth); // login in customer

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

// campaigns
app.route("/campaigns")
    .put([tokenValidator.validate, validator.validate(params.campaigns.put)], campaigns.create)
    .get([tokenValidator.validate, validator.validate(params.campaigns.get)], campaigns.get)
    .patch([tokenValidator.validate, validator.validate(params.campaigns.patch)], campaigns.updateMetadata)
    .delete([tokenValidator.validate, validator.validate(params.campaigns.delete)], campaigns.delete);
app.route("/campaigns/list")
    .get([tokenValidator.validate], campaigns.list);


// agents
app.route("/agents")
    .put([tokenValidator.validate, validator.validate(params.agents.put)], agents.create)
    .get([tokenValidator.validate, validator.validate(params.agents.get)], agents.get)
    .patch([tokenValidator.validate,validator.validate(params.agents.patch)],agents.updateMetadata)
    .delete([tokenValidator.validate,validator.validate(params.agents.delete)],agents.delete);

app.route("/agents/list")
    .get([tokenValidator.validate], agents.list);

app.route("/agents/association")
    .put([tokenValidator.validate], connectUsers.addUserToInstance)
    .get([tokenValidator.validate], connectUsers.getUsersInInstance)
    .delete([tokenValidator.validate], connectUsers.deleteUserFromInstance);



// instances
app.route("/connect/instances")
    .put([tokenValidator.validate, validator.validate(params.connect.instances.put)], instances.create);

// flows
app.route("/connect/flows")
    .put([tokenValidator.validate], flows.create)
    .get([tokenValidator.validate, validator.validate(params.connect.flows.get)], flows.get)
    .delete([tokenValidator.validate,  validator.validate(params.connect.flows.get)], flows.delete);

// flows
app.route("/connect/flows/list")
    .get([tokenValidator.validate], flows.list);



// Run report at 1:00 am UTC Friday => 5:00 pm PST on Thursday
cron.schedule("00 01 * * 5", function () {
  console.log("running schedular");
});

module.exports = app;
