'use strict';

const co = require('co');
const loadTester = require('./load_tester');

function tickToCount(n) {
  if (n <= 300) {
    return 25; // holding pattern for the first 5 mins
  } else if (n <= 600) {
    let dn = (300 - 25) / 300;
    return 25 + (n - 300) * dn; // then aggressive spike to 300 ops/s for the next 5 mins
  } else {
    // slowly decreases at 3 ops/s per min
    let dm = 3 / 60;
    let m = n - 600;    

    return 300 - (dm * m);
  }
}

module.exports.handler = co.wrap(function* (input, context, callback) {
  yield loadTester(input, context, callback, tickToCount);
});