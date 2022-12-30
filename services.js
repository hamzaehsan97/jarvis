class Services {
  constructor(db) {
    this.collection = db.collection("users");
  }

  async activate_service(email, body) {
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

  //   async findNotes(query) {
  //     try {
  //       var notes = await this.collection
  //         .find(query)
  //         .toArray()
  //         .catch((error) => {
  //           console.log("err during listing findNotes", error);
  //           throw error;
  //         });
  //       return notes;
  //     } catch (err) {
  //       throw new err();
  //     }
  //   }

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
}
module.exports = Services;
