const argv = require('yargs').argv;
const languageServer = require('./languageserver');
languageServer.init({
  mode: process.env.FIDRUNMODE || 'pv',
  argv
});
