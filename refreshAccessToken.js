import axios from "axios";

const refreshAccessToken = async (user) => {
  if (!user.refreshToken) {
    console.error("❌ No refresh token available");
    return null;
  }

  try {
    const response = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: user.refreshToken,
      grant_type: "refresh_token",
    });

    return response.data.access_token;
  } catch (error) {
    console.error("❗ Failed to refresh access token:", error.response?.data || error.message);
    return null;
  }
};

export default refreshAccessToken;