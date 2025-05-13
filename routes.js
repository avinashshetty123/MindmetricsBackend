import express from "express";
import axios from "axios";
import passport from "passport";
import fs from "fs";
import ort from "onnxruntime-node";
import { parseData } from "./parsedata.js";
import refreshAccessToken from "./refreshAccessToken.js"; // Import only once

const router = express.Router();
const scalerData = JSON.parse(fs.readFileSync("./scaler.json", "utf-8"));
const labelEncoder = JSON.parse(fs.readFileSync("./labels.json", "utf-8"));
let session;
ort.InferenceSession.create("./rf_model.onnx").then((s) => {
  session = s;
}).catch((err) => {
  console.error("❌ Failed to load ONNX model:", err);
});

// ✅ Middleware to Check Authentication
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
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
        if (err) console.error("Session Save Error:", err);
        res.redirect("https://mindmetricss.netlify.app/home");
      });
    });
  }
);

// ✅ Logout Route
// ✅ Logout Route (Clean & Neat)
router.get("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout Error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Session Destroy Error:", err);
        return res.status(500).json({ error: "Failed to destroy session" });
      }

      res.clearCookie("connect.sid"); // Optional: clears the session cookie
      res.redirect("https://mindmetricss.netlify.app/sign");
    });
  });
});

// ✅ Check Session
router.get("/auth/session", (req, res) => {
  console.log("Session ID:", req.sessionID);
  console.log("Session Data:", req.session);
  res.json({ authenticated: req.isAuthenticated(), user: req.user || null });
});

// ✅ Utility Function to Get Valid Access Token
const getValidAccessToken = async (user) => {
  if (!user?.accessToken) return null;
  const newToken = await refreshAccessToken(user);
  if (newToken) {
    user.accessToken = newToken;
    return newToken;
  }
  return user.accessToken;
};

// ✅ Fetch Google Fit Steps
router.get("/api/steps", isAuthenticated, async (req, res) => {
  try {
    let user = req.user;
    const validAccessToken = await getValidAccessToken(user);
    if (!validAccessToken) return res.status(401).json({ error: "Unauthorized" });

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
    const user = req.user;
    const validAccessToken = await getValidAccessToken(user);
    if (!validAccessToken) return res.status(401).json({ error: "Unauthorized" });

    const endTimeMillis = Date.now();
    const startTimeMillis = endTimeMillis - 86400000;
    const datasetId = `${startTimeMillis}000000-${endTimeMillis}000000`;

    const response = await axios.get(
      `https://www.googleapis.com/fitness/v1/users/me/dataSources/derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm/datasets/${datasetId}`,
      {
        headers: { Authorization: `Bearer ${validAccessToken}` },
      }
    );

    const heartRates = response.data?.point?.map((p) => ({
      bpm: p.value[0].fpVal,
      time: parseInt(p.startTimeNanos) / 1e6,
    })) || [];

    if (heartRates.length < 10) {
      return res.status(400).json({ error: "Not enough heart rate data" });
    }

    const features = parseData(heartRates);
    const inputArray = scalerData.mean.map((mean, i) => 
      (features[scalerData.columns[i]] - mean) / scalerData.std[i]
    );
    const inputTensor = new ort.Tensor("float32", Float32Array.from(inputArray), [1, inputArray.length]);

    const output = await session.run({ input: inputTensor });
    const prediction = output.output.data[0];
    const stressLevel = labelEncoder[prediction.toString()] ?? prediction;

    res.json({
      stress: stressLevel,
      heartRates, // ✅ return for graph
    });

  } catch (error) {
    console.error("❌ Heart Rate Fetch Error:", error?.response?.data || error.message);
    res.status(500).json({
      error: error?.response?.data?.error?.message || "Failed to fetch heart rate data",
    });
  }
});


// ✅ Fetch User Info
router.get("/api/user-info", isAuthenticated, async (req, res) => {
  try {
    let user = req.user;
    const validAccessToken = await getValidAccessToken(user);
    if (!validAccessToken) return res.status(401).json({ error: "Unauthorized" });

    const response = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${validAccessToken}` },
    });

    res.json(response.data);
  } catch (error) {
    console.error("❗ Error fetching user info:", error);
    res.status(500).json({ error: "Failed to fetch user info" });
  }
});

export default router;
