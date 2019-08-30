const {joinCellTexts, dummyRows} = require('../common/viutils');
const docs = require('../common/docs');

let spreadsheet = null;
// writes to a doc using the docs api
const init = async ({mode, title}) => {
  await docs.init({mode});
};
const getRoles = ({cell}) => {
  const {entity, kg} = cell;
  const roles = {
    person: 0,
    location: 0,
    profession: 0,
    phoneNumber: 0,
    email: 0,
    company: 0,
  };
  // use clues to determine what this is
  const type = entity && entity.type;
  if (type === 'PERSON') {
    roles.person++;
    roles.profession++;
  }
  if (type === 'LOCATION') {
    roles.location++;
  }
  const ktype = kg && kg['@type'];
  if (ktype && ktype.find(f => ['Person'].find(g => g === f))) {
    roles.person++;
  }
  if (!ktype || !ktype.find(f => ['Person', 'Location'].find(g => g === f)))
    roles.profession++;
  if (
    ktype &&
    ktype.find(f =>
      ['Place', 'Country', 'AdministrativeArea'].find(g => g === f)
    )
  )
    roles.location++;
  return roles;
};

const writeResult = async ({cells, title}) => {
  /*
  const result = await createOrClearDocument({
    title,
  });

  // do some error checking TODO
  const doc = result.data;
  console.log('...created document ', title, doc.documentId);
*/

  // do the data rowWise
  const content = dummyRows({cells}).reduce((collect, _, rowNumber) => {
    const row = cells.filter(cell => cell.rowNumber === rowNumber);
    // find the roles for each cell in the row

    collect.push({
      sources: row
        .filter(r => r)
        .map(cell => joinCellTexts({cell}))
        .join(','),
    });

    const roles = row.map(cell => getRoles({cell}));

    // find the best fit roles
    let used = [];
    const {indices: peopleIndices, bestScore: peopleBestScore} = bestScore({
      roles,
      key: 'person',
      used,
    });
    used = used.concat(peopleIndices);

    const {
      indices: professionIndices,
      bestScore: professionBestScore,
    } = bestScore({
      roles,
      key: 'profession',
      used,
    });
    used = used.concat(professionIndices);

    const {indices: locationIndices, bestScore: locationBestScore} = bestScore({
      roles,
      key: 'location',
      used
    });
    used = used.concat(locationIndices);

    console.log(
      'people',
      peopleBestScore,
      peopleIndices.map(f => row[f]).map(f => joinCellTexts({cell: f})),
      'professions',
      professionBestScore,
      professionIndices.map(f => row[f]).map(f => joinCellTexts({cell: f})),
      'locations',
      locationBestScore,
      locationIndices.map(f => row[f]).map(f => joinCellTexts({cell: f}))
    );
    return collect;
  }, []);

  console.log(content);
};

const bestScore = ({roles, key, used}) => {
  const bestScore = roles.reduce((p, c) => Math.max(p, c[key]), 0);
  return {
    indices: roles
      .map((f, i) => (f[key] === bestScore && used.indexOf(i) === -1 ? i : -1))
      .filter(f => f !== -1),
    bestScore,
  };
};

// adds the given sheet or clears it if it exists
const createOrClearDocument = ({title}) => {
  // TODO - for now, just create a new one
  return docs.createDocument({
    title,
  });
};

module.exports = {
  init,
  writeResult,
};
