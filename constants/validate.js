const api_params = {
    "user_password":{
        "patch": ["email", "otp", "password"],
    },
    "passwords": {
        "patch": ["id", "content"],
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
    "otp": {
        "get": ["email", "otp"],
        "patch":  ["email"],
    },
    "auth": {
        "get": ["email", "password"]
    },
}
exports.api_params = api_params;