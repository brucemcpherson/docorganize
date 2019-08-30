const {getSheetSpreadsheetId} = require('../private/visecrets');
const {joinCellTexts} = require('../common/viutils');
const {makeRoles} = require('../common/vihandlers');
const sheets = require('../common/sheets');
let spreadsheet = null;
// writes to a sheet using the SHeets API
const init = async ({mode}) => {
  await sheets.init({mode});
  const result = await sheets.getSpreadsheet({
    spreadsheetId: getSheetSpreadsheetId({mode}),
  });
  // do some error checking TODO
  spreadsheet = result.data;
  console.log('...got spreadsheet ', spreadsheet.properties.title);
};

const sortKeyPerson = (a) => a.roles.person.rowNumber * 10000 + a.roles.person.columnNumber;
const personKg = (row, prop) => (row.roles.person.kg && row.roles.person.kg[prop]) || '';
const personKgDetail = (row, prop) =>
  (row.roles.person.kg && row.roles.person.kg.detailedDescription && row.roles.person.kg.detailedDescription[prop]) || '';
const personKgImage = (row, prop) =>
  (row.roles.person.kg && row.roles.person.kg.image && row.roles.person.kg.image[prop]) || '';

const writeRoles = async ({cells, title}) => {
  const sheet = await insertOrClearSheet({title});
  const headers = ['person', 'profession', 'phone', 'mobile', 'email','company'];
  const kg = ["kg Description", "kg Article", "kg Url", "kg Image", "kg Image content"];
  const rows = makeRoles({ cells }).sort((a, b) => sortKeyPerson(a) - sortKeyPerson(b));

  const data = rows.map(row =>
    headers.map(h => {
      return (row.roles[h] && row.roles[h].embellished) || '';
    }).concat([
      personKg(row, 'description'),
      personKgDetail(row, 'articleBody'),
      personKgDetail(row, 'url'),
      personKgImage(row, 'url'),
      personKgImage(row, 'contentUrl')
    ])
  );
  const values = [headers.concat(kg)].concat(data);
  return sheets.addValues({spreadsheet, values, sheet: {title}});
};

const writeResult = async ({headers, cells, title}) => {
  const sheet = await insertOrClearSheet({title});
  // headers
  // there is a summary set of columns, then a whole bunch of detail on each column.
  // it's not a very useful sheet, but ok for checking the detail
  const values = [
    headers.reduce((p, c) => {
      // get the most popular type of entity for this column - might be useful for later
      const header = c.slice().sort((a, b) => b.count - a.count)[0];
      const {type, count} = header || {};
      Array.prototype.push.apply(p, [
        'Phrase',
        'Cleaned up',
        'Embellished',
        'Likely',
        'Score',
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
  // these are the additional columns of detail added for each column
  const EXTRA_DETAIL = 15;

  // a mock array 1 for each row discovered
  const rows = Array(
    cells.reduce((p, c) => Math.max(c.rowNumber + 1, p), 0)
  ).fill(f => '');
  // concatenate the headers and the data
  Array.prototype.push.apply(
    values,
    rows.map((_, rowNumber) => {
      // the cells are not organize by row, but have a rown number
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
          // this should never happen
          console.error(
            'too many for same column .. skipping',
            rowNumber,
            columnNumber
          );
        } else if (targetCells.length) {
          const cell = targetCells[0];
          p[columnNumber] = joinCellTexts({cell});
          // the details - calculate the start column for the extra details
          let start = EXTRA_DETAIL * columnNumber + headers.length;
          // all the stuff from the knowledge graph
          const {entity, cleanText, kg, likely, embellished} = cell;
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
          p[start++] = embellished;
          p[start++] = (likely && likely.name) || '----';
          p[start++] = (likely && likely.score) || '----';
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
  // finally write all that to the sheet
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
  writeRoles,
};
