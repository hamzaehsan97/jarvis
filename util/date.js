// eventual goal is to localize datestamp by request locale
const getDate = function (timestamp) {
  let date = new Date(timestamp).toLocaleDateString("en-US");
  return date;
};
exports.getDate = getDate;

// eventual goal is to localize datestamp by request locale
const getYear = function (timestamp) {
  let year = new Date(timestamp).toLocaleDateString("en-US");
  year = year.split("/")[2];
  return year;
};
exports.getYear = getYear;
