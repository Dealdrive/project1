const jwt = require('jsonwebtoken');

const { TOKEN_KEY } = process.env;

// Middleware to authenticate admin requests
const authenticateAdmin = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    const token = req.headers.authorization.split(' ')[1];

    // Check if token is missing
    if (!token) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }
    const decoded = jwt.verify(token, TOKEN_KEY);

    req.userData = { userId: decoded.userId };
    console.log(req.userData);

    // Check if user is an admin
    if (!decoded.admin) {
      return res.status(403).json({ message: 'Access denied: Not an admin' });
    }

    console.log(decoded);

    // If user is admin, set user data on request object
    req.admin = decoded;
    console.log(decoded);
    // Move to the next middleware
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { authenticateAdmin };
