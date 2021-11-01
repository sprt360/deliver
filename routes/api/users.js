const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");

const auth = require("../../middleware/auth");
const User = require("../../models/User");

// @route    GET api/users/current
// @desc     Get logged in user's details
// @access   Private
router.get("/current", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("roles.role", ["name", "rank"]);
    res.json(user);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

// @route    POST api/users/current/change_password
// @desc     Change logged in user's password
// @access   Private
router.post(
  "/current/change_password",
  [
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 })
  ],
  auth,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { password } = req.body;

      const user = await User.findById(req.user.id)
        .select("-password")
        .populate("roles.role", ["name", "rank"]);

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();
      res.json(user);
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
