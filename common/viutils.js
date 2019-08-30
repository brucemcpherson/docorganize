const joinCellTexts = ({cell}) =>
  cell.texts.reduce((p, h, i) => `${p}${h.text}${h.separator}`, '');

const isNumeric = n => !isNaN(parseFloat(n)) && isFinite(n);

const isInteger = n => isNumeric(n) && Number.isInteger(parseFloat(n));

const joinSymbols = ({word}) =>
  word.symbols
    .filter(h => h.text)
    .map(h => h.text)
    .join('');

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

const dummyRows = ({cells}) =>
  Array(cells.reduce((p, c) => Math.max(c.rowNumber + 1, p), 0)).fill(f => '');

const findIndexReverse = (arr, func) => {
  for (var x = arr.length - 1; x >= 0 && !func(arr[x], x, arr); x--);
  return x;
};

module.exports = {
  joinCellTexts,
  isNumeric,
  isInteger,
  joinSymbols,
  till,
  columnLabelMaker,
  rangeMaker,
  dummyRows,
  findIndexReverse,
};
