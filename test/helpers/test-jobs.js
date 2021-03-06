var util = require('util');
var Promise = require('bluebird');
var spawn = require('child_process').spawn;
var fs = require('fs');
var AbstractJob = require('../../lib/job/model/abstract');

var TestJobSuccess = function() {
  TestJobSuccess.super_.apply(this, arguments);
};

util.inherits(TestJobSuccess, AbstractJob);

TestJobSuccess.getPlugin = function() {
  return 'test';
};
TestJobSuccess.getEvent = function() {
  return 'test';
};

TestJobSuccess.prototype._run = function() {
  return Promise.resolve();
};

var TestJobFailed = function() {
  TestJobFailed.super_.apply(this, arguments);
};

util.inherits(TestJobFailed, AbstractJob);

TestJobFailed.getPlugin = function() {
  return 'test';
};
TestJobFailed.getEvent = function() {
  return 'test';
};

TestJobFailed.prototype._run = function() {
  return Promise.reject();
};

var TestJobSleep = function() {
  TestJobSleep.super_.apply(this, arguments);
};

util.inherits(TestJobSleep, AbstractJob);

TestJobSleep.getPlugin = function() {
  return 'test';
};
TestJobSleep.getEvent = function() {
  return 'test';
};

TestJobSleep.prototype._run = function() {
  this._process = spawn('/bin/sleep', ['100']);
  var self = this;
  return new Promise(function(resolve, reject) {
    self._tmpFilename('txt').then(function(txtFilename) {
      require('fs').writeFile(txtFilename, 'I sleep', function (err) {
        if (err) reject(err);
      });
      setTimeout(function() {
        resolve(txtFilename);
      }, 100 * 1000);
    })

  })
};

module.exports = {
  Success: TestJobSuccess,
  Failed: TestJobFailed,
  Sleep: TestJobSleep
};
