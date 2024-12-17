const cron = require("node-cron");
const texties = require("./routes/texties/texties");
const tokenValidator = require("./middleware/auth_middleware");
const service_middleware = require("./middleware/service_middleware");
const validator = require("./middleware/validation");
const callCenterRoutes = require("./routes/call-center/index");
const sharedRoutes = require("./routes/shared/index");

const express = require("express"); 
const router = express.Router();    

router.get("/", (req, res) => {
  res.status(200).send("welcome young'n").end();
});

// Textie routes
router.route("/texties")
  .post([tokenValidator.validate, service_middleware.service_activated("notes")], texties.create)
  .get([tokenValidator.validate, service_middleware.service_activated("notes")], texties.list)
  .patch([tokenValidator.validate, service_middleware.service_activated("notes"),validator.validate(["content"])], texties.update)
  .delete([tokenValidator.validate, service_middleware.service_activated("notes")], texties.delete);


// All shared routes
router.use("/shared", sharedRoutes);  

// All amazon connect routes
router.use("/amazon-connect", callCenterRoutes);

module.exports = router;
