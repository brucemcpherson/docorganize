## Credentials

You'll need your own private folder to store credentials

My structure is (not included in the repo)

- private/creds/ -> service account json files downloaded from cloud console
- private/visecrets.js -> various parameters

You can organize it however you normally deal with secrets, but mine is like this.

```
module.exports = (function(ns) {
  ns.sheets = {
    lv: {
      spreadsheetId: '1exxxxxxxxxxxx8',
      subject: 'bruce@mcpher.com',
      serviceAccountFile: './creds/xxxxxxxxxxxxxxx.json',
    },
    pv: {
      spreadsheetId: '1xxxxxxxxxxxxxxxxx8',
      subject: 'fid@mcpher.com',
      serviceAccountFile: './creds/xxxxxxxxxx.json',
    },
    kp: {
      spreadsheetId: '1xxxxxxxxxxxxxxxxxx8',
      subject: 'fid@mcpher.com',
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
```

### Service account impersonation

One of the steps here is to create a sheet of the results. To use the Sheets API you'll need to impersonate a user with approriate credentials and project settings. If you are doing the sheets part, you'll need to read http://ramblings.mcpher.com/Home/excelquirks/vuejs-and-apollo-graphql/google-cloud-platform/sheesapiimpersonate to see exactly how.

## RunMode

You'll see this mentioned in various places. This is so I can use different secrets for prod/dev etc and it maps to various properties in the visecrets file
