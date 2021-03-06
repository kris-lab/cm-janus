var sinon = require('sinon');
var fs = require('fs');
var mkdirp = require('mkdirp');
var tmpName = require('tmp').tmpNameSync;
var assert = require('chai').assert;
var Promise = require('bluebird');
var util = require('util');
require('../../../helpers/globals');
var AbstractJob = require('../../../../lib/job/model/abstract');

describe('AbstractJob', function() {
  var JobClass;

  before(function() {
    JobClass = function() {
      AbstractJob.prototype.constructor.apply(this, arguments);
    };
    util.inherits(JobClass, AbstractJob);
    sinon.stub(JobClass.prototype, 'getName').returns('job-name');
  });


  context('on cancel', function() {

    var job;

    beforeEach(function() {
      job = new JobClass();
      job._run = function() {
        return new Promise(function(resolve, reject) {
        });
      };
      job.run();
    });

    it('should cleanup', function() {
      var cleanup = sinon.spy(job, 'cleanup');
      job.cancel();
      assert.isTrue(cleanup.calledOnce);
    });

    it('should stop cancel running promise', function() {
      var cancel = sinon.stub(job._promise, 'cancel');
      job.cancel();
      assert.isTrue(cancel.calledOnce);
      assert.isNull(job._promise);
    });
  });

  context('on cleanup', function() {
    var job;

    beforeEach(function() {
      var workingDirectory = tmpName();
      mkdirp.sync(workingDirectory);

      job = new JobClass();
      job.setWorkingDirectory(workingDirectory);
    });

    it('should remove files within working directory', function(done) {
      job._tmpFilename('foo').then(function(jobFile) {
        fs.writeFileSync(jobFile, 'foo');
        assert.isTrue(fs.existsSync(jobFile));
        job.cleanup();
        assert.isFalse(fs.existsSync(jobFile));
        done();
      });
    });

    it('should kill running process', function(done) {
      job._runJobScript('sleep 0.01')
        .catch(function() {
          done();
        })
        .progress(function() {
          var kill = sinon.spy(job._process, 'kill');
          job.cleanup();
          assert.isTrue(kill.withArgs('SIGKILL').calledOnce);
          assert.isNull(job._process);
        });
    });
  });

  context('when running job script', function() {
    var workingDirectory, jobPromise;

    beforeEach(function() {
      workingDirectory = tmpName();
      mkdirp.sync(workingDirectory);

      var job = new JobClass();
      job.setWorkingDirectory(workingDirectory);
      jobPromise = job._runJobScript('pwd');
    });

    it('should run within job working directory', function(done) {
      jobPromise.then(function(output) {
        assert.equal(output.trim(), workingDirectory);
        done();
      })
    });
  });

  context('timeout cancel', function() {
    var job, jobRunTime = 2000;
    this.timeout(jobRunTime + 100);

    beforeEach(function() {
      job = new JobClass();
      job._run = function() {
        return Promise.delay(jobRunTime);
      };
    });

    it('run job ok within the timeout', function(done) {
      job._maxRunningTime = jobRunTime * 2;
      job.run().then(done);
    });

    it('reject overran jobs', function(done) {
      job._maxRunningTime = jobRunTime / 2;
      job.run().catch(Promise.TimeoutError, function() {
        done();
      });
    });
  });
});

