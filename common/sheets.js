const {google} = require('googleapis');
const {
  getSheetCreds,
  getSheetSubject,
  getSheetScopes,
} = require('../private/visecrets');
const till = waitingFor =>
  waitingFor.then(result => ({result})).catch(error => ({error}));
/**
 * create a column label for sheet address, starting at 1 = A, 27 = AA etc..
 * @param {number} columnNumber the column number
 * @return {string} the address label
 */
const columnLabelMaker = (columnNumber, s) => {
  s =
    String.fromCharCode(((columnNumber - 1) % 26) + 'A'.charCodeAt(0)) +
    (s || '');
  return columnNumber > 26
    ? columnLabelMaker(Math.floor((columnNumber - 1) / 26), s)
    : s;
};
const rangeMaker = ({rows, columns, rowOffset, columnOffset}) =>
  `${columnLabelMaker((columnOffset || 0) + 1)}${(rowOffset || 0) +
    1}:${columnLabelMaker((columnOffset || 0) + (columns || 1))}${(rowOffset ||
    0) + (rows || 1)}`;

const mode = 'lv';
let sheetClient = null;
/**
 * returns an authorized sheet client
 */
const init = async ({mode}) => {
  const {credentials} = getSheetCreds({mode});
  // jwt includes account to impersonate
  const auth = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    getSheetScopes(),
    getSheetSubject({mode})
  );
  // validate and authorize the jwt
  const {result, error} = await till(auth.authorize());
  if (!error) {
    console.log(
      `....service account ready to access sheets on behalf of ${getSheetSubject(
        {
          mode,
        }
      )}`
    );
    sheetClient = google.sheets({
      version: 'v4',
      auth,
    });
    return sheetClient;
  } else {
    console.error(error);
  }
};
/**
 * add values to a an existing sheet, starting at top left or at a given offset
 */
const addValues = ({spreadsheet, sheet, values, rowOffset, columnOffset}) => {
  const {title} = sheet;
  const range = `'${title}'!${rangeMaker({
    rows: values.length,
    columns: values[0].length,
    rowOffset,
    columnOffset,
  })}`;
  const request = {
    spreadsheetId: spreadsheet.spreadsheetId,
    resource: {
      valueInputOption: 'RAW',
      data: [
        {
          range,
          values,
        },
      ],
    },
  };
  console.log('...adding values to ', range);
  return sheetClient.spreadsheets.values.batchUpdate(request);
};
/*
 * clear the whole sheet
 */
const clearSheet = ({spreadsheet, sheet}) => {
  const {spreadsheetId} = spreadsheet;
  const {
    rowCount: rows,
    columnCount: columns,
  } = sheet.properties.gridProperties;
  const range = `'${sheet.properties.title}'!${rangeMaker({
    rows,
    columns,
  })}`;
  return sheetClient.spreadsheets.values.clear({
    range,
    spreadsheetId,
  });
};

/*
 * get basic info on a spreadsheet
 */
const getSpreadsheet = ({spreadsheetId}) => {
  return sheetClient.spreadsheets.get({
    spreadsheetId,
    fields: 'spreadsheetId,properties.title,sheets.properties',
  });
};

/*
 * create an empty sheet
 */
const createSheet = ({title, spreadsheet}) => {
  const request = {
    spreadsheetId: spreadsheet.spreadsheetId,
    resource: {
      requests: [
        {
          addSheet: {
            properties: {
              title,
            },
          },
        },
      ],
    },
  };
  console.log('...creating new sheet ', title);
  return sheetClient.spreadsheets.batchUpdate(request);
};
/*
 * create an empty spreadsheet
 */
const createSpreadsheet = async ({title, mode}) => {
  const request = {
    fields: 'spreadsheetId',
    resource: {
      properties: {
        title,
      },
    },
  };
  console.log('...creating new spreadsheet ', title);
  return sheetClient.spreadsheets.create(request);
};

/**
 * use it like this
 *
(async () => {
  // initialize auth
  const sheetClient = await init({mode});

  // make up some data
  const values = [
    ['Name', 'Profession', 'Address'],
    ['Sean Connery', 'Actor', 'Bahamas'],
    ['Richard Branson', 'Businessman', 'Necker Island'],
    ['Celine Dion', 'Singer', 'Henderson, Nevada'],
  ];

  // create a spreadsheet, add a sheet, insert some values
  createSpreadsheet({title: 'my spreadsheet', mode})
    .then(spreadsheet =>
      createSheet({
        title: 'People',
        spreadsheet: spreadsheet.data,
      }).then(sheet =>
        addValues({
          spreadsheet: spreadsheet.data,
          sheet: sheet.data.replies[0].addSheet.properties,
          values,
        })
      )
    )
    .catch(console.error);
});
*/

module.exports = {
  init,
  createSheet,
  addValues,
  createSpreadsheet,
  getSpreadsheet,
  clearSheet,
};
