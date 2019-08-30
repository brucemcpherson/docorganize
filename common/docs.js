const {google} = require('googleapis');
const {
  getSheetCreds,
  getSheetSubject,
  getDocScopes,
} = require('../private/visecrets');
const {till} = require('./viutils');

const mode = 'lv';
let docClient = null;

/**
 * returns an authorized sheet client
 */
const init = async ({mode}) => {
  const {credentials} = getSheetCreds({mode});

  // jwt includes account to impersonate
  const subject = getSheetSubject({mode});
  const auth = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    getDocScopes(),
    subject
  );

  // validate and authorize the jwt
  const {error} = await till(auth.authorize());
  if (!error) {
    console.log(
      `....service account ready to access docs on behalf of ${subject}`
    );
    docClient = google.docs({
      version: 'v1',
      auth,
    });
    return docClient;
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
  return docClient.spreadsheets.values.batchUpdate(request);
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
  return docClient.spreadsheets.values.clear({
    range,
    spreadsheetId,
  });
};

/*
 * get basic info on a spreadsheet
 */
const getSpreadsheet = ({spreadsheetId}) => {
  return docClient.spreadsheets.get({
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
  return docClient.spreadsheets.batchUpdate(request);
};
/*
 * create an empty document
 */
const createDocument = async ({title}) => {
  const request = {
    fields: 'documentId',
    resource: {
      title,
    },
  };
  console.log('...creating new document ', title);
  return docClient.documents.create(request);
};

module.exports = {
  init,
  createSheet,
  addValues,
  createDocument,
  getSpreadsheet,
  clearSheet,
};
