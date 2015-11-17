var expect = require('chai').expect;
var sinon = require('sinon');
var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require("fs"));
var App = require('../../lib/index');
new App({}).registerServices();

var JobManager = require('../../lib/job/job-manager');
var AbstractJobHandler = require('../../lib/job/handler/abstract');

describe('JobManager', function() {

  function randomString() {
    return Math.random().toString(36).substring(2, 10);
  }

  function createTmpDir() {
    var tmpDirPath = path.join(__dirname, randomString());
    return fs.mkdirAsync(tmpDirPath).then(function() {
      return tmpDirPath;
    });
  }

  function createJobFile(dir, data) {
    var filepath = path.join(dir, randomString() + '.json');
    return fs.writeFileAsync(filepath, JSON.stringify(data), {encoding: 'utf8', flag: 'w'}).then(function() {
      return filepath;
    });
  }

  function randomTestJobData() {
    return {
      plugin: 'test',
      event: 'test',
      data: {
        streamChannelId: '1',
        audio: '/path/123.rtp',
        video: '/path/124.rtp'
      }
    };
  }

  it('test job handler call', function(done) {
    createTmpDir().then(function(tmpDirPath) {
      var jobData = randomTestJobData();
      var testJobHandler = new AbstractJobHandler();
      testJobHandler.handle = sinon.stub().returns(Promise.resolve());
      testJobHandler.getPlugin = sinon.stub().returns(jobData['plugin']);
      testJobHandler.getEvent = sinon.stub().returns(jobData['event']);

      new JobManager(tmpDirPath, [testJobHandler]);

      createJobFile(tmpDirPath, jobData).then(function(jobFilepath) {
        setTimeout(function() {

          expect(testJobHandler.handle.calledOnce).to.be.ok;
          expect(testJobHandler.handle.withArgs(jobData['data'])).to.be.ok;
          expect(function() {
            fs.accessSync(jobFilepath);
          }).to.throw();

          fs.rmdirAsync(tmpDirPath).then(function() {
            done();
          });
        }, 1000);//here we need to wait a bit to give time to jobHandler to work.
      });
    });
  });
});
