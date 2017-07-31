'use strict';

const co       = require('co');
const Promise  = require('bluebird');
const AWS      = require('aws-sdk');
const dynamodb = Promise.promisifyAll(new AWS.DynamoDB());

let updateThroughput = co.wrap(function* (tableName, newWriteThroughput) {
  try {
    let req = {
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: newWriteThroughput
      }, 
      TableName: tableName
    };
    yield dynamodb.updateTableAsync(req);

    console.log(`updated table [${tableName}] to [${newWriteThroughput}] write throughput`);
  } catch (err) {
    console.log(err);
  }
});

module.exports.updateThroughput = updateThroughput;