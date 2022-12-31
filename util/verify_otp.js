const MongoBot = require("../mongo");

exports.verify_otp = async function (email, otp) {
  let user = await MongoBot.Users.getUser(email);
  if (user === undefined) {
    return {
      status: 404,
      message: "user not found",
    };
  } else {
    const user_otp = user.otp ? user.otp : undefined;
    if (user_otp === undefined) {
      return {
        status: 404,
        message: "invalid request. send one time password again.",
      };
    } else {
      if (otp == user_otp) {
        return {
          status: 200,
          message: "OTP has been verified",
        };
      } else {
        return {
          status: 404,
          message: "Incorrect OTP. Please try again.",
        };
      }
    }
  }
};
