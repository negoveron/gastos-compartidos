'use strict';

const bcrypt = require('bcryptjs');

/**
 * Thin wrapper around bcryptjs. `rounds` defaults to 10 and is configurable
 * via `BCRYPT_ROUNDS` (passed down through config, not read from env here).
 *
 * @param {{ rounds?: number }} [options]
 */
function createPasswordHasher({ rounds = 10 } = {}) {
  return {
    async hash(password) {
      return bcrypt.hash(password, rounds);
    },
    async compare(password, hash) {
      return bcrypt.compare(password, hash);
    },
  };
}

module.exports = { createPasswordHasher };
