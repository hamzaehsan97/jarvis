class Notes {
  constructor(db) {
    this.collection = db.collection("notes");
  }

  async addNotes(body) {
    try {
      const newEntry = await this.collection.insertOne(body);
      return newEntry;
    } catch (err) {
      console.log("caught an error");
      throw new Error("error found in finding notes");
    }
  }
  async findNotes(query) {
    var notes = await this.collection
      .find(query)
      .toArray()
      .catch((error) => {
        console.log("err during listing findNotes", error);
        throw error;
      });
    return notes;
  }
}
module.exports = Notes;
