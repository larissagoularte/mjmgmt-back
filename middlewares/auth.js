
const passport = require('passport');
const Blacklist = require("../models/blacklist");

const isLoggedIn = (req, res, next) => {
  console.log('isLoggedIn middleware called'); // Debugging output
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  })(req, res, next);
};

const checkBlacklist = async (req, res, next) => {
  console.log('checkBlacklist middleware called'); 
  const token = req.cookies.token;
  if (token) {
    const isBlacklisted = await Blacklist.findOne({ token });

    console.log('Checking token:', token); 
    console.log('Is blacklisted:', isBlacklisted); 

    if (isBlacklisted) {
      return res.status(401).json({ error: "Token is blacklisted" });
    }

    next();
  } else {
    return res.status(401).json({ error: "No token provided" });
  }
};

const isAuthenticated = [isLoggedIn, checkBlacklist];

module.exports = {
  isAuthenticated,
};


