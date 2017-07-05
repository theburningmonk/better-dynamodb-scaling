'use strict';

const co = require('co');
const loadTester = require('./load_tester');

const peak        = 300;
const trough      = 25;
const warmup_time = 15 * 60;  // 15 mins
const peak_time   = 20 * 60;  // 20 mins


/* traffic pattern (roughly speaking...)
         ________
        /        --------________
       /                         --------________
      /                                          --------________
_____/                                                           --------________

*/
function tickToCount(n) {
  if (n <= warmup_time) {
    return trough; // holding pattern for the first 15 mins
  } else if (n <= peak_time) {
    let dn = (peak - trough) / (peak_time - warmup_time);
    return trough + (n - warmup_time) * dn; // then aggressive spike to 300 ops/s for the next 5 mins
  } else {
    // slowly decreases at 3 ops/s per min
    let dm = 3 / 60;
    let m = n - peak_time;    

    return peak - (dm * m);
  }
}

module.exports.handler = co.wrap(function* (input, context, callback) {
  yield loadTester(input, context, callback, tickToCount);
});