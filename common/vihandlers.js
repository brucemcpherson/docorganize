const {getGcpCreds, clues} = require('../private/visecrets');
const PhoneNumber = require('awesome-phonenumber');
const parseFullName = require('parse-full-name').parseFullName;
const validator = require('email-validator');
const Fuse = require('fuse.js');

// constructs the various common file names for processing in various stages
const getPaths = ({mode, pathName}) => {
  const {bucketName} = getGcpCreds({mode});
  const gcsSourceUri = `gs://${bucketName}/${pathName}`;
  // this is the folder that the interpreted json files will go - there may be more than 1
  const gcsContentUri = gcsSourceUri + '-vision/text/';
  // this is where the final analyis json is
  const gcsDataUri = gcsSourceUri + '-vision/data/entity-analysis.json';
  const gcsCoupleUri = gcsSourceUri + '-vision/data/entity-coupled.json';
  return {
    gcsDataUri,
    gcsSourceUri,
    gcsContentUri,
    gcsCoupleUri,
    pathName,
    mode,
    bucketName,
  };
};

/**
 *
 * @param {string} text the phone number to check
 * @param {string} defaultCountry the country (eg US, GB) when none supplied
 * @return {object} stuff about the phonenumber
 */
const checkPhoneNumber = ({text, defaultCountry}) => {
  const pn = new PhoneNumber(text, defaultCountry);
  return {...pn.toJSON(), confidence: 1};
};

// a phrase with too many parts is not going to be what you need it to be
const checkParts = ({text, maxParts}) => {
  const parts = text.split(' ');
  return (text || '').split(' ').length <= maxParts;
};

// this checks if an item is a fuzzy match to a pre-setup list
const checkFuse = ({text, fuse, fuseType, maxScore}) => {
  // if there are are too many parts then its probably not a profession
  const searches =
    checkParts({text, maxParts: clues.maxParts[fuseType]}) &&
    fuse.search(text || '').filter(f => f.score < maxScore);
  const valid = searches && searches.length > 0;

  if (valid) {
    // console.log(fuseType, text, searches[0]);
  }

  const result = {
    text,
    valid,
    confidence: valid ? 1 - searches[0].score : 1,
    searches,
  };

  return result;
};

// check if text is a known profession
const checkProfession = ({text, fuseProfession}) =>
  checkFuse({
    text,
    fuse: fuseProfession,
    fuseType: 'profession',
    maxScore: 0.02,
  });
const checkCompany = ({text, fuseCompany}) =>
  checkFuse({text, fuse: fuseCompany, fuseType: 'company', maxScore: 0.01});

// check if text is a valid date
const checkDate = ({text}) => {
  const d = new Date(text);
  valid = !isNaN(d);
  return {
    text,
    valid,
    iso: valid && d.toISOString(),
  };
};

/**
 * deconstruct a potential person name
 * @param {string} text the name  to check
 * @return {object} stuff about the name (
 *
 */
const checkPersonName = ({text}) => {
  // theres a bug in the library that thows an error occassionally so just try/catch it
  try {
    return text && parseFullName(text.toString(), 'all', 1);
  } catch (err) {
    return {
      error: [err],
    };
  }
};

// check and deconstruct a person name and rearrange into parts
const joinPersonName = ({text}) => {
  const pieces =
    checkParts({text, maxParts: clues.maxParts.person}) &&
    checkPersonName({text});
  const error = pieces && pieces.error && pieces.error.length && pieces.error;
  const valid = pieces && !error;
  const likely = !!(valid && pieces.first && pieces.last && !text.match(/\d/));
  const result = {
    confidence:
      ((pieces.title && 0.1) || 0) +
      ((likely && 0.4) || 0) +
      ((pieces.suffix && 0.1) || 0),
    pieces,
    error,
    text,
    likely,
    valid,
    joined: valid
      ? [
          pieces.title,
          pieces.first,
          pieces.middle,
          pieces.last,
          pieces.suffix,
          pieces.nick,
        ]
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      : '',
  };
  return result;
};

// check if a valid email address
const checkEmail = ({text}) => ({
  valid: validator.validate(text),
  text,
  confidence: 1,
});

