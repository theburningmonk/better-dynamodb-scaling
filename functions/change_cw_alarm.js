'use strict';

const AWS        = require('aws-sdk');
const co         = require('co');
const Promise    = require('bluebird');
const _          = require('lodash');
const cloudwatch = new AWS.CloudWatch();

let updateEvalPeriod = co.wrap(function* (alarm) {
  console.log(JSON.stringify(alarm));

  let req = {
    AlarmName: alarm.alarmName,
    ComparisonOperator: alarm.comparisonOperator,
    EvaluationPeriods: 1,
    MetricName: alarm.metricName,
    Namespace: alarm.namespace,
    Period: alarm.period,
    Threshold: alarm.threshold,
    ActionsEnabled: alarm.actionEnabled,
    AlarmActions: alarm.alarmActions,
    AlarmDescription: alarm.alarmDescription,
    Dimensions: alarm.dimensions.map(kvp => { 
      return { Name: kvp.name, Value: kvp.value }
    }),
    Statistic: alarm.statistic
  };

  yield cloudwatch.putMetricAlarm(req).promise();
});

module.exports.handler = co.wrap(function* (event, context, callback) {
  console.log(JSON.stringify(event));
  
  let metricName = _.get(event, 'detail.requestParameters.metricName');
  let alarmName = _.get(event, 'detail.requestParameters.alarmName');
  let evaluationPeriods = _.get(event, 'detail.requestParameters.evaluationPeriods');

  console.log(`metric name : ${metricName}`);
  console.log(`alarm name : ${alarmName}`);
  console.log(`eval period : ${evaluationPeriods}`);

  if (/Consumed.*CapacityUnits/.test(metricName) && 
      alarmName.includes("AlarmHigh") &&
      evaluationPeriods !== 1) {    
    let alarmName = event.detail.requestParameters.alarmName;
    let alarm = event.detail.requestParameters;

    console.log(`updating [${alarmName}]...`);
    yield updateEvalPeriod(alarm);
    console.log("all done");
  }
  
  callback(null, 'ok');
});