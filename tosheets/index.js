const argv = require('yargs').argv;
const tosheetsServer = require('./tosheetsserver');
tosheetsServer.init({
  mode: process.env.FIDRUNMODE || 'pv',
  argv
});
