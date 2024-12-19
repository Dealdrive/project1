// Middleware to get user's IP address
const locationIp = (req, res, next) => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    req.userIP = xForwardedFor.split(',')[0].trim();
  } else {
    req.userIP = req.socket.remoteAddress;
  }
  next();
};

module.exports = locationIp;
