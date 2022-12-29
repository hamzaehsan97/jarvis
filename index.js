const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const communicate = require("./routes/communicate");
const auth = require("./routes/auth");
const users = require("./routes/users");
const texties = require("./routes/texties");
const tokenValidator = require("./middleware/auth_middleware");
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

const MongoBot = require("./mongo");
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
app.delete("/users", tokenValidator.validate, users.delete);
app.patch("/users/create_otp", users.create_otp);
app.get("/users/verify_otp", users.verify_otp);
app.patch("/users/update_password", users.update_password);
app.get("/users/logout", users.logout);

// Auth routes
app.get("/auth", auth);

// Comms routes
app.post("/comms", tokenValidator.validate, communicate.send_email);

// Textie routes
app.post("/texties", tokenValidator.validate, texties.create);
app.get("/texties", tokenValidator.validate, texties.list);
app.patch("/texties", texties.update);
app.delete("/texties", tokenValidator.validate, texties.delete);
