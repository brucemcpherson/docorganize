const secrets = require('../private/visecrets');
const language = require('@google-cloud/language');

// this one uses the natural language api to extract entities from text
let languageClient = null;
const init = ({mode}) => {
  languageClient = new language.LanguageServiceClient({
    credentials: secrets.getGcpCreds({mode}).credentials,
  });
};
// entry point
const start = async ({content}) => {
  const document = {
    type: 'PLAIN_TEXT',
    content: content
  };

  const [result] = await languageClient.analyzeEntities({document});
  return result.entities;
};

module.exports = {
  init,
  start,
};
