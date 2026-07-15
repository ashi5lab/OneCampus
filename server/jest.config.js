// These are integration tests against a real remote (Railway) Postgres
// instance, not fast in-memory unit tests — every login now does a SELECT
// + bcrypt.compare + an INSERT (issuing a refresh token), each a real
// network round trip. Jest's 5000ms default was tuned for unit tests and
// is too tight for this suite's actual latency profile. See tests/README.md.
module.exports = {
  testTimeout: 15000
};
