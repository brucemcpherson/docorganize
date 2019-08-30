const secrets = require('../private/visecrets');
const languageOrchestrate = require('./languageorchestrate');
// wrapper to run the whole thing
const init = async ({ mode, argv }) => {
  languageOrchestrate.init({ mode });
  await languageOrchestrate.start({ mode, argv });
}
module.exports = {
  init
};
