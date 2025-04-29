const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Middleware to protect routes and check for admin role
 */
const adminProtect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token and check role
      req.user = await User.findById(decoded.id);

      if (req.user && req.user.role === "admin") {
        next();
      } else {
        res.status(403); // Forbidden
        throw new Error("Not authorized as an admin");
      }
    } catch (error) {
      console.error("Admin authorization error:", error);
      res.status(403);
      throw new Error("Not authorized, token failed or not admin");
    }
  }

  if (!token) {
    res.status(401); // Unauthorized
    throw new Error("Not authorized, no token");
  }
};

module.exports = { adminProtect };
