const passport = require("passport");
const googleAuth = require("express").Router();

// Route to initiate Google OAuth
googleAuth.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Route for Google callback
googleAuth.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Optional: Pass user data (e.g., userId or a token) as query params
    const userId = req.user._id;

    res.redirect(`${frontendUrl}/?userId=${userId}`);
  }
);

// Route to logout
googleAuth.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

// Protected route example (only accessible when authenticated)
googleAuth.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    // Redirect to frontend dashboard with user information (e.g., displayName, userId)
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Pass user information as query parameters (optional)
    const userId = req.user._id;
    // const userName = req.user.userName || req.user.displayName; // Choose what to send
    res.redirect(
      `${frontendUrl}/?userId=${userId}&userName=${encodeURIComponent(
        userName
      )}`
    );
  } else {
    // If not authenticated, redirect to frontend login page
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/login`);
  }
});

module.exports = googleAuth;
