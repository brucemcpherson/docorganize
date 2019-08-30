const gql = require('graphql-tag');
const Ml_names = gql`
  query Ml_names(
    $limit: Int
    $offset: Int
    $value: Value = "People"
    $valueKey: String = "type"
  ) {
    Ml_names(
      limit: $limit
      valueKey: $valueKey
      value: $value
      offset: $offset
    ) {
      id
      name
      Profession {
        id
        ProfessionLocalized {
          id
          name
        }
      }
    }
  }
`;
const CompanyNames = gql`
  query CompanyNames(
    $limit: Int
    $offset: Int
    $value: Value
    $valueKey: String
  ) {
    CompanyNames(
      limit: $limit
      valueKey: $valueKey
      value: $value
      offset: $offset
    ) {
      id
      name
      abbreviatedName
      localName
      localAbbreviatedName
      companyID
    }
  }
`;
const ProfessionsMl = gql`
  query Professions(
    $limit: Int
    $offset: Int
    $value: Value
    $valueKey: String
  ) {
    Professions(
      limit: $limit
      valueKey: $valueKey
      value: $value
      offset: $offset
    ) {
      id
      ProfessionLocalized {
        name
      }
      Ml_names {
        name
        srp_id
        type
      }
    }
  }
`;

module.exports = {
  Ml_names,
  ProfessionsMl,
  CompanyNames
};
