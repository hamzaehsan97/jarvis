class Users {
  constructor(db) {
    this.collection = db.collection("users");
  }

  async addUser(user) {
    try {
      const newEntry = await this.collection.insertOne(user);
      return { status: 200, message: "added new user successfully" };
    } catch (err) {
      return {
        status: 400,
        message: "invalid request exception",
      };
    }
  }
  async getUser(email) {
    const query = { email: email };
    var findings = await this.collection
      .find(query)
      .toArray()
      .catch((error) => {
        console.error(error);
      });
    return findings[0];
  }

  async delUser(email) {
    const result = await this.collection
      .deleteOne({ email: email })
      .catch((error) => {
        console.log(error);
      });
    console.log("Account deleted successfully" + email);
    return result.deletedCount;
  }
}

module.exports = Users;
