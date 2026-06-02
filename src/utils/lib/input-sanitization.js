import sanitize from 'mongo-sanitize';

/**
 * Sanitizes input to prevent NoSQL injection attacks
 * Use this for all user inputs before database queries
 * 
 * @param {any} input - The input to sanitize (object, string, array, etc.)
 * @returns {any} - Sanitized input
 * 
 * @example
 * const sanitizedUsername = sanitizeInput(req.body.username);
 * const sanitizedData = sanitizeInput(req.body);
 */
export function sanitizeInput(input) {
  if (input === null || input === undefined) {
    return input;
  }
  
  // Use mongo-sanitize for MongoDB-specific sanitization
  return sanitize(input);
}

/**
 * Validates and sanitizes a string input
 * 
 * @param {string} input - String to validate and sanitize
 * @param {Object} options - Validation options
 * @param {number} options.maxLength - Maximum length allowed
 * @param {number} options.minLength - Minimum length required
 * @param {RegExp} options.pattern - Regex pattern to match
 * @returns {string|null} - Sanitized string or null if invalid
 */
export function validateAndSanitizeString(input, options = {}) {
  if (typeof input !== 'string') {
    return null;
  }
  
  const sanitized = sanitizeInput(input.trim());
  
  if (options.minLength && sanitized.length < options.minLength) {
    return null;
  }
  
  if (options.maxLength && sanitized.length > options.maxLength) {
    return null;
  }
  
  if (options.pattern && !options.pattern.test(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Validates and sanitizes an email address
 * 
 * @param {string} email - Email to validate
 * @returns {string|null} - Sanitized email or null if invalid
 */
export function validateAndSanitizeEmail(email) {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return validateAndSanitizeString(email, {
    maxLength: 254, // RFC 5321
    pattern: emailPattern
  });
}

/**
 * Validates and sanitizes a username
 * 
 * @param {string} username - Username to validate
 * @returns {string|null} - Sanitized username or null if invalid
 */
export function validateAndSanitizeUsername(username) {
  // Allow alphanumeric, underscore, hyphen, 3-20 characters
  const usernamePattern = /^[a-zA-Z0-9_-]{3,20}$/;
  return validateAndSanitizeString(username, {
    minLength: 3,
    maxLength: 20,
    pattern: usernamePattern
  });
}

/**
 * Sanitizes MongoDB query parameters
 * Prevents NoSQL injection in find queries
 * 
 * @param {Object} query - MongoDB query object
 * @returns {Object} - Sanitized query object
 */
export function sanitizeQuery(query) {
  if (!query || typeof query !== 'object') {
    return {};
  }
  
  return sanitizeInput(query);
}

