// get specialized lookups from graphql
const viapollo = require('../gql/viapollo');
const {Ml_names, ProfessionsMl, CompanyNames} = require('../gql/queries');
const {till} = require('./viutils');
const secrets = require('../private/visecrets');
const init = ({mode}) => {
  // initialize graphql
  viapollo.init({mode});
};

const getAllChunks = async ({mode, query}) => {
  let offset = 0;
  let limit = 500;
  console.log('....starting gql query chunks', query.definitions[0].name);
  const data = [];
  do {
    const result = await getChunk({offset, limit, mode, query});
    if (result.error) {
      return result;
    }
    // only works for single prop results
    const k = Object.keys(result.data)[0];
    if (Object.keys(result.data).length !== 1) {
      console.error(
        'only works for single data items - skipping the rest',
        Object.keys(result.data)
      );
    }
    if (!result.data[k].length) {
      limit = 0;
    } else {
      Array.prototype.push.apply(data, result.data[k]);
    }
    offset = data.length;
  } while (limit);
  return {
    data,
  };
};

const getChunk = async ({ offset, limit, mode, query }) => {
  const {result, error} = await till(
    viapollo.query({
      query,
      fetchPolicy: 'no-cache',
      variables: {
        limit,
        offset,
      },
      context: {
        headers: {
          'x-fid-proxy': secrets.getApiConfig({mode}).proxy,
          'x-fid-apikey': secrets.getApiConfig({mode}).apiKey,
        },
      },
    })
  );

  if (error) {
    console.error(JSON.stringify(error));
    return {
      error,
    };
  } else {
    return {
      data: result.data,
    };
  }
};

const getCompanyNames = async ({mode}) => {
  // get professions/ml_name associations - need to do both ways round as some may be present in one and not the other
  const [companyNames] = await Promise.all([
    getAllChunks({mode, query: CompanyNames}),
  ]);
  const {data, error} = companyNames;
  if (!error) {
    // need to build a look up for fuse
    const lob = data.reduce((p, c) => {
      // use the company id as key
      const {
        companyID,
        name,
        abbreviatedName,
        localName,
        localAbbreviatedName,
      } = c;
      const key = 'n' + companyID;
      if (!p[key]) {
        p[key] = {
          name,
          id: companyID,
          shorts: [],
        };
      } else {
        // its an alternative name for the same company id
        p[key].shorts.push(name);
      }
      // now add any abbreviations
      [abbreviatedName, localName, localAbbreviatedName].forEach(f => {
        if (f && p[key].shorts.indexOf(name) === -1) p[key].shorts.push(f);
      });
      return p;
    }, {});

    // now convert that into an array for fuse
    return Object.keys(lob).map(k => lob[k]);
  }
};
const getProfessions = async ({mode}) => {
  // get professions/ml_name associations - need to do both ways round as some may be present in one and not the other
  const [mlnames, professions] = await Promise.all([
    getAllChunks({mode, query: Ml_names}),
    getAllChunks({mode, query: ProfessionsMl}),
  ]);
  const {data, error} = mlnames;
  const {data: pdata, error: professionsError} = professions;
  if (!error && !professionsError) {
    // need to build a look up for fuse
    const lob = data.reduce((p, c) => {
      // use the profession id as key
      const {Profession: prof} = c;
      const {name} = (prof && prof.ProfessionLocalized) || {
        name: secrets.clues.ineligible.name,
      };
      const {id} = prof || {
        id: secrets.clues.ineligible.id,
      };
      const key = 'p' + id;
      if (!p[key]) {
        p[key] = {
          name,
          id,
          shorts: [],
        };
      }
      // this'll be a short form for it
      p[key].shorts.push(c.name);
      return p;
    }, {});

    // now add any professions that dont have a synonym
    const ob = pdata.reduce((p, c) => {
      const {id, ProfessionLocalized} = c;
      const {name} = ProfessionLocalized || {};
      const key = 'p' + id;
      if (!p[key]) {
        p[key] = {
          name,
          id,
          shorts: [],
        };
      }
      return p;
    }, lob);
    // now convert that into an array for fuse
    return Object.keys(ob).map(k => ob[k]);
  }
};
const start = async ({mode}) => {
  // get professions/ml_name associations - need to do both ways round as some may be present in one and not the other
  return Promise.all([getProfessions({mode}), getCompanyNames({mode})]);
};

module.exports = {
  init,
  start,
};
