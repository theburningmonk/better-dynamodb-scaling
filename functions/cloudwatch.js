'use strict';

const co         = require('co');
const AWS        = require('aws-sdk');
const Promise    = require('bluebird');
const cloudwatch = Promise.promisifyAll(new AWS.CloudWatch());

let putMetric = co.wrap(function* (metricName, tableName, value) {
  let req = {
    MetricData: [
      {
        MetricName: metricName,
        Dimensions: [
          {
            Name: 'TableName',
            Value: tableName
          }
        ],
        Timestamp: new Date,
        Unit: Count,
        Value: value
      }
    ],
    Namespace: 'theburningmonk.com'
  };
  yield cloudwatch.putMetricDataAsync(req);
});

module.exports.putMetric = putMetric;