const {google} = require('googleapis');
const {getGcpCreds, getKgScopes} = require('../private/visecrets');
const till = waitingFor =>
  waitingFor.then(result => ({result})).catch(error => ({error}));

let kgClient = null;
/**
 * returns an authorized knowledge graph client
 */

const init = ({mode}) => {
  const {apiKey} = getGcpCreds({mode});
  kgClient = new google.kgsearch({
    version: 'v1',
    auth: apiKey,
  });
  return kgClient
};

const search = ({mids}) => {
  return kgClient.entities.search({
    ids: mids,
  });
};
/**
 * use it like this
 */
const test = async () => {
  // initialize auth
  const mode = 'lv';
  console.log('starting');
  init({mode});

  // make up some data
  const mids = ['/m/01bw9x', '/m/0ch6mp2'];
  const result = await search({ mids });
  // 
  console.log(JSON.stringify(result.data.itemListElement));
};

module.exports = {
  init,
  search,
};
