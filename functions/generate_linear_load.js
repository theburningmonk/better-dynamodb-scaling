'use strict';

const co       = require('co');
const AWS      = require('aws-sdk');
const lambda   = new AWS.Lambda();
const Promise  = require('bluebird');
const _        = require('lodash');
const dynamodb = Promise.promisifyAll(new AWS.DynamoDB.DocumentClient());
const uuidv4   = require('uuid/v4');

let putItems = co.wrap(function* (tableName, tick) {  
  let count = tick / 5;
  let items = _.range(0, count).map(n => { 
    return {
      TableName : tableName,
      Item: { id: uuidv4() }
    };
  });

  console.log(`saving [${items.length}] items`);

  for (let item of items) {
    try {    
      yield dynamodb.putAsync(item);
    } catch (exn) {
      console.log(exn);
    }
  }

  return Promise.delay(1000);
});

let recurse = co.wrap(function* (funcName, payload) {
  console.log("recursing...");
  
  let req = {
    FunctionName: funcName, 
    InvocationType: "Event", 
    Payload: payload
  };
  yield lambda.invoke(req).promise();
});

// input should be of shape:
// {
//   tableName: ...,
//   tick: 0,
//   recursionLeft: 0
// }
module.exports.handler = co.wrap(function* (input, context, callback) {
  context.callbackWaitsForEmptyEventLoop = false;
  console.log(JSON.stringify(input));

  let funcName      = context.functionName;
  let tableName     = input.tableName;
  let tick          = input.tick || 0;
  let recursionLeft = input.recursionLeft || 0;

  if (recursionLeft <= 0) {
    callback(null, "All done");
    return;
  }

  while (context.getRemainingTimeInMillis() > 2000) {
    try {
      yield putItems(tableName, tick).timeout(1000);
    } catch (err) {      
    }

    tick += 1;
    console.log(`there are [${context.getRemainingTimeInMillis()}]ms left`);
  }

  let output = _.clone(input);
  output.recursionLeft = recursionLeft - 1;
  output.tick = tick;

  yield recurse(funcName, JSON.stringify(output));

  callback(null, output);
});