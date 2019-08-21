const languageServer = require('./languageserver');
languageServer.init({
  mode: process.env.FIDRUNMODE || 'lv',
});
