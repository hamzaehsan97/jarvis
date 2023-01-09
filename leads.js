class Leads {
  constructor(db) {
    this.collection = db.collection("leads");
  }

  async addLead(body) {
    try {
      const newEntry = await this.collection.insertOne(body);
      return newEntry;
    } catch (err) {
      throw new err();
    }
  }

  async findLeads(query) {
    try {
      var leads = await this.collection
        .find(query)
        .toArray()
        .catch((error) => {
          console.log("err during listing leads", error);
          throw error;
        });
      return leads;
    } catch (err) {
      throw new err();
    }
  }

  async delLead(id) {
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

  // Update note by note id
  async updateLead(id, body) {
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
module.exports = Leads;
