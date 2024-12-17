const express = require("express");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");
const routes = require("./routes");
const time_middleware = require("./middleware/time_middleware");
const ruid = require('express-ruid');

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

// All routes
app.use("/", routes);  

// Run report at 1:00 am UTC Friday => 5:00 pm PST on Thursday
cron.schedule("00 01 * * 5", function () {
  console.log("running schedular");
});

module.exports = app;
