const Storage = require('@google-cloud/storage').Storage;
const secrets = require('../private/visecrets');
var sts = require('string-to-stream');
const request = require('request');
const fs = require('fs');

const getStorage = ({mode}) => {
  console.debug('....getting creds for ', mode);
  const creds = secrets.getGcpCreds({mode});
  const {credentials, bucketName} = creds;
  const {projectId} = credentials;
  return {
    storage: new Storage({
      projectId,
      credentials,
    }),
    bucketName,
  };
};
/**
 * create the cloud storage stream
 * the credentials/bucket name and filename are in the secrets file
 * @param {string} name the filename to stream from
 */
const createStorageStream = async ({name, mode}) => {
  let {storage, bucketName} = getStorage({mode});
  // if this is a gs type name get bucketname from there
  if (name.slice(0, 5) === 'gs://') {
    bucketName = name.replace(/gs:\/\/([^\/]+).*/, '$1');
    name = name.replace('gs://' + bucketName + '/', '');
  }
  console.debug('....creating stream', name, ' in bucket ', bucketName);
  const bucket = storage.bucket(bucketName);
  // we'll actually be streaming to/from  this blob
  return bucket.file(name);
};
/**
 * get all the files in a folder
 */
const getFiles = async ({gcsUri, mode}) => {
  const {storage} = getStorage({mode});
  const bucketName = gcsUri.replace(/gs:\/\/([^\/]+).*/, '$1');
  const prefix = gcsUri
    .replace(/gs:\/\/[^\/]+\/(.*)/, '$1')
    .replace(/$/, '/')
    .replace(/\/\/$/, '/');
  const options = {
    prefix: prefix,
    delimiter: '/',
  };
  if (!bucketName || !prefix) {
    throw new error(gcsUri + ' is invalid');
  }
  console.log('....searching for files', bucketName, options);
  const bucket = storage.bucket(bucketName);
  [files] = await bucket.getFiles(options);
  return files;
};

const getFilesContents = ({gcsUri, mode}) =>
  getFiles({gcsUri, mode}).then(files =>
    Promise.all(
      files.map(f =>
        getContent({name: f.name, mode}).then(content => ({
          content,
          name: f.name,
        }))
      )
    )
  );

/**
 * convert a string or objects to a stream
 */
const streamContent = async ({name, content, mode}) => {
  let mimeType = '';
  if (typeof content === 'object') {
    content = JSON.stringify(content);
    mimeType = 'application/json';
  }

  const writeStream = await createWriteStream({name, mimeType, mode});
  return new Promise((resolve, reject) => {
    console.debug('....streaming ', mimeType, ' to ', name);
    sts(content)
      .pipe(writeStream)
      .on('finish', () => {
        resolve(name);
        console.debug('....uploaded to storage', name);
      });
  });
};

/**
 * get content from storage
 * @param {string} name the file to get
 */
const getContent = async ({name, mode}) => {
  const readStream = await createReadStream({name, mode});
  return new Promise((resolve, reject) => {
    let str = '';
    readStream.on('end', () => {
      try {
        resolve(JSON.parse(str));
      } catch (err) {
        resolve(content);
      }
    });
    readStream.on('error', err => reject(err));
    readStream.on('data', buf => (str += buf.toString()));
  });
};
/**
 * create the cloud storage stream
 * the credentials/bucket name and filename are in the secrets file
 * @param {string} name the filename to stream from
 */
const createWriteStream = async ({name, mimeType, mode}) => {
  const blob = await createStorageStream({name, mode});
  const options = {
    contentType: mimeType,
    resumable: false,
    validation: 'md5',
  };

  return blob.createWriteStream(options);
};
/**
 * create the cloud storage stream
 * the credentials/bucket name and filename are in the secrets file
 * @param {string} name the filename on cloud storage
 */
const createReadStream = async ({name, mode}) => {
  const blob = await createStorageStream({name, mode});
  const stream = blob.createReadStream();
  // this stream will be piped from
  return stream;
};

/**
 * stream video file direct from vimeo storage to google cloud storage
 * @param {string} url the file to stream
 * @param {stream} stream the stream to pipe it to
 * @param {stream} [mimeType] validate exprected mimeType
 */
const downloadFile = async ({url, stream, mimeType}) => {
  return new Promise((resolve, reject) => {
    // request the video files
    console.debug('requesting download from', url);

    // request(url)
    request
      .get(url)
      .on('error', err => reject(err))
      .on('response', response => {
        if (response.statusCode !== 200) {
          reject('unexpected status code:' + response.statusCode);
        }
        // if required, check mimetype is what was expected
        if (mimeType && response.headers['content-type'] !== mimeType) {
          reject(
            'expected:' + mimeType + ' got:' + response.headers['content-type']
          );
        }
      })
      .pipe(stream)
      .on('error', err => reject(err))
      .on('finish', () => resolve(url));
  });
};
module.exports = {
  createStorageStream,
  createWriteStream,
  streamContent,
  getContent,
  downloadFile,
  getFiles,
  getFilesContents,
};
