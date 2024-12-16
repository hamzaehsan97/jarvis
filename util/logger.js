// In order to mantain consistency in logging, all logs must look the same
const log = function (message, req) {
    var log = createRequestLog(req);
    log.applicationLog = message;
    console.log(JSON.stringify(log));
  };
exports.log = log;

const logError = function (message, err, req) {
  var log = createRequestLog(req);
  log.applicationLog = message;
  log.error = JSON.stringify(err, null, 2)
  console.error(JSON.stringify(log));
};
exports.logError = logError;

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