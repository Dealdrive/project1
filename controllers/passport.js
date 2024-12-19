const passport = require("passport");

const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("../models/User");

// Configure the Google strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // If the user does not exist, create a new user
          user = new User({
            googleId: profile.id,
            userName: profile.displayName,
            email: profile.emails[0].value,
            picture: profile.photos[0].value,
          });

          await user.save();
        }
        // Pass the user object to the next middleware
        done(null, user);
      } catch (err) {
        done(err, false);
      }
    }
  )
);

// Serialize the user to store in the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize the user from the session
passport.deserializeUser((user, done) => {
  done(null, user);
});
