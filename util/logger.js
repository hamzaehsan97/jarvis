// In order to mantain consistency in logging, all logs must look the same
const log = function (message, req) {
    var log = createRequestLog(req);
    log.applicationLog = message;
    console.log(log);
  };
exports.log = log;

function createRequestLog(req){
    const logObject = {
      "Time": req.requestTime,
      "Ip Address": req.ip,
      "Operation": req.baseUrl+req.path,
      "RequestId": req.rid
    }
    return logObject;
}
exports.createRequestLog = createRequestLog;