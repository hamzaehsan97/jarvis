exports.phone_number_validate = function (phone_number) {
  const regex = /^[+]?[(]?[0-9]{3}[)]?[-s.]?[0-9]{3}[-s.]?[0-9]{4,6}$/im;
  const correct = phone_number.match(regex);
  if (!correct) {
    throw new Error("Phone number is not valid");
  }
  return true;
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
