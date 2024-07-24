const api_params = {
    "user_password":{
        "patch": ["email", "otp", "password"],
    },
    "passwords": {
        "patch": ["id", "content"],
    },
    "campaigns":{
        "put": ["campaignName", "campaignType", "campaignStartDate", "campaignEndDate", "campaignRegion", "campaignCountry"],
        "get": ["campaignID"],
        "patch": ["campaignID"],
        "delete": ["campaignID"]
    },
    "agents":{
        "put": ["agentFirstName","agentLastName","agentEmail","agentPhoneNumber","agentCountry","agentWorkingHours","agentSpecialty","agentQualifications","agentLanguages"],
        "get": ["agentID","agentEmail"],
        "patch": ["agentID", "agentEmail"],
        "delete": ["agentEmail", "agentID"],
    },
    "connect":{
        "flows":{
            "put": ["contactFlowName","contactFlowContent","contactFlowType","campaignID"],
            "get": ["flowID"],
            "delete": ["flowID"]
        },
        "instances":{
            "put": ["instanceName"]
        }
    },
    "services": {
        "post": ["service", "active"],
    },
    "secret": {
        "post": ["secret"],
    },
    "verify":{
        "post": ["email", "otp"],
    },
    "users":{
        "get": ["email"]
    },
    "otp": {
        "get": ["email", "otp"],
        "patch":  ["email"],
    },
    "auth": {
        "get": ["email", "password"]
    },
}
exports.api_params = api_params;