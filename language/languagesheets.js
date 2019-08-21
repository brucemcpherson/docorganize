const {getSheetSpreadsheetId} = require('../private/visecrets');
const {joinCellTexts} = require('../common/viutils');
const sheets = require('../common/sheets');
let spreadsheet = null;

const init = async ({mode}) => {
  await sheets.init({mode});
  const result = await sheets.getSpreadsheet({
    spreadsheetId: getSheetSpreadsheetId({mode}),
  });
  // do some error checking TODO
  spreadsheet = result.data;
  console.log('...got spreadsheet ', spreadsheet.properties.title);
};

const writeResult = async ({headers, cells, title}) => {
  const sheet = await insertOrClearSheet({title});
  // headers

  const values = [
    headers.reduce((p, c) => {
      // get the most popular
      const header = c.slice().sort((a, b) => b.count - a.count)[0];
      const { type, count } = header || {};
      Array.prototype.push.apply(p, [
        'Phrase',
        'Cleaned up',
        `Type (${type} - ${count})`,
        'Google kg',
        'Wiki',
        'kg Name',
        'kg Type',
        'kg Description',
        'kg Article',
        'kg Url',
        'kg Image',
        'kg Image content',
      ]);
      return p;
    }, headers.map((t, i) => 'summary-' + i)),
  ];
  console.log('....writing to sheet', title);
  // now we can write the values
  const EXTRA_DETAIL = 12;

  const rows =
    Array(cells.reduce((p, c) => Math.max(c.rowNumber + 1, p), 0))
    .fill(f => '');

  Array.prototype.push.apply(
    values,
    rows.map((_, rowNumber) => {
      const targets = cells
        .filter(cell => cell.rowNumber === rowNumber)
        .sort((a, b) => a.columnNumber - b.columnNumber);

      return headers.reduce((p, c, columnNumber) => {
        // the first few columns are a summary of the whole thing
        const targetCells = targets.filter(
          t => t.columnNumber === columnNumber
        );
        // the others are a block of complex things

        if (targetCells.length > 1) {
          console.error(
            'too many for same column .. skipping',
            rowNumber,
            columnNumber
          );
        } else if (targetCells.length) {
          const cell = targetCells[0];
          p[columnNumber] = joinCellTexts({cell});
          // the details
          let start = EXTRA_DETAIL * columnNumber + headers.length;
          const {entity, cleanText, kg} = cell;
          const metadata = (entity && entity.metadata) || '';
          const mid = (metadata && metadata.mid) || '';
          const type = (entity && entity.type) || '';
          const wikipedia_url = (metadata && metadata.wikipedia_url) || '';
          const kgname = (kg && kg.name) || '';
          const kgtype = ((kg && kg['@type']) || []).join(',');
          const kgdescription = (kg && kg.description) || '';
          const kgarticle =
            (kg &&
              kg.detailedDescription &&
              kg.detailedDescription.articleBody) ||
            '';
          const kgurl =
            (kg && kg.detailedDescription && kg.detailedDescription.url) || '';
          const kgimage = (kg && kg.image && kg.image.url) || '';
          const kgimagecontent = (kg && kg.image && kg.image.contentUrl) || '';
          p[start++] = joinCellTexts({cell});
          p[start++] = cleanText;
          p[start++] = type;
          p[start++] = mid;
          p[start++] = wikipedia_url;
          p[start++] = kgname;
          p[start++] = kgtype;
          p[start++] = kgdescription;
          p[start++] = kgarticle;
          p[start++] = kgurl;
          p[start++] = kgimage;
          p[start++] = kgimagecontent;
        }
        return p;
      }, []);
    })
  );
  return sheets.addValues({spreadsheet, values, sheet: {title}});
};
// adds the given sheet or clears it if it exists
const insertOrClearSheet = ({title}) => {
  const tlc = title.toLowerCase();
  const sheet = spreadsheet.sheets.find(
    f => f.properties.title.toLowerCase() === tlc
  );
  if (sheet) {
    // clear the sheet
    return sheets.clearSheet({spreadsheet, sheet});
  } else {
    // insert the sheet
    return sheets.createSheet({title, spreadsheet});
  }
};

module.exports = {
  init,
  writeResult,
};
