exports.phone_number_validate = function (phone_number) {
  const regex = new RegExp("^[+]{1}(?:[0-9\-\\(\\)\\/.]\s?){6,15}[0-9]{1}$");
  return regex.test(phone_number);
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
