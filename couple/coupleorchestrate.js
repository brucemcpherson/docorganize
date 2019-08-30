const {getContent, streamContent} = require('../common/storagestream');
const {
  getPaths,
  attachParagraphTypes,
  attachCellContentType,
  coupleCells,
} = require('../common/vihandlers');
// manages association of attributes
const init = ({mode}) => {
  // nothing special here
};

const start = async ({mode, argv}) => {
  const {path} = argv;
  const paths = getPaths({
    pathName: path,
    mode,
  });
  const {gcsDataUri, gcsCoupleUri} = paths;

  // get the contents of the analysis file
  const data = await getContent({name: gcsDataUri, mode});
  const {defaultCountry, content: assignedMids} = data;
  // summarize main types for each paragraph
  const paragraphs = attachParagraphTypes({assignedMids});

  // now evaluate likely cell content
  attachCellContentType({paragraphs});
  coupleCells({assignedMids});
  /*
  Object.keys(paragraphs).map(k => {
    const para = paragraphs[k];

    console.log(
      para.types,
      para.topType,
      para.cells.map(cell => [joinCellTexts({cell}), cell.scores])
    );
  });
  */
  // write it out
  return streamContent({
    name: gcsCoupleUri,
    content: {
      paths,
      mode,
      defaultCountry,
      content: assignedMids,
    },
    mode,
  });
  // now
  /*
  // finally write the whole thing to docs
  return todocsDocs.writeResult({
    cells: assignedMids,
    title: docTitle,
    headers,
  });
  */
};

module.exports = {
  init,
  start,
};
