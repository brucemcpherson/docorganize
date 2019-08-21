const languageContent = require('./languagecontent');
const languageVision = require('./languagevision');
const languageText = require('./languagetext');
const languageSheets = require('./languageSheets');

const init = ({mode}) => {
  languageContent.init({mode});
  languageVision.init({mode});
  languageSheets.init({mode});
  languageText.init({mode});
};

const start = async ({mode}) => {
  // first convert the document to text
  const gcsSourceUri =
    'gs://fidkp-artifacts/OCR Source Files/Old Navy.pdf';
    //'gs://fidkp-artifacts/OCR Source Files/Guinness - Surfer.pdf';
    //'gs://fidkp-artifacts/OCR Source Files/Ford - Ubuntu.pdf';
    //'gs://fidkp-artifacts/OCR Source Files/Academy - Tetra Pak.pdf';
    //'gs://fidkp-artifacts/a.pdf';
    //'gs://fidkp-artifacts/ocr/films/434/bms.pdf';

  const gcsContentUri = gcsSourceUri + '-vision/text/';
  const gcsDataUri = gcsSourceUri + '-vision/data/entity-analysis.json';
  const sheetTitle =
    'oldnavy';
  //'surfer';
  //'ubuntu';
  //'tetra';
    //'434';
    //'sean';
  const visionResult = await languageVision.start({ gcsSourceUri, gcsContentUri });

  // now clean up and extract the text from the vision response
  const gcsTextUri = gcsContentUri;
  // visionResult.responses[0].outputConfig.gcsDestination.uri; //

  // get the contects from storage
  const contents = await languageText.getContents({gcsTextUri, mode});

  // ocr and organize
  const cleanCells = languageText.start({contents});

  // now entity analysis
  const entities = await languageContent.start({
    content: cleanCells.map(cell => cell.cleanText).join(','),
  });

  // now associate the mentions with each item
  const assignedEntities = await languageText.assignEntities({
    cleanCells,
    entities,
  });

  // now get more info from google knowledge graph and attach to each emtity
  const assignedMids = await languageText.getMids({assignedEntities});

  // summarize types for each column
  const headers = languageText.attachColumnTypes({assignedMids});
  console.log(headers);
  // finally write the whole thing to storage, and sheets
  return Promise.all([
    languageText.writeResult({data: assignedMids, gcsDataUri, mode}),
    languageSheets.writeResult({
      cells: assignedMids,
      headers,
      title: sheetTitle,
    }),
  ]);
};

module.exports = {
  init,
  start,
};
