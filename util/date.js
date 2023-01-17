// eventual goal is to localize datestamp by request locale
const getDate = function (timestamp) {
  let date = new Date(timestamp).toLocaleDateString("en-US");
  return date;
};
exports.getDate = getDate;
