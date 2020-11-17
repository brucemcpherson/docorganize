# Organizing and interpreting google vision text annotation

This uses a bunch of apis to go from an image to a sheet

## Credentials

You'll need your own private folder to store credentials

My structure is (not included in the repo)

- private/creds/ -> service account json files downloaded from cloud console
- private/visecrets.js -> various parameters

You can organize it however you normally deal with secrets, but mine is like this.

````javascript
module.exports = (function(ns) {
  ns.sheets = {
    lv: {
      spreadsheetId: '1exxxxxxxxxxxx8',
      subject: 'xxx@example.com',
      serviceAccountFile: './creds/xxxxxxxxxxxxxxx.json',
    },
    pv: {
      spreadsheetId: '1xxxxxxxxxxxxxxxxx8',
      subject: 'xxx@example.com',
      serviceAccountFile: './creds/xxxxxxxxxx.json',
    },
    kp: {
      spreadsheetId: '1xxxxxxxxxxxxxxxxxx8',
      subject: 'xxx@example.com',
      serviceAccountFile: './creds/xxxxxxxxxxxx.json',
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  };

  ns.profile = {
    language: {
      version: '0.0.0.1',
      released: new Date(2019, 7, 2),
    },
  };

  ns.storage = {
    kp: {
      serviceAccountFile: './creds/xxxxxxxxxxxxx.json',
      apiKey: 'Axxxxxxxxxxxxxxxxxxx8',
      bucketName: 'fxxxxxxxxxxs',
    },
    pv: {
      serviceAccountFile: './creds/xxxxxxxxxxxxxxx.json',
      apiKey: 'Axxxxxxxxxxxxxxx8',
      bucketName: 'fxxxxxxxxxxxxxxxs',
    },
    lv: {
      serviceAccountFile: './creds/xxxxxxxxxxxxxxxxxx.json',
      apiKey: 'Axxxxxxxxxxxxxxx8',
      bucketName: 'fxxxxxxxxxxxxxxs',
    },
  };

  ns.getSheetScopes = () => ns.sheets.scopes;
  ns.getKgScopes = () => ns.sheets.scopes;
  ns.getSheetSpreadsheetId = ({mode}) => ns.sheets[mode].spreadsheetId;
  ns.getSheetSubject = ({mode}) => ns.sheets[mode].subject;
  ns.getSheetCredsFile = ({mode}) => ns.sheets[mode].serviceAccountFile;

  ns.getGcpCreds = ({mode}) => {
    return {
      ...ns.storage[mode],
      credentials: require(ns.storage[mode].serviceAccountFile),
    };
  };
  ns.getSheetCreds = ({mode}) => {
    return {
      credentials: require(ns.getSheetCredsFile({mode})),
    };
  };

  return ns;
})({});
````

### Service account impersonation

One of the steps here is to create a sheet of the results. To use the Sheets API you'll need to impersonate a user with approriate credentials and project settings. If you are doing the sheets part, you'll need to read <https://ramblings.mcpher.com/google-cloud-platform/service-account-impersonation-for-google-apis-with-nodejs-client/> to see exactly how.

## RunMode

You'll see this mentioned in various places. This is so I can use different secrets for prod/dev etc and it maps to various properties in the visecrets file

## Starting

- Use yarn or npm to install package.json dependencies
- Sort out cloud console project, get creds and set up visecrets
- load a pdf file to cloud storage

To ocr and analyze - put the storage path name in languageorchestrate

````bash
yarn start
````

To write the result to sheets - put the storage path name in sheetsorchestrate

````bash
yarn tosheets
````
