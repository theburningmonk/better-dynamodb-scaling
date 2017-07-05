'use strict';

const co = require('co');
const loadTester = require('./load_tester');

module.exports.handler = co.wrap(function* (input, context, callback) {
  // ops/s goes up steadily by 6 per min
  yield loadTester(input, context, callback, tick => tick / 10);
});