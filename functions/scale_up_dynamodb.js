'use strict';

const _          = require('lodash');
const co         = require('co');
const cloudwatch = require('./cloudwatch');
const dynamodb   = require('./dynamodb');

let getMaxReqsCount = co.wrap(function* (namespace, metricName, tableName) {
  let datum = yield cloudwatch.getLast5MinMetrics(namespace, metricName, tableName);
  return _.max(datum);
});

module.exports.handler = co.wrap(function* (event, context, callback) {
  console.log(JSON.stringify(event));

  let message          = JSON.parse(event.Records[0].Sns.Message);
  let alarmName        = message.AlarmName;
  let namespace        = message.Trigger.Namespace;
  let metricName       = message.Trigger.MetricName;
  let tableName        = message.Trigger.Dimensions[0].value;
  let utilizationLevel = parseInt(tableName.substring(tableName.lastIndexOf("_") + 1)) / 100;
  let threshold        = message.Trigger.Threshold;

  let maxReqsCount  = yield getMaxReqsCount(namespace, metricName, tableName);
  let newThroughput = Math.min(1000, maxReqsCount / utilizationLevel / 60);
  let newThreshold  = newThroughput * 60 * utilizationLevel;

  console.log(`
    Alarm Bame: ${alarmName}
    Metric
      Namespace: ${namespace}
      Metric Name: ${metricName}
      Table Name: ${tableName}
      Old Threshold: ${threshold}
      Max reqs count in last 5 min: ${maxReqsCount}
      New Throughput: ${newThroughput}
      New Threshold: ${newThreshold}
  `);

  if (newThroughput) {
    yield dynamodb.updateThroughput(tableName, newThroughput);
    yield cloudwatch.cloneAndPutMetricAlarm(
      alarmName,
      x => x.Threshold = newThreshold);
  }

  yield cloudwatch.setAlarmToOK(alarmName);

  callback(null, "ok");
});