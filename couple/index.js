const argv = require('yargs').argv;
const coupleServer = require('./coupleserver');
coupleServer.init({
  mode: process.env.FIDRUNMODE || 'pv',
  argv
});
