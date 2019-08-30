const argv = require('yargs').argv;
const ocrServer = require('./ocrserver');
ocrServer.init({
  mode: process.env.FIDRUNMODE || 'pv',
  argv
});
