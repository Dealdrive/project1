const axios = require("axios");
const dotenv = require("dotenv");
const UserLocation = require("../models/UserLocation");

dotenv.config();

const getCountryByIP = async (ip) => {
  if (ip === "::1" || ip === "127.0.0.1") {
    return {
      country: "Localhost",
      region: "Localhost",
      city: "Localhost",
      currency: "N/A",
    };
  }

  try {
    const token = process.env.IPINFO_TOKEN;
    const response = await axios.get(
      `https://ipinfo.io/${ip}/json?token=${token}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching IP info:", error);
    return null;
  }
};

const ipGeolocationMiddleware = async (req, res, next) => {
  const xForwardedFor = req.headers["x-forwarded-for"];
  const userIP = xForwardedFor
    ? xForwardedFor.split(",")[0].trim()
    : req.socket.remoteAddress;

  console.log("User IP:", userIP);

  const ipData = await getCountryByIP(userIP);
  if (!ipData) {
    return res.status(500).json({ error: "Failed to fetch country data" });
  }

  req.userGeolocation = ipData;

  // Log the location
  try {
    const { country, region, city } = ipData;

    await UserLocation.findOneAndUpdate(
      { country, region, city },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error("Error logging location:", error);
  }

  next();
};

const getlocationCount = async (req, res) => {
  try {
    const locationCount = await UserLocation.find();
    if (!locationCount) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(locationCount);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { ipGeolocationMiddleware, getlocationCount };
