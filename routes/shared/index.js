const communicate = require("./communicate/communicate");
const auth = require("./auth/auth");
const users = require("./users/users");
const services = require("./services/services");
const passwords = require("./passwords/passwords");
const tokenValidator = require("../../middleware/auth_middleware");
const service_middleware = require("../../middleware/service_middleware");
const validate_params = require("../../constants/validate");
const validator = require("../../middleware/validation");
const params = validate_params.api_params;

const express = require("express"); // Import express
const router = express.Router();    // Initialize the router



router.get("/", (req, res) => {
  res.status(200).send("Welcome to jarvis shared routes. Speak, friend, and enter.").end();
});

//** User CRUD Routes */
router.route("/users")
  .post(users.create) //create a new user
  .get([tokenValidator.validate, validator.validate(params.verify.post)], users.read) //read a user
  .patch(tokenValidator.validate, users.update) //update a user
  .delete(tokenValidator.validate, users.delete); //delete a user

//** User Custom Routes */
router.post("/users/verify", validator.validate(params.verify.post), users.verify_account); //verify user account with email and otp
router.patch("/users/otp", validator.validate(params.otp.patch), users.create_otp); //create a new otp code for the user
router.get("/users/otp", validator.validate(params.otp.get), users.verify_otp); //verify user otp
router.patch("/users/password", validator.validate(params.user_password.patch), users.update_password); //update user password, otp required
router.post("/users/secret", validator.validate(params.secret.post), tokenValidator.validate, users.set_secret); //update user secret
router.get("/users/logout", users.logout);

// Auth routes
router.post("/auth", validator.validate(params.auth.get), auth); // login in customer

// Comms routes
router.post("/comms", tokenValidator.validate, communicate.send_email);

// Services routes
router.route("/services")
  .post([tokenValidator.validate, validator.validate(params.services.post)], services.activate_service)
  .get(tokenValidator.validate, services.read_services);

// Passwords routes
router.route("/passwords")
  .post([tokenValidator.validate, service_middleware.service_activated("passwords")], passwords.create)
  .get([tokenValidator.validate, service_middleware.service_activated("passwords")], passwords.list)
  .patch([tokenValidator.validate, service_middleware.service_activated("passwords"), validator.validate(params.passwords.patch)], passwords.update)
  .delete([tokenValidator.validate, service_middleware.service_activated("passwords")], passwords.delete);

module.exports = router;