// figure out the most common content types in each column - useful as a tie breaker
const attachColumnTypes = ({assignedMids}) => {
  return Array.from(
    Array(assignedMids.reduce((p, c) => Math.max(c.columnNumber + 1, p), 0))
  )
    .map(f => [])
    .map((header, columnNumber) => {
      assignedMids
        .filter(cell => cell.columnNumber === columnNumber)
        .forEach(cell => {
          const entityType = cell.entity && cell.entity.type;
          if (entityType) {
            let type = header.find(t => t.type === entityType);
            if (!type) {
              type = {
                type: entityType,
                count: 0,
              };
              header.push(type);
            }
            type.count++;
          }
        });
      return header;
    });
};

// create a unique key for a paragraph
const paraDigest = ({sourceLocation}) =>
  `p-${sourceLocation.pageIndex}-${sourceLocation.blockIndex}-${
    sourceLocation.paragraphIndex
  }`;

// this groups cells by their original paragraph
const paraCells = ({cells}) =>
  cells.reduce((p, cell) => {
    const key = paraDigest(cell);
    if (!p[key]) {
      p[key] = {
        cells: [],
        types: [],
        key,
      };
    }
    p[key].cells.push(cell);
    return p;
  }, {});

/*
 * - bonuses
 * mobile phone type to boost over regular phone type
 * presence of a kg entry
 * exact match to an embellished text (TODO)
 *
 * - low scores
 * entity type matches  -these tend to be inaccurate
 * pass personname syntax check
 *
 * - middle scores
 * knowledge graph type matches
 *
 * - high scores
 * profession matches
 * company matches
 * known people matches (TODO)
 * address matches (TODO)
 *
 * - extra high scores
 * exact date formats
 * exact email formats
 * exact phone formats
 *
 */

// add scores attributable to the knowledge graph info
const addScoresForKg = ({scores, type, weight}) =>
  cumScores({scores, addScores: getScoresForKg({type, weight})});

// add scores from clues such as phone numbers. professions etc
const addScoresForClues = ({weight, cell}) =>
  cumScores({
    scores: cell.scores,
    addScores: getScoresForClues({cell, weight}),
  });

// add scoresderived from the natural language entity type
const addScoresForType = ({scores, type, weight}) =>
  cumScores({scores, addScores: getScoresForType({type, weight})});

// general to add like scores together
const cumScores = ({scores, addScores}) => {
  Object.keys(addScores).forEach(k => {
    scores[k] = scores[k] || 0;
    scores[k] += addScores[k];
  });
  return scores;
};

// entity type from natural language api
// these are fairly innacurate, so will get a lowish score
// possible values amd what they imply
// PERSON	-> profession, person
// LOCATION -> address
// ORGANIZATION -> company
// EVENT -> ignore
// WORK_OF_ART -> ignore
// CONSUMER_GOOD -> ignore
// OTHER -> ignore
// PHONE_NUMBER -> phone, mobile
// ADDRESS -> address
// DATE -> date
// NUMBER -> ignore
// PRICE -> ignore
const getScoresForType = ({type, weight}) => ({
  person: weight * clues.scores.person * (type === 'PERSON' ? 1 : 0),
  // a profession looks like a person entity but will score a little less
  profession: weight * clues.scores.profession * (type === 'PERSON' ? 0.9 : 0),
  address:
    weight *
    clues.scores.address *
    (type === 'LOCATION' ? 0.5 : type === 'ADDRESS' ? 1 : 0),
  phone: weight * clues.scores.phone * (type === 'PHONE_NUMBER' ? 1 : 0),
  email: weight * clues.scores.email * 0,
  mobile: weight * clues.scores.mobile * (type === 'PHONE_NUMBER' ? 1 : 0),
  company: weight * clues.scores.company * (type === 'ORGANIZATION' ? 1 : 0),
  date: weight * clues.scores.date * (type === 'DATE' ? 1 : 0),
});

// sometimes things can be imputed from the actual text
const getScoresForClues = ({cell, weight}) => {
  const {clues} = cell;
  const {company, person, profession, email, phone, mobile, date: dt} = clues;
  return {
    person: weight * (person ? person.confidence : 0),
    // give a slight boost to profession so it wins over companies with same name
    profession: weight * (profession ? profession.confidence * 1.1 : 0),
    address: weight * 0,
    // this gives a slight boost tomobile so it wins over phone
    mobile: weight * (mobile ? mobile.confidence * 1.1 : 0),
    phone: weight * (phone ? phone.confidence : 0),
    email: weight * (email ? email.confidence : 0),
    company: weight * (company ? company.confidence : 0),
    date: weight * (dt ? dt.confidence : 0),
  };
};

// filter where one list item belongs in another
const getTypeMatches = ({type, target}) =>
  type.map(f => target.indexOf(f)).filter(f => f !== -1);

