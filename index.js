const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const communicate = require("./routes/communicate");
const auth = require("./routes/auth");
const users = require("./routes/users");
const texties = require("./routes/texties");
const services = require("./routes/services");
const passwords = require("./routes/passwords");
const leads = require("./routes/leads");
const finance = require("./routes/finance");
const tokenValidator = require("./middleware/auth_middleware");
const service_middleware = require("./middleware/service_middleware");
const time_middleware = require("./middleware/time_middleware");
const users_middleware = require("./middleware/users_middleware");
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
  res.send("welcome young'n").end();
});

// User routes
app.post("/users", users_middleware.createUser, users.create);
app.get("/users", tokenValidator.validate, users.read);
app.patch("/users", tokenValidator.validate, users.update);
app.delete("/users", tokenValidator.validate, users.delete); //delete user funtionality (Should only be available for admins)
app.post("/users/verify", users.verify_account); //verify user account with email and otp
app.patch("/users/otp", users.create_otp); //create a new otp code for the user
app.get("/users/otp", users.verify_otp); //verify user otp
app.patch("/users/password", users.update_password); //update user password, otp required
app.post("/users/secret", tokenValidator.validate, users.set_secret); //update user secret
app.get("/users/logout", users.logout);

// Auth routes
app.get("/auth", auth);

// Comms routes
app.post("/comms", tokenValidator.validate, communicate.send_email);

// Textie routes
app.post("/texties", tokenValidator.validate, texties.create);
app.get("/texties", tokenValidator.validate, texties.list);
app.patch("/texties", tokenValidator.validate, texties.update);
app.delete("/texties", tokenValidator.validate, texties.delete);

// Services routes
app.post("/services", tokenValidator.validate, services.activate_service);
app.get("/services", tokenValidator.validate, services.read_services);

// Passwords routes
app.post("/passwords", tokenValidator.validate, passwords.create);
app.get("/passwords", tokenValidator.validate, passwords.list);
app.patch("/passwords", tokenValidator.validate, passwords.update);
app.delete("/passwords", tokenValidator.validate, passwords.delete);

// Hotline routes
app.post("/hotline/leads", tokenValidator.validate, leads.create);
app.get("/hotline/leads", tokenValidator.validate, leads.list);
app.delete("/hotline/leads", tokenValidator.validate, leads.delete);

// Finance routes
app.get(
  "/finance/plaid/create_link_token",
  [tokenValidator.validate, service_middleware.service_activated("finance")],
  finance.create_link_token
);
app.post(
  "/finance/plaid/set_access_token",
  [tokenValidator.validate, service_middleware.service_activated("finance")],
  finance.set_access_token
);
app.get(
  "/finance/plaid/get_balance",
  [tokenValidator.validate, service_middleware.service_activated("finance")],
  finance.get_balance
);
