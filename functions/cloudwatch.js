'use strict';

const _          = require('lodash');
const co         = require('co');
const AWS        = require('aws-sdk');
const Promise    = require('bluebird');
const cloudwatch = Promise.promisifyAll(new AWS.CloudWatch());

let getAlarm = co.wrap(function* (alarmName) {
  let req = {
    AlarmNames: [ alarmName ],
    MaxRecords: 1
  };
  let resp = yield cloudwatch.describeAlarmsAsync(req);
  let alarm = resp.MetricAlarms[0];

  delete alarm.AlarmArn;
  delete alarm.AlarmConfigurationUpdatedTimestamp;
  delete alarm.StateValue;
  delete alarm.StateReason;
  delete alarm.StateReasonData;
  delete alarm.StateUpdatedTimestamp;

  return alarm;
});

let cloneAndPutMetricAlarm = co.wrap(function* (alarmName, update) {
  let alarm = yield getAlarm(alarmName);
  let clone = _.cloneDeep(alarm);
  update(clone);

  console.log(JSON.stringify(clone));
  yield cloudwatch.putMetricAlarmAsync(clone);
  
  console.log(`updated alarm [${clone.AlarmName}]`);
});

let putMetric = co.wrap(function* (namespace, metricName, tableName, value) {
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
        Unit: 'Count',
        Value: value
      }
    ],
    Namespace: namespace
  };
  yield cloudwatch.putMetricDataAsync(req);
});

let getLast5MinMetrics = co.wrap(function* (namespace, metricName, tableName) {
  let end   = new Date();
  let start = new Date(end.getTime() - 5 * 60 * 1000);

  let req = {
    EndTime: end,
    MetricName: metricName,
    Namespace: namespace,
    Period: 60,
    StartTime: start,
    Dimensions: [
      {
        Name: 'TableName',
        Value: tableName
      }
    ],
    Statistics: [ 'Sum' ]
  };
  let resp = yield cloudwatch.getMetricStatisticsAsync(req);
  return resp.Datapoints.map(dp => dp.Sum);  
});

let setAlarmToOK = co.wrap(function* (alarmName) {
  let req = {
    AlarmName: alarmName,
    StateReason: 'handled',
    StateValue: 'OK'
  };
  yield cloudwatch.setAlarmStateAsync(req)
});

module.exports = {
  cloneAndPutMetricAlarm,
  putMetric,
  getLast5MinMetrics,
  setAlarmToOK
};