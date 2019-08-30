const ocrVision = require('./ocrvision');
const {getPaths} = require('../common/vihandlers');

// manages orchestration of vision api
const init = ({mode}) => {
  ocrVision.init({mode});
};

const start = async ({mode, argv}) => {
  // for convenience - there's a common way to get all the file names/paths
  // the bucket is specified in visecrets and the initial source path here
  const { path } = argv;
  const {gcsSourceUri, gcsContentUri} = getPaths({
    pathName: path,
    mode,
  });

  await ocrVision.start({
    gcsSourceUri,
    gcsContentUri,
  });
};

module.exports = {
  init,
  start,
};
