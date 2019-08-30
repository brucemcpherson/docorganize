const secrets = require('../private/visecrets');
const tosheetsOrchestrate = require('./tosheetsOrchestrate');
// wrapper to run the whole thing
const init = async ({mode, argv}) => {
  await tosheetsOrchestrate.init({mode});
  await tosheetsOrchestrate.start({mode, argv});
};
module.exports = {
  init,
};
