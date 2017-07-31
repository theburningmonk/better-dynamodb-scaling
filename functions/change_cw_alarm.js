'use strict';

const AWS        = require('aws-sdk');
const co         = require('co');
const Promise    = require('bluebird');
const _          = require('lodash');
const cloudwatch = require('./cloudwatch');
const accountId  = process.env.accountId;
const region     = process.env.region;
const snsTopic   = `arn:aws:sns:${region}:${accountId}:scale_up_dynamodb`;

let makeProposal2Change = co.wrap(function* (alarmName) {
  yield cloudwatch.cloneAndPutMetricAlarm(
    alarmName, 
    x => {
      x.Namespace = 'theburningmonk.com';
      x.MetricName = 'dynamodb_scaling_reqs_count';
      x.EvaluationPeriods = 1;
      x.AlarmActions = [ snsTopic ]
    });
});

let makeProposal1Change = co.wrap(function* (alarmName) {
  yield cloudwatch.cloneAndPutMetricAlarm(
    alarmName,
    x => {
      x.EvaluationPeriods = 1;
    }
  );
});

module.exports.handler = co.wrap(function* (event, context, callback) {
  console.log(JSON.stringify(event));
  
  let metricName = _.get(event, 'detail.requestParameters.metricName');
  let alarmName = _.get(event, 'detail.requestParameters.alarmName');
  let evaluationPeriods = _.get(event, 'detail.requestParameters.evaluationPeriods');  

  console.log(`metric name : ${metricName}`);
  console.log(`alarm name : ${alarmName}`);
  console.log(`eval period : ${evaluationPeriods}`);

  // proposal 1
  if (/Consumed.*CapacityUnits/.test(metricName) && 
      alarmName.includes("AlarmHigh") &&
      alarmName.includes("_proposal1") &&
      evaluationPeriods !== 1) {    
    let alarmName = event.detail.requestParameters.alarmName;

    console.log(`[Proposal 1] updating [${alarmName}]...`);
    yield makeProposal1Change(alarmName);
    console.log("all done");
  }
  // proposal 2 
  else if (/Consumed.*CapacityUnits/.test(metricName) && 
      alarmName.includes("AlarmHigh") &&
      alarmName.includes("_proposal2") &&
      evaluationPeriods !== 1) {    
    let alarmName = event.detail.requestParameters.alarmName;

    console.log(`[Proposal 2] updating [${alarmName}]...`);
    yield makeProposal2Change(alarmName);
    console.log("all done");
  }
  
  callback(null, 'ok');
});