// computes a score -- number of matches out of a total
const getTypeMatchScore = ({matches, target}) =>
  target.length ? matches.length / target.length : 0;

// find which types match and assign a score for the number that do
const getWeightedMatch = ({target, type, weight}) =>
  getTypeMatchScore({matches: getTypeMatches({type, target}), target}) * weight;

// calculate scores based on data found in knowledge graph
const getScoresForKg = ({type, weight}) => {
  if (!type) {
    return {};
  }

  const score = {
    person: getWeightedMatch({target: ['Person'], type, weight}),
    profession: getWeightedMatch({target: ['__', 'Person'], type, weight}),
    company: getWeightedMatch({
      target: ['Organization', 'Corporation'],
      type,
      weight,
    }),
    address: getWeightedMatch({
      target: ['City', 'Country', 'AdministrativeArea', 'Place'],
      type,
      weight,
    }),
  };

  return score;
};

// make a fuzzy match lookup object to compare against professions
const getFuseProfession = ({professionLookups}) =>
  new Fuse(professionLookups, {
    keys: ['name', 'shorts'],
    shouldSort: true,
    includeScore: true,
    tokenize: false,
    threshold: 0.2,
    location: 0,
    minMatchCharLength: 4,
    distance: 10,
  });

// make a fuzzy match lookup object to compare against companies
const getFuseCompany = ({companyLookups}) =>
  new Fuse(companyLookups, {
    keys: ['name', 'shorts'],
    shouldSort: true,
    includeScore: true,
    tokenize: true,
    threshold: 0.4,
    location: 0,
    minMatchCharLength: 6,
    distance: 10,
  });
// make a grid of associated roles
const makeRoles = ({cells}) => {
  return cells.reduce((p, cell) => {
    // arrange into cell id references -this is person oriented
    if (cell.likely && cell.likely.name === 'person') {
      const target = {
        id: cell.id,
        roles: {
          person: cell,
        },
      };
      p.push(target);
      Object.keys(cell.allocated || {}).forEach(k => {
        const id = cell.allocated[k];
        const aob = cells.find(f => f.id === id);
        if (!aob) {
          console.error(
            'couldnt find matching cell',
            id,
            ' for ',
            cell.id,
            ' in ',
            cell.allocated
          );
        } else {
          target.roles[k] = aob;
        }
      });
    }
    return p;
  }, []);
};

// indictae which direction we are looking through cells in
const directionOfTravel = ({source, target}) => ({
  right: source.columnNumber < target.columnNumber,
  left: source.columnNumber > target.columnNumber,
  up: source.rowNumber < target.rowNumber,
  down: source.rowNumber > target.rowNumber,
});

// indicate whether this way is blocked
const directionBlocked = ({direction, blocked}) =>
  ['up', 'down', 'left', 'right'].reduce(
    (p, c) => p || (direction[c] && blocked[c]),
    false
  );

// used to set block properties when we hit an obstacle
const setBlocked = ({direction, blocked}) =>
  Object.keys(direction).reduce((p, c) => {
    p[c] = p[c] || direction[c];
    return p;
  }, blocked);

/**
 * couple the cells with others - eg person with profession
 * this fnds the nearest matching unused potential coupling item
 */
