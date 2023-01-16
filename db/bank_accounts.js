class BankAccounts {
  constructor(db) {
    this.collection = db.collection("bank_accounts");
  }

  async addAccessToken(body) {
    try {
      const newEntry = await this.collection.insertOne(body);
      return newEntry;
    } catch (err) {
      throw new err();
    }
  }

  async findAccessToken(query) {
    try {
      var notes = await this.collection
        .find(query)
        .toArray()
        .catch((error) => {
          console.log("err during listing accessTokens", error);
          throw error;
        });
      return notes;
    } catch (err) {
      throw new err();
    }
  }

  //   async delNote(id) {
  //     try {
  //       const result = await this.collection
  //         .deleteOne({ $expr: { $eq: ["$_id", { $toObjectId: id }] } })
  //         .catch((error) => {
  //           console.log(error);
  //         });
  //       return result.deletedCount;
  //     } catch (err) {
  //       throw new Error(err);
  //     }
  //   }

  //   // Update note by note id
  //   async updateNote(id, body) {
  //     try {
  //       const result = await this.collection
  //         .updateOne(
  //           { $expr: { $eq: ["$_id", { $toObjectId: id }] } },
  //           {
  //             $set: { ...body },
  //             $currentDate: { lastModified: true },
  //           }
  //         )
  //         .catch((error) => {
  //           throw new Error(error);
  //         });
  //       return result;
  //     } catch (err) {
  //       throw new Error(err);
  //     }
  //   }
}
module.exports = BankAccounts;
