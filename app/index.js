const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(
  express.urlencoded({
    extended: true,
  })
);

const MongoBot = require("./mongo");
async function start() {
  await MongoBot.init();
  app.listen(process.env.PORT || 3000);
}
start();

const auth = require("./routes/auth");

app.use(cookieParser());

const requestTime = function (req, res, next) {
  req.requestTime = Date.now();
  console.log("Time:", req.requestTime);
  next();
};
app.use(requestTime);

app.use("/api/", require("./routes/auth"));

// Auth at authRoute
app.get("/auth", auth);

// token validation middleware
const cookieJwtAuth = (req, res, next) => {
  const token = req.get("token");
  if (token === undefined || token === null || token === "") {
    return res
      .status(403)
      .send("Access denied exception. Token is missing")
      .end();
  } else {
    try {
      const user = jwt.verify(token, process.env.AUTH_SECRET);
      req.user = user.email;
      next();
    } catch (err) {
      console.log(err);
      res.clearCookie("token");
      return res.send("Access denied exception. Token is expired.").end();
    }
  }
};

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "logout successful" }).end();
});

// Validatate input for textie post request
app.use("/texties", (req, res, next) => {
  if (req.method == "POST") {
    if (req.query.content == null) {
      throw new Error("Validation error: content is null.");
    }
  }
  next();
});

// gets either all texties or by filters
app.get("/texties", cookieJwtAuth, async (req, res) => {
  req.query.email = req.user;
  req.query.content = req.query.content
    ? { $regex: req.query.content }
    : { $regex: "" };
  let query = req.query;
  let result = await MongoBot.Notes.findNotes(query);
  res.send(result).end();
});

// posts texties based on type
app.post("/texties", cookieJwtAuth, async (req, res) => {
  const content = req.query.content;
  const time = req.requestTime;
  const type = req.query.type ? req.query.type : "note";
  let body = {
    content: content,
    type: type,
    time: time,
    email: req.user,
  };
  result = await MongoBot.Notes.addNotes(body);
  res.send(result).end();
});

// create user middleware
const createUser = (req, res, next) => {
  if (req.method == "POST") {
    if (req.query.email == null || req.query.password == null) {
      throw new Error("Validation error: email or password cannot be null.");
    }
  }
  next();
};

app.delete("/users", cookieJwtAuth, async (req, res) => {
  if (req.query.email == null) {
    throw new Error("Validation error: email cannot be null.");
  }
  let result = await MongoBot.Users.delUser(req.query.email);
  if (result < 1) {
    res.status(404).json({ message: "User not found" }).end();
  } else {
    res
      .status(200)
      .json({
        message: "account deleted successfully",
        account: req.query.email,
        num_deleted: result,
      })
      .end();
  }
});

//login function
app.post("/users", createUser, async (req, res) => {
  const user = {
    email: req.query.email,
    password: req.query.password,
    first_name: req.query.first_name,
    last_name: req.query.last_name,
    phone_number: req.query.phone_number,
  };
  let result = await MongoBot.Users.addUser(user);
  res.status(result.status).json({ message: result.message }).end();
});
