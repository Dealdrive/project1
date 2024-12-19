const jwt = require('jsonwebtoken');
const HttpError = require('../models/http-error');

const checkAuth = (req, res, next) => {
  // Check if the request contains an authorization header with a valid JWT
  if (req.method === 'OPTIONS') {
    return next(); // Allow preflight requests to proceed without authentication
  }

  try {
    const token = req.headers.authorization.split(' ')[1]; // Authorization: 'Bearer <token>'
    if (!token) {
      throw new Error('Authentication failed!');
    }

    // Verify the token using the secret key
    const decodedToken = jwt.verify(token, 'supersecret_dont_share');

    // Attach the decoded user data to the request object
    req.userData = { userId: decodedToken.userId };

    next(); // Call the next middleware in the chain
  } catch (err) {
    const error = new HttpError('Authentication failed!', 401);
    return next(error); // Pass the error to the error handling middleware
  }
};

module.exports = checkAuth;
