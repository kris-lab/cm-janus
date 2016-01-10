var Promise = require('bluebird');
var tmpName = Promise.promisify(require('tmp').tmpName);
var unlink = Promise.promisify(require('fs').unlink);
var util = require('util');
var _ = require('underscore');

var serviceLocator = require('../../service-locator');
var AbstractJob = require('./abstract');

function RtpbroadcastRecordingJob(jobData, configuration) {
  if (!_.has(jobData, 'audio')) {
    throw new Error('No `audio` parameter provided');
  }
  if (!_.has(jobData, 'video')) {
    throw new Error('No `video` parameter provided');
  }
  if (!_.has(jobData, 'streamChannelId')) {
    throw new Error('No `streamChannelId` parameter provided');
  }
  RtpbroadcastRecordingJob.super_.apply(this, arguments);
}

util.inherits(RtpbroadcastRecordingJob, AbstractJob);

RtpbroadcastRecordingJob.getPlugin = function() {
  return 'janus.plugin.cm.rtpbroadcast';
};

RtpbroadcastRecordingJob.getEvent = function() {
  return 'recording-finished';
};

RtpbroadcastRecordingJob.prototype._run = function(tmpDir) {
  var self = this;
  var streamChannelId = this._jobData.streamChannelId;
  var audioMjrFile = this._jobData.audio;
  var videoMjrFile = this._jobData.video;

  return tmpName({postfix: '.webm', dir: tmpDir})
    .then(function(webmFile) {
      return self._audioVideoMerge(audioMjrFile, videoMjrFile, webmFile)
        .then(function() {
          return serviceLocator.get('cm-application').importMediaStreamArchive(streamChannelId, webmFile)
        })
        .then(function() {
          var errorHandler = function(error) {
            if (error) {
              serviceLocator.get('logger').error(error);
            }
          };
          unlink(webmFile, errorHandler);
          unlink(audioMjrFile, errorHandler);
          unlink(videoMjrFile, errorHandler);
        });
    });
};

RtpbroadcastRecordingJob.prototype._audioVideoMerge = function(audioMjrFile, videoMjrFile, webmFile) {
  var convertCommand = _.template(this._configuration.mergeCommand)({
    audioMjrFile: audioMjrFile,
    videoMjrFile: videoMjrFile,
    webmFile: webmFile
  });
  return this._runJobScript(convertCommand);
};

module.exports = RtpbroadcastRecordingJob;