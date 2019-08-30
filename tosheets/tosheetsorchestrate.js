const tosheetsSheets = require('./tosheetsSheets');
const {getContent} = require('../common/storagestream');
const {getPaths, attachColumnTypes} = require('../common/vihandlers');

// manages orchestration of vision api -> sheets
const init = ({mode}) => {
  return tosheetsSheets.init({mode});
};

const start = async ({mode, argv}) => {
  // the bucket is specified in visecrets and the initial source path here
  const {path, sheet} = argv;
  const {gcsCoupleUri} = getPaths({
    pathName: path,
    mode,
  });
  const sheetTitle = sheet.toString();

  // get the contents of the analysis file
  const data = await getContent({name: gcsCoupleUri, mode});
  const {content: assignedMids} = data;

  // summarize types for each column
  const headers = attachColumnTypes({assignedMids});

  // finally write the whole thing to storage, and sheets
  return Promise.all([
    tosheetsSheets.writeResult({
      cells: assignedMids,
      headers,
      title: sheetTitle,
    }),
    tosheetsSheets.writeRoles({
      cells: assignedMids,
      title: sheetTitle+'-roles',
    })]);
};

module.exports = {
  init,
  start,
};
