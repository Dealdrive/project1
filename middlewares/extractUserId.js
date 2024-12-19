const jwt = require('jsonwebtoken');

const extractUserId = (req, res, next) => {
  // Get the token from the request header
  const token = req.headers.authorization;

  // Log the received token
  console.log('Received token:', token);

  // Check if token is present
  if (!token) {
    console.error('Unauthorized: No token provided');
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  // Verify and decode the token
  jwt.verify(token, 'your-secret-key', (err, decoded) => {
    if (err) {
      // Log the error
      console.error('Unauthorized: Invalid token:', err);
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    // Extract user ID from the decoded token
    req.user = decoded.user;
    next();
  });
};

module.exports = extractUserId;