const coupleCells = ({assignedMids}) => {
  const {minScore} = clues;

  // first decide on the most likely roll of a cell
  // TODO - we could improve this algorithm by recursing to non 1st choices
  // right now it relies on first time accuracy of cell type assignments
  assignedMids.forEach(cell => {
    const {scores} = cell;
    cell.likely =
      scores &&
      Object.keys(scores).reduce((s, t) => {
        const score = scores[t];
        return score > minScore && (!s || score > s.score) && cell.clues[t]
          ? {
              score,
              name: t,
            }
          : s;
      }, null);
    // once decided, we can use the chosen type embellished text for this cell
    cell.embellished =
      (cell.likely && cell.clues[cell.likely.name].embellished) || '---';
  });

  // would like to associate each of these with a person
  const personGroup = ['profession', 'phone', 'mobile', 'email','company'];

  // base decisions around people to start with, and start with those people that are the most definite.
  const personCells = assignedMids
    .filter(cell => cell.likely && cell.likely.name === 'person')
    .sort((a, b) => b.likely.score - a.likely.score);

  // find the nearest profession
  personCells.forEach(personCell => {
    // collect all potential cells (with a row of the target) and sort them starting with the closest
    // this is set to work with items on the same row (horizontally) or in the same paragraph (vertically)
    const consider = assignedMids
      .filter(
        f =>
          personCell.id !== f.id &&
          f.likely &&
          (f.rowNumber === personCell.rowNumber ||
            paraDigest(f) === paraDigest(personCell))
      )
      .map(f => ({
        cell: f,
        distance:
          Math.abs(f.rowNumber - personCell.rowNumber) * 100 +
          Math.abs(f.columnNumber - personCell.columnNumber),
      }))
      .sort((a, b) => a.distance - b.distance)
      .map(f => {
        // need to keep track of who is allocated to this cell
        f.cell.allocated = f.cell.allocated || {};
        return f.cell;
      });

    // this is used to keep track of which items have been allocated to this cell
    personCell.allocated = {};

    // now keep looking at nearest cell till we hit a cell  already allocated to a person or another personcell
    consider.reduce(
      (pt, cell) => {
        const {name} = cell.likely;
        // if we haven't already satisfied this cell for this type
        if (!personCell.allocated[name]) {
          // calculated by comparing the row.column of source/target
          const direction = directionOfTravel({
            source: personCell,
            target: cell,
          });

          // hitting another person means we are done in this direction for any kind of allocation
          // as whatever follows should belong to the this new person
          if (name === 'person' || cell.allocated.person) {
            Object.keys(pt).forEach(
              k => (pt[k] = setBlocked({direction, blocked: pt[k]}))
            );
          } else if (
            personGroup.indexOf(name) !== -1 &&
            !directionBlocked({direction, blocked: pt[name]})
          ) {
            // grab it
            console.debug(
              'assigning ',
              name,
              cell.cleanText,
              'to ',
              personCell.cleanText
            );
            personCell.allocated[name] = cell.id;
            cell.allocated.person = personCell.id;
            // prevent any further looking in this direction
            pt[name] = setBlocked({direction, blocked: pt[name]});
          }
        }
        return pt;
      },
      // start reduce loop with no direction blocking
      personGroup.reduce((p, c) => {
        p[c] = {right: false, left: false, up: false, down: false};
        return p;
      }, {}),
      {}
    );
  });
};
// figure out the most  content types in each paragraph
// final return types we are looking for are person, profession, address, phone, mobile, email, company
const attachCellContentType = ({paragraphs}) => {
  Object.keys(paragraphs).map(k => {
    const para = paragraphs[k];
    const {topType} = para;
    para.cells.forEach(cell => {
      // general scores for this paragraph
      cell.scores = getScoresForType({
        type: topType && topType.type,
        weight: clues.weights.types,
      });
      // scores for the vision type detected for this cell
      addScoresForType({
        scores: cell.scores,
        type: cell.entity && cell.entity.type,
        weight: clues.weights.entityTypes,
      });
      // info from knowledge graph
      addScoresForKg({
        scores: cell.scores,
        type: cell.kg && cell.kg['@type'],
        weight: clues.weights.kgs,
      });
      addScoresForClues({
        weight: clues.weights.clues,
        cell,
      });
    });
  });
  return paragraphs;
};

// figure out the most  content types in each paragraph
const attachParagraphTypes = ({assignedMids}) => {
  // make a list of which paragraphs exist
  const paragraphs = paraCells({cells: assignedMids});

  // find out what they mainly are
  Object.keys(paragraphs).forEach(k => {
    const para = paragraphs[k];
    para.cells.forEach(cell => {
      const {entity} = cell;
      const entityType = entity && entity.type;
      if (entityType) {
        let type = para.types.find(t => t.type === entityType);
        if (!type) {
          type = {
            type: entityType,
            count: 0,
          };
          para.types.push(type);
        }
        type.count++;
        // give it a boost if there's supporting info
        if (entity.kg) type.count += Object.keys(entity.kg).length * 0.05;
        if (entity.metadata)
          type.count += Object.keys(entity.metadata).length * 0.05;
      }
    });
  });
  // sort them by popularity
  Object.keys(paragraphs).forEach(k => {
    const para = paragraphs[k];
    para.types.sort((a, b) => b.count - a.count);
    para.topType = para.types[0];
  });
  // done
  return paragraphs;
};
module.exports = {
  getPaths,
  attachColumnTypes,
  attachParagraphTypes,
  attachCellContentType,
  checkPhoneNumber,
  checkProfession,
  checkPersonName,
  checkCompany,
  joinPersonName,
  checkEmail,
  getFuseProfession,
  getFuseCompany,
  checkDate,
  coupleCells,
  makeRoles,
};
