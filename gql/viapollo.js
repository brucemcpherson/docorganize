const fetch = require('node-fetch');
const {createHttpLink} = require('apollo-link-http');
const {InMemoryCache} = require('apollo-cache-inmemory');
const {ApolloClient} = require('apollo-client');
const {ApolloLink} = require('apollo-link');
const secrets = require('../private/visecrets');

let client = null;

const init = ({mode}) => {
  const httpLink = createHttpLink({
    uri: secrets.getApiConfig({mode}).uri,
    fetch: fetch,
  });
  console.log('gql query uri', secrets.getApiConfig({mode}).uri);
  client = new ApolloClient({
    link: ApolloLink.from([httpLink]),
    cache: new InMemoryCache(),
  });
};

module.exports = {
  query: options => client.query(options),
  mutate: options => client.mutate(options),
  init,
};
