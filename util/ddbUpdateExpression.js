const generateExpressionAttributeNames = function(updateAttributeList, updateAttributeObject){
    let UpdateExpression = "set ";
    let ExpressionAttributeValues = {};
    let ExpressionAttributeNames = {};
    updateAttributeList.forEach(element => {
        let hashtagName = "#"+element;
        let colonName = ":"+element;
        UpdateExpression = UpdateExpression + hashtagName+" = " + colonName+ ","
        ExpressionAttributeNames[hashtagName] = element;
        ExpressionAttributeValues[colonName] = {S: updateAttributeObject[element]};
    });
    UpdateExpression = UpdateExpression.substring(0, UpdateExpression.length - 1);
    let updateObject = {};
    updateObject.UpdateExpression = UpdateExpression;
    updateObject.ExpressionAttributeNames = ExpressionAttributeNames;
    updateObject.ExpressionAttributeValues = ExpressionAttributeValues;
    return updateObject;
}
exports.generateExpressionAttributeNames = generateExpressionAttributeNames;


const validateUpdateItems = function(updateList, updateObject){
    let valid = true;
    updateList.forEach(element => {
        if(updateObject[element] != undefined){
        }else{
            valid = false;
        }
    });
    return valid;
}
exports.validateUpdateItems = validateUpdateItems;