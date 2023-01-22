class Users {
  constructor(db) {
    this.collection = db.collection("users");
  }

  async addUser(user) {
    try {
      this.collection.createIndex({ email: 1 }, { unique: true });
      const newEntry = await this.collection.insertOne(user);
      return {
        status: 200,
        message: "user created successfully",
        new_Entry: newEntry,
      };
    } catch (err) {
      throw new Error(err);
    }
  }

  async getUser(email) {
    const query = { email: email };
    try {
      let findings = await this.collection
        .find(query)
        .toArray()
        .catch((error) => {
          console.error(error);
        });
      return findings[0];
    } catch (err) {
      throw new err();
    }
  }

  async getHotlineEmployees(query) {
    try {
      let findings = await this.collection
        .find(query)
        .toArray()
        .catch((error) => {
          console.error(error);
        });
      return findings;
    } catch (err) {
      throw new err();
    }
  }

  async delUser(email) {
    const result = await this.collection
      .deleteOne({ email: email })
      .catch((error) => {
        console.log(error);
      });
    return result.deletedCount;
  }

  async updateUser(email, body) {
    const result = await this.collection
      .updateOne(
        { email: email },
        {
          $set: { ...body },
          $currentDate: { lastModified: true },
        }
      )
      .catch((error) => {
        throw new Error(error);
      });
    return result;
  }
}

module.exports = Users;
