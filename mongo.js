const { MongoClient } = require("mongodb");
const Users = require("./users");
const Services = require("./services");
const Notes = require("./notes");
const Passwords = require("./passwords");
require("dotenv").config();

class MongoBot {
  constructor() {
    const url =
      process.env.ENV === "dev"
        ? process.env.DEV_DB_URI
        : process.env.PROD_DB_URI;

    this.client = new MongoClient(url, { useUnifiedTopology: true });
  }
  async init() {
    await this.client.connect();
    console.log("connected to database");

    this.db = this.client.db("hammy");

    this.Notes = new Notes(this.db);
    this.Users = new Users(this.db);
    this.Services = new Services(this.db);
    this.Passwords = new Passwords(this.db);
  }
}

module.exports = new MongoBot();
