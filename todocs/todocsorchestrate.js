const todocsDocs = require('./todocsdocs');
const {getContent} = require('../common/storagestream');
const {getPaths, attachColumnTypes} = require('../common/vihandlers');
// manages orchestration of vision api -> docs
const init = ({mode}) => {
  return todocsDocs.init({mode});
};

const start = async ({mode}) => {
  const {gcsDataUri} = getPaths({
    pathName: 'a.pdf',
    mode,
  });
  const docTitle = 'sean';

  // get the contents of the analysis file
  const assignedMids = await getContent({name: gcsDataUri, mode});

  // summarize types for each column
  const headers = attachColumnTypes({assignedMids});

  // finally write the whole thing to docs
  return todocsDocs.writeResult({
    cells: assignedMids,
    title: docTitle,
    headers
  });
};

module.exports = {
  init,
  start,
};
