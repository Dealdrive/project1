const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");

// const verifyUser = (req, res, next) => {
//   if (req.method === 'OPTIONS') {
//     return next();
//   }
//   try {
//     const token = req.headers.authorization.split(' ')[1];
//     if (!token) {
//       throw new Error('Authentication failed!');
//     }
//     const decodedToken = jwt.verify(token, 'supersecret_dont_share');
//     req.userData = { userId: decodedToken.userId };
//     next();
//   } catch (err) {
//     const error = new HttpError('Authentication failed!', 403);
//     return next(error);
//   }
// };

// const verifyUser = (req, res, next) => {
//   // Skip for OPTIONS method (CORS pre-flight requests)
//   if (req.method === "OPTIONS") {
//     return next();
//   }

//   try {
//     // 1. Check if the user is authenticated via Google OAuth (session-based authentication)
//     if (req.isAuthenticated && req.isAuthenticated()) {
//       // The user is authenticated via Google OAuth, proceed to next middleware
//       return next();
//     }

//     // 2. Check if the user is authenticated via JWT token (header-based authentication)
//     const token = req.headers.authorization?.split(" ")[1]; // Bearer TOKEN

//     if (!token) {
//       throw new Error("Authentication failed! No token provided.");
//     }

//     // Verify the JWT token
//     const decodedToken = jwt.verify(token, "supersecret_dont_share");
//     req.userData = { userId: decodedToken.userId };
//     next();
//   } catch (err) {
//     const error = new HttpError("Authentication failed!", 403);
//     return next(error);
//   }
// };

const verifyUser = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new Error("Authentication failed! No token provided.");
    }

    // Verify the JWT token
    const decodedToken = jwt.verify(token, "supersecret_dont_share");

    // Attach the user data (including role) to the request object
    req.userData = { userId: decodedToken.userId, role: decodedToken.role };

    next();
  } catch (err) {
    console.error("Error in verifyUser middleware:", err.message);
    const error = new HttpError("Authentication failed!", 403);
    return next(error);
  }
};

const checkAdmin = (req, res, next) => {
  try {
    // Ensure `req.userData` is present and contains the admin role
    if (!req.userData || req.userData.role !== "admin") {
      throw new Error("Access denied: Admins only.");
    }
    next();
  } catch (err) {
    console.error("Error in checkAdmin middleware:", err.message);
    const error = new HttpError("Access denied: Admins only.", 403);
    return next(error);
  }
};

const isAuthenticated = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      // Verify the JWT token
      const decodedToken = jwt.verify(token, "supersecret_dont_share");

      // Attach user data to the request
      req.userData = { userId: decodedToken.userId, role: decodedToken.role };
    }

    next();
  } catch (err) {
    console.error("Error in verifyUser middleware:", err.message);
    next();
  }
};

module.exports = {
  verifyUser,
  checkAdmin,
  isAuthenticated,
};
