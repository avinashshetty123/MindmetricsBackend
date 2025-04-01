import axios from "axios";

const refreshAccessToken = async (user) => {
  try {
    if (!user?.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await axios.post("https://oauth2.googleapis.com/token", null, {
      params: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: user.refreshToken,
        grant_type: "refresh_token",
      },
    });

    console.log("🔄 Refreshed Access Token:", response.data.access_token);
    user.accessToken = response.data.access_token; // ✅ Update the user's access token
    return response.data.access_token;
  } catch (error) {
    console.error("❗ Failed to refresh access token:", error.response?.data || error.message);
    return null;
  }
};

export default refreshAccessToken;
