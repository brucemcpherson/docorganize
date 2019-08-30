const todocsServer = require('./todocsserver');
todocsServer.init({
  mode: process.env.FIDRUNMODE || 'pv',
});
