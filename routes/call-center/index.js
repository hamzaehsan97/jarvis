const agents = require("./agents/agents");
const flows = require("./connect/flows");
const queues = require("./connect/queues");
const routingProfiles = require("./connect/routingProfiles");
const phoneNumbers = require("./connect/phoneNumbers");
const instances = require("./connect/instances");
const campaigns = require("./campaigns/campaigns");
const tokenValidator = require("../../middleware/auth_middleware");
const validate_params = require("../../constants/validate");
const validator = require("../../middleware/validation");
const connectUsers = require("./connect/users");
const params = validate_params.api_params;

const express = require("express"); // Import express
const router = express.Router();    // Initialize the router


router.get("/", (req, res) => {
  res.status(200).send("Welcome to amazon connect directory within jarvis").end();
});

// campaigns
router.route("/campaigns")
    .put([tokenValidator.validate, validator.validate(params.campaigns.put)], campaigns.create)
    .get([tokenValidator.validate, validator.validate(params.campaigns.get)], campaigns.get)
    .patch([tokenValidator.validate, validator.validate(params.campaigns.patch)], campaigns.updateMetadata)
    .delete([tokenValidator.validate, validator.validate(params.campaigns.delete)], campaigns.delete);
    
// list campaigns
router.route("/campaigns/list")
    .get([tokenValidator.validate], campaigns.list);

// agents
router.route("/agents")
    .put([tokenValidator.validate, validator.validate(params.agents.put)], agents.create)
    .get([tokenValidator.validate, validator.validate(params.agents.get)], agents.get)
    .patch([tokenValidator.validate,validator.validate(params.agents.patch)],agents.updateMetadata)
    .delete([tokenValidator.validate,validator.validate(params.agents.delete)],agents.delete);

// list agents
router.route("/agents/list")
    .get([tokenValidator.validate], agents.list);

// agent association
router.route("/agents/association")
    .put([tokenValidator.validate], connectUsers.addUserToInstance)
    .get([tokenValidator.validate], connectUsers.getUsersInInstance)
    .delete([tokenValidator.validate], connectUsers.deleteUserFromInstance);

// instances
router.route("/connect/instances")
    .put([tokenValidator.validate, validator.validate(params.connect.instances.put)], instances.create);

// flows
router.route("/connect/flows")
    .put([tokenValidator.validate], flows.create)
    .get([tokenValidator.validate, validator.validate(params.connect.flows.get)], flows.get)
    .delete([tokenValidator.validate,  validator.validate(params.connect.flows.get)], flows.delete);

// flows
router.route("/connect/flows/list")
    .get([tokenValidator.validate], flows.list);

// queues
router.route("/connect/queues")
    .delete([tokenValidator.validate], queues.delete);

// routingProfiles
router.route("/connect/routing-profiles")
    .delete([tokenValidator.validate], routingProfiles.delete);

// Phone Numbers
router.route("/connect/phone-numbers")
    .post([tokenValidator.validate], phoneNumbers.list_phone_numbers)
    .get([tokenValidator.validate], phoneNumbers.search_available_phone_numbers)

// Single Phone Number
router.route("/connect/number")
    .patch([tokenValidator.validate], phoneNumbers.associate_phone_number)
    .put([tokenValidator.validate], phoneNumbers.claim_phone_number)
    .patch([tokenValidator.validate], phoneNumbers.associate_phone_number)
    .get([tokenValidator.validate], phoneNumbers.describe_phone_number);


module.exports = router;

