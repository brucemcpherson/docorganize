const coupleOrchestrate = require('./coupleorchestrate');

// wrapper to run the whole thing
const init = async ({ mode, argv }) => {
  await coupleOrchestrate.init({mode});
  await coupleOrchestrate.start({mode, argv});
};
module.exports = {
  init,
};
