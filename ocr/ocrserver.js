const ocrOrchestrate = require('./ocrorchestrate');
// wrapper to run the whole thing
const init = async ({mode, argv}) => {
  ocrOrchestrate.init({mode});
  await ocrOrchestrate.start({mode, argv});
};
module.exports = {
  init,
};
