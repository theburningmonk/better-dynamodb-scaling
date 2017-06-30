'use strict';

const co       = require('co');
const AWS      = require('aws-sdk');
const lambda   = new AWS.Lambda();
const Promise  = require('bluebird');
const _        = require('lodash');
const dynamodb = Promise.promisifyAll(new AWS.DynamoDB.DocumentClient());
const uuidv4   = require('uuid/v4');

let putItems = co.wrap(function* (tableName) {
  let items = _.range(0, 25).map(n => { 
    return {
      PutRequest: {
        Item: {
          id: uuidv4(),
          value: uuidv4()
        }
      }
    };
  });

  let req = { RequestItems: { } };
  req.RequestItems[tableName] = items;

  try {
    console.log(`saving [${items.length}] items`);
    yield dynamodb.batchWriteAsync(req);
  } catch (exn) {
    console.log(exn);
  }
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

module.exports.handler = co.wrap(function* (event, context, callback) {
  let funcName = context.functionName;
  let tableName = event.tableName;
  let iteration = event.iteration || 0;

  if (iteration <= 0) {
    callback(null, "all done");
    return;
  }

  while (context.getRemainingTimeInMillis() > 1000) {
    yield putItems(tableName);
  }

  let output = _.clone(event);
  output.iteration = iteration - 1;

  yield recurse(funcName, JSON.stringify(output));

  callback(null, output);
});