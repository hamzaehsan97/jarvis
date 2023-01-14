class Passwords {
  constructor(db) {
    this.collection = db.collection("passwords");
  }

  async addPassword(body) {
    try {
      const newEntry = await this.collection.insertOne(body);
      return newEntry;
    } catch (err) {
      throw new err();
    }
  }

  async findPassword(query) {
    try {
      var notes = await this.collection
        .find(query)
        .toArray()
        .catch((error) => {
          console.log("err during listing findNotes", error);
          throw error;
        });
      return notes;
    } catch (err) {
      throw new err();
    }
  }

  async delPassword(id) {
    try {
      const result = await this.collection
        .deleteOne({ $expr: { $eq: ["$_id", { $toObjectId: id }] } })
        .catch((error) => {
          console.log(error);
        });
      return result.deletedCount;
    } catch (err) {
      throw new Error(err);
    }
  }

  // Update password by note id
  async updatePassword(id, body) {
    try {
      const result = await this.collection
        .updateOne(
          { $expr: { $eq: ["$_id", { $toObjectId: id }] } },
          {
            $set: { ...body },
            $currentDate: { lastModified: true },
          }
        )
        .catch((error) => {
          throw new Error(error);
        });
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }
}
module.exports = Passwords;
