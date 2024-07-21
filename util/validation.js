exports.phone_number_validate = function (phone_number) {
  const regex = /^\+[1-9]\d{1,14}$/;
  const phoneNumberValid = phone_number.match(regex);
  return phoneNumberValid;
};

exports.capitalize = function (words) {
  const wordsList = words.split(" ");
  let returnWord = "";
  wordsList.forEach((word) => {
    returnWord =
      returnWord + " " + word.charAt(0).toUpperCase() + word.slice(1);
  });
  return returnWord.slice(1);
};
