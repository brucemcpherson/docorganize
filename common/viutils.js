const joinCellTexts = ({cell}) =>
  cell.texts.reduce((p, h, i) => `${p}${h.text}${h.separator}`, '');

const isNumeric = n => !isNaN(parseFloat(n)) && isFinite(n);

const isInteger = n => isNumeric(n) && Number.isInteger(parseFloat(n));

const joinSymbols = ({word}) =>
  word.symbols
    .filter(h => h.text)
    .map(h => h.text)
    .join('');

module.exports = {
  joinCellTexts,
  isNumeric,
  isInteger,
  joinSymbols,
};
