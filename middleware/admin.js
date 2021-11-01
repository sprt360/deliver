const jwt = require("jsonwebtoken");
const config = require("config");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(401).json({ msg: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, config.get("jwtSecret"));
    req.user = decoded.user;
    const user = await User.findById(decoded.user.id)
      .select("-password")
      .populate("roles.role", ["name", "rank"]);
    if (user.roles.some(role => role.role.rank >= 2)) {
      next();
    } else {
      return res.status(403).json({ msg: "Unauthorized" });
    }
  } catch (err) {
    res.status(401).json({ msg: "Invalid JWT token" });
  }
};
