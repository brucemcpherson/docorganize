const languageContent = require('./languagecontent');
const languageText = require('./languagetext');
const {getPaths} = require('../common/vihandlers');


// manages orchestration after vision api
const init = ({mode}) => {
  languageContent.init({mode});
  languageText.init({mode});

};

const start = async ({mode, argv}) => {
  // for convenience - there's a common way to get all the file names/paths
  // the bucket is specified in visecrets and the initial source path here
  let {path, country: defaultCountry} = argv;
  // TODO maybe mandate this arg later
  defaultCountry = defaultCountry || 'GB';
  const paths = getPaths({
    pathName: path,
    mode,
  });
  const {gcsContentUri, gcsDataUri} = paths;

  // now clean up and extract the text from the vision response
  const gcsTextUri = gcsContentUri;

  // get the contects from storage that the vision step created
  const contents = await languageText.getContents({gcsTextUri, mode});

  // organize the ocr
  const cleanCells = await languageText.start({contents, defaultCountry});

  // now entity analysis using natural language api
  const entities = await languageContent.start({
    content: cleanCells.map(cell => cell.cleanText).join(','),
  });

  // now associate the mentions back to the original items
  const assignedEntities = await languageText.assignEntities({
    cleanCells,
    entities,
  });

  // now get more info from google knowledge graph and attach to each emtity
  const assignedMids = await languageText.getMids({assignedEntities});

  // but we'll skip the bounding box info now
  // finally write the whole thing to storage
  return Promise.all([
    languageText.writeResult({
      data: {
        mode,
        paths,
        defaultCountry,
        content: assignedMids.map(f => {
          f.texts = f.texts.map(g => {
            delete g.bb;
            return g;
          });
          return f;
        }),
      },
      gcsDataUri,
      mode,
    }),
  ]);
};

module.exports = {
  init,
  start,
};
