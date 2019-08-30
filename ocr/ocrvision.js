const secrets = require('../private/visecrets');
const vision = require('@google-cloud/vision').v1;

// does the vision annotation
let client = null;
const init = ({ mode }) => {
  client =  new vision.ImageAnnotatorClient({
    credentials: secrets.getGcpCreds({mode}).credentials,
  });
};
const start = async ({gcsSourceUri, gcsContentUri}) => {
  const inputConfig = {
    mimeType: 'application/pdf',
    gcsSource: {
      uri: gcsSourceUri,
    },
  };
  const outputConfig = {
    gcsDestination: {
      uri: gcsContentUri
    },
  };
  const features = [{type: 'DOCUMENT_TEXT_DETECTION'}];
  const request = {
    requests: [
      {
        inputConfig: inputConfig,
        features: features,
        outputConfig: outputConfig,
      },
    ]
  };
  // OCR it
  console.log('starting ', features, ' on ', inputConfig, ' to ', outputConfig);
  const [operation] = await client.asyncBatchAnnotateFiles(request);
  const [filesResponse] = await operation.promise();
  const destinationUri =
    filesResponse.responses[0].outputConfig.gcsDestination.uri;
  return filesResponse;

};


module.exports = {
  init,
  start
};
