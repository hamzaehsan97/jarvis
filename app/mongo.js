const { MongoClient } = require("mongodb");
const Users = require("./Users");
const Notes = require("./Notes");
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
  }
}

module.exports = new MongoBot();
