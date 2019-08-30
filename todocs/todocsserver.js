const secrets = require('../private/visecrets');
const todocsOrchestrate = require('./todocsorchestrate');
// wrapper to run the whole thing
const init = async ({mode}) => {
  await todocsOrchestrate.init({mode});
  await todocsOrchestrate.start({mode});
};
module.exports = {
  init,
};
