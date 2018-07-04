const options = {
  // initialization options;
};
const pgp = require("pg-promise")(options);

const connection = {
  host: "ec2-54-243-63-13.compute-1.amazonaws.com",
  user: "unwzsfdqhpohef",
  password: "e95f2b0400ed20c9c6753fc26627af7db8803524c2f0c2ffa5c5ae1bed34706f",
  database: "d2t59hbqkikfu4",
  port: 5432,
  ssl: true
};

const db = pgp(connection);

module.exports = db;