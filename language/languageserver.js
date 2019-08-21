const secrets = require('../private/visecrets');
// Imports the Google Cloud client library
const languageOrchestrate = require('./languageOrchestrate');

const init = async ({ mode }) => {
  languageOrchestrate.init({ mode });
  await languageOrchestrate.start({ mode });
}
module.exports = {
  init
};
