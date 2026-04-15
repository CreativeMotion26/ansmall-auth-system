// In-memory user "database" for demo use only.
// Each user: { id: number, email: string, passwordHash: string }
// NOTE: Passwords should always be hashed, NEVER store plaintext passwords.

let nextId = 1;
const users = [];

/**
 * Returns a user by email.
 * @param {string} email
 * @returns {object|null}
 */
export function findUserByEmail(email) {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Returns a user by id.
 * @param {number} id
 * @returns {object|null}
 */
export function findUserById(id) {
  return users.find((u) => u.id === id) || null;
}

/**
 * Create and add a new user.
 * @param {string} email
 * @param {string} passwordHash
 * @returns {object} user
 */
export function createUser(email, passwordHash) {
  const user = {
    id: nextId++,
    email,
    passwordHash,
  };
  users.push(user);
  return user;
}

/**
 * Get all users (for debug/testing only)
 */
export function getAllUsers() {
  return users.slice();
}