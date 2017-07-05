'use strict';

const co = require('co');
const loadTester = require('./load_tester');

const peak         = 300;
const trough       = 25;
const warmup_time  = 15 * 60;  // 15 mins
const peak_time    = 60 * 60;  // 60 mins
const holding_time = 75 * 60;  // 75 mins
// ps. to go from 25 to 300 over 45 mins equates to ~6 ops/s increase per min

/* traffic pattern (roughly speaking...)
       
                    ___------------_
              ___---                -_
        ___---                        -_
_____---                                -_________

*/
function tickToCount(n) {
  if (n <= warmup_time) { // holding pattern for the first 15 mins
    return trough; 
  } else if (n <= peak_time) { // then gradually ramp up to peak load
    let dn = (peak - trough) / (peak_time - warmup_time);
    return trough + (n - warmup_time) * dn;
  } else if (n <= holding_time) { // then gradually ramp down to trough    
    let dm = (peak - trough) / (holding_time - peak_time);
    let m = n - peak_time;    

    return peak - (dm * m);
  } else {
    return trough;
  }
}

module.exports.handler = co.wrap(function* (input, context, callback) {
  yield loadTester(input, context, callback, tickToCount);
});