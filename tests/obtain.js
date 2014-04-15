"use strict";
define([
    'intern!object',
    'intern/chai!assert',
    'lib/obtain'
], function (registerSuite, assert, obtain) {
    
    var echo_job = obtain.factory({},{},[], function(obtain, input){ return input; })
      , exception_job = obtain.factory({},{},[], function(obtain, input){throw new input(); })
      ;
        
    
    registerSuite({
        name: 'obtain',

        echo_s: function () {
            var input = 'hello echo';
            assert.strictEqual(echo_job(false, input), input, 'Result should be echod input.');
        }
      , echo_a: function() {
            //testin the unified 
            var dfd = this.async(1000)
              , input = 'hello echo'
              // dfd.callback resolves the promise as long as no errors
              // are thrown from within the callback function
              , callback = dfd.callback(function (result) {
                    assert.equal(result, input, 'Result should be echod input.');
                })
              , errback = dfd.callback(function(error) {
                    // this shouldn't run here ever
                    throw error;
                })
              ;
            echo_job(true, input, callback, errback);
            // no need to return the promise; calling `async` makes the test async
        }
      , except_s: function() {
            var Err = function(){};
            assert.throws(exception_job.bind(null, false, Err), Err,
                                    undefined, 'Err should be raised.');
        }
      , except_a: function() {
            var dfd = this.async(1000)
              , Err = function(){}
              , callback = dfd.callback(function(result) {
                    // this shouldn't run here ever
                    throw new Error('This shouldn\'t run here ever.');
                })
              , errback = dfd.callback(function(error) {
                    assert.instanceOf(error, Err, 'Error should be an Err.');
                })
              ;
            exception_job(true, Err, callback, errback);
        }
    });
});
