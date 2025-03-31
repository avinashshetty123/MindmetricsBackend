import passport from "passport";
import session from "express-session";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";

dotenv.config();

const setupAuth = (app) => {
  app.use(session({
    secret: process.env.SESSION_SECRET || "your_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure:true, // Secure only in production
      httpOnly: true,
      sameSite: "None",
    },
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "https://mindmetrics-backend.vercel.app/auth/google/callback",
        scope: [
          "profile",
          "email",
          "https://www.googleapis.com/auth/fitness.activity.read",
          "https://www.googleapis.com/auth/fitness.heart_rate.read",
        ],
      },
      async (accessToken, refreshToken, profile, done) => {
        profile.accessToken = accessToken;
        profile.refreshToken = refreshToken;
        return done(null, profile);
      }
    )
  );
  passport.serializeUser((user, done) => {
    console.log("🔎 Serializing User:", user.id || user);
    done(null, user);
  });
  
  passport.deserializeUser((user, done) => {
    console.log("🔎 Deserializing User:", user);
    done(null, user);
  });
};

export default setupAuth;