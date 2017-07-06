'use strict';

const _           = require('lodash');
const co          = require('co');
const Promise     = require('bluebird');
const AWS         = require('aws-sdk');
AWS.config.region = 'us-east-1';
const cloudwatch  = Promise.promisifyAll(new AWS.CloudWatch());
const Lambda      = new AWS.Lambda();

const startTime = new Date('2017-07-05T14:00:00.000Z');
const endTime   = new Date('2017-07-05T15:30:00.000Z');

const metrics = [
  { namespace: "theburningmonk.com", metricName: "dynamodb_scaling_reqs_count" },
  { namespace: "theburningmonk.com", metricName: "dynamodb_scaling_change" },
  { namespace: "AWS/DynamoDB", metricName: "ConsumedWriteCapacityUnits" },
  { namespace: "AWS/DynamoDB", metricName: "ProvisionedWriteCapacityUnits" },
  { namespace: "AWS/DynamoDB", metricName: "WriteThrottleEvents" }
];

const tables = [ 
  "dynamo_scaling_1min", 
  "dynamo_scaling_5min",
  "dynamo_head_heavy_1min",
  "dynamo_head_heavy_5min" 
];

let getTableMetrics = co.wrap(function* (tableName) {
  let getMetrics = co.wrap(function* (namespace, metricName, startTime, endTime) {
    let req = {
      MetricName: metricName,
      Namespace: namespace,
      Period: 60,
      Dimensions: [ { Name: 'TableName', Value: tableName } ],
      Statistics: [ 'Sum' ],
      StartTime: startTime,
      EndTime: endTime
    };
    let resp = yield cloudwatch.getMetricStatisticsAsync(req);

    return resp.Datapoints.map(dp => { 
      let value = (metricName === 'ProvisionedWriteCapacityUnits') ? dp.Sum * 60 : dp.Sum;

      return {
        tableName,
        metricName,
        timestamp: dp.Timestamp,
        value
      };
    });
  });

  let metricsDatum = [];
  for (let metric of metrics) {
    let datum = yield getMetrics(metric.namespace, metric.metricName, startTime, endTime);
    metricsDatum = metricsDatum.concat(datum);
  }

  return _.sortBy(metricsDatum, s => `${s.tableName}_${s.metricName}_${s.timestamp}`);
});

let run = co.wrap(function* () {
  let rows = _.flatten(yield tables.map(tableName => getTableMetrics(tableName)));
  for (let row of rows) {
    console.log(`${row.tableName},${row.metricName},${row.timestamp},${row.value}`);
  }
});

run();