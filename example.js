"use strict";

var v8  = require('v8');
v8.setFlagsFromString('--harmony_classes');
v8.setFlagsFromString('--harmony_object_literals');
v8.setFlagsFromString('--harmony_tostring');
v8.setFlagsFromString('--harmony_arrow_functions');

var TorControlClient = require(".");
var tc = new TorControlClient({ port: 9998, password: 'torControl2015' });

tc.init(function(err) {
  if(!err) {
    tc.sendCommand('GETCONF SOCKSPORT', function(err, data) {
      if(!err) {
        console.log(data);
      }
    });
    tc.sendCommand('GETCONF CONTROLPORT', function(err, data) {
      if(!err) {
        console.log(data);
      }
    });

  } else {
    console.log('There was an error:', err);
  }
});
