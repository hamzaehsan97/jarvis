class FinanceItems {
  constructor(db) {
    this.collection = db.collection("finance");
  }

  async addItem(body) {
    try {
      const newEntry = await this.collection.insertOne(body);
      return newEntry;
    } catch (err) {
      throw new Error(err);
    }
  }

  async findItem(query) {
    try {
      var items = await this.collection
        .find(query)
        .toArray()
        .catch((error) => {
          console.log("err while listing finance items", error);
          throw error;
        });
      return items;
    } catch (err) {
      throw new err();
    }
  }

  // Update item by item_id
  async updateItem(id, body) {
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

  async delItem(id) {
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
}
module.exports = FinanceItems;
