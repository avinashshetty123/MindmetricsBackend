import express from "express";
import axios from "axios";
import passport from "passport";
import refreshAccessToken from "../utils/refreshAccessToken.js"; // Import only once

const router = express.Router();

// ✅ Middleware to Check Authentication
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized access. Please log in." });
};

// ✅ Google OAuth Routes
router.get("/auth/google", passport.authenticate("google"));

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "https://mindmetricss.netlify.app/sign" }),
  (req, res) => {
    req.login(req.user, (err) => {
      if (err) {
        console.error("Login Error:", err);
        return res.redirect("https://mindmetricss.netlify.app/sign");
      }
      console.log("✅ User Logged In:", req.user);
      req.session.save((err) => {
        if (err) {
          console.error("Session Save Error:", err);
        }
        res.redirect("https://mindmetricss.netlify.app/home");
      });
    });
  }
);

// ✅ Logout Route
router.get("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    req.session.destroy();
    res.send({ message: "Logged out successfully" });
  });
});

// ✅ Check Session
router.get("/auth/session", (req, res) => {
  console.log("Session ID:", req.sessionID);
  console.log("Session Data:", req.session);
  res.json({ authenticated: req.isAuthenticated(), user: req.user || null });
});

// ✅ Fetch Google Fit Steps
router.get("/api/steps", isAuthenticated, async (req, res) => {
  try {
    let user = req.user;
    if (!user?.accessToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 🔄 Refresh access token if needed
    const validAccessToken = await refreshAccessToken(user) || user.accessToken;

    const response = await axios.post(
      "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
      {
        aggregateBy: [
          {
            dataTypeName: "com.google.step_count.delta",
            dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:merge_step_deltas",
          },
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: Date.now() - 86400000,
        endTimeMillis: Date.now(),
      },
      {
        headers: { Authorization: `Bearer ${validAccessToken}` },
      }
    );

    let totalSteps = 0;
    response.data?.bucket?.forEach((bucket) => {
      bucket.dataset?.forEach((dataset) => {
        dataset.point?.forEach((point) => {
          point.value?.forEach((val) => {
            totalSteps += val.intVal || 0;
          });
        });
      });
    });

    res.json({ steps: totalSteps });
  } catch (error) {
    console.error("❗ Error fetching step count data:", error?.response?.data || error.message);
    res.status(500).json({ error: error?.response?.data?.error?.message || "Failed to fetch step data" });
  }
});

// ✅ Fetch Google Fit Heart Rate
router.get("/api/heart-rate", isAuthenticated, async (req, res) => {
  try {
    let user = req.user;
    if (!user?.accessToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 🔄 Refresh access token if needed
    const validAccessToken = await refreshAccessToken(user) || user.accessToken;

    const response = await axios.post(
      "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
      {
        aggregateBy: [{ dataTypeName: "com.google.heart_rate.bpm" }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: Date.now() - 86400000,
        endTimeMillis: Date.now(),
      },
      {
        headers: { Authorization: `Bearer ${validAccessToken}` },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("❗ Error fetching heart rate data:", error?.response?.data || error.message);
    res.status(500).json({ error: error?.response?.data?.error?.message || "Failed to fetch heart rate data" });
  }
});

// ✅ Fetch User Info
router.get("/api/user-info", isAuthenticated, async (req, res) => {
  try {
    let user = req.user;
    if (!user?.accessToken) return res.status(401).json({ error: "Unauthorized" });

    const validAccessToken = await refreshAccessToken(user) || user.accessToken;

    const response = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${validAccessToken}` },
    });

    res.json(response.data);
  } catch (error) {
    console.error("❗ Error fetching user info:", error);
    res.status(500).json({ error: "Failed to fetch user info" });
  }
});

// ✅ Navigation Routes (Protected)
const navItems = [
  { name: "Home", path: "/home" },
  { name: "Recipes", path: "/recipes" },
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact" },
];

router.get("/home", isAuthenticated, (req, res) => {
  res.json({ message: "Welcome to Home Page", user: req.user, navItems });
});

router.get("/recipes", isAuthenticated, (req, res) => {
  res.json({ message: "Welcome to the Recipes Page", recipes: [] });
});

router.get("/about", isAuthenticated, (req, res) => {
  res.json({ message: "About Us Page", description: "Learn more about us!" });
});

router.get("/contact", isAuthenticated, (req, res) => {
  res.json({ message: "Contact Us", email: "avinashshetty4455@example.com" });
});

export default router;
