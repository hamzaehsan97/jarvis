const MongoBot = require("../mongo");

const update_OTP = async function (otp, email) {
  const body = {
    otp: otp,
  };
  let add_otp = await MongoBot.Users.updateUser(email, body);
  if (add_otp.modifiedCount > 0 && add_otp.modifiedCount < 2) {
    return true;
  } else {
    return false;
  }
};

exports.update_OTP = update_OTP;

const randomize_OTP = async function (email) {
  const otp = Math.floor(1000 + Math.random() * 9000);
  let send = await update_OTP(otp, email);
  return send;
};

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
        if (randomize_OTP(email)) {
          return {
            status: 200,
            message: "OTP has been verified",
          };
        } else {
          return {
            status: 200,
            message: "OTP has been verified with some security issues",
          };
        }
      } else {
        return {
          status: 404,
          message: "Incorrect OTP. Please try again.",
        };
      }
    }
  }
};
