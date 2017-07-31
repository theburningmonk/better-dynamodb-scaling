'use strict';

const co         = require('co');
const AWS        = require('aws-sdk');
const lambda     = new AWS.Lambda();
const Promise    = require('bluebird');
const _          = require('lodash');
const dynamodb   = Promise.promisifyAll(new AWS.DynamoDB.DocumentClient());
const uuidv4     = require('uuid/v4');
const cloudwatch = require('./cloudwatch');

let putItems = co.wrap(function* (tableName, count) {  
  let batchWrite = function* (batch) {
    try {
      let req = { RequestItems: {} };
      req.RequestItems[tableName] = batch;

      console.log(`saving batch of [${batch.length}]`);

      yield dynamodb.batchWriteAsync(req);
    } catch (exn) {
      console.log(exn);
    }
  };

  let start = new Date().getTime();

  let items = _.range(0, count).map(n => { 
    return {
      PutRequest: {
        Item: { id: uuidv4() }
      }
    };
  });

  console.log(`saving a total of [${items.length}] items`);

  let chunks = _.chunk(items, 25);
  let tasks = chunks.map(batchWrite);

  yield tasks;

  console.log(`finished saving [${items.length}] items`);

  yield cloudwatch.putMetric('theburningmonk.com', 'dynamodb_scaling_reqs_count', tableName, count);

  console.log(`tracked request count in cloudwatch`);

  let end = new Date().getTime();
  let duration = end - start;
  if (duration < 1000) {
    let delay = 1000 - duration;
    console.log(`waiting a further ${delay}ms`);    
    yield Promise.delay(delay);
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

// input should be of shape:
// {
//   tableName: ...,
//   tick: 0,
//   recursionLeft: 0
// }
module.exports = co.wrap(function* (input, context, callback, tickToItemCount) {
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
      let count = tickToItemCount(tick);
      yield putItems(tableName, count);
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