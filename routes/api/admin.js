const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const admin = require("../../middleware/admin");

const User = require("../../models/User");
const Role = require("../../models/Role");
const Payment = require("../../models/Payment");
const Stream = require("../../models/Stream");

// @route    GET api/admin/roles
// @desc     Get all roles
// @access   Admin
router.get("/roles", admin, async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

// @route    POST api/admin/roles
// @desc     Create a new role
// @access   Admin
router.post(
  "/roles",
  [
    check("name", "Name is required").exists(),
    check("rank", "Rank is required").exists()
  ],
  admin,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, rank } = req.body;
    try {
      const role = new Role({
        name,
        rank
      });
      await role.save();
      res.json(role);
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route    GET api/admin/users
// @desc     Get all users
// @access   Admin
router.get("/users", admin, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("roles.role", ["name", "rank"]);
    res.json(users);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

// @route    GET api/admin/payments
// @desc     Get all payments
// @access   Admin
router.get("/payments", admin, async (req, res) => {
  try {
    const payments = await Payment.find().populate("user");
    res.json(payments);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

// @route    GET api/admin/payments
// @desc     Get all payments
// @access   Admin
router.get("/payments", admin, async (req, res) => {
  try {
    const payments = await Payment.find().populate("user");
    res.json(payments);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

// @route    GET api/admin/streams
// @desc     Get all custom streams
// @access   Admin
router.get("/streams", admin, async (req, res) => {
  try {
    const streams = await Stream.find();
    res.json(streams);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

// @route    POST api/admin/streams
// @desc     Create a new custom stream
// @access   Admin
router.post(
  "/streams",
  [
    check("title", "Title is required").exists(),
    check("category", "Category is required").exists(),
    check("image_url", "Image URL is required").exists(),
    check("event_date", "Date is required").exists()
  ],
  admin,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      category,
      image_url,
      sling,
      sling_channel,
      hls_url,
      event_date,
      active
    } = req.body;
    try {
      const stream = new Stream({
        title,
        description,
        category,
        image_url,
        sling,
        sling_channel,
        hls_url,
        event_date,
        active
      });
      await stream.save();
      res.json(stream);
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route    DELETE api/admin/streams/:id
// @desc     Delete custom stream
// @access   Admin
router.delete("/streams/:id", admin, async (req, res) => {
  try {
    const stream = await Stream.findByIdAndDelete(req.params.id);
    res.json(stream);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

// @route    PATCH api/admin/streams/:id
// @desc     Edit a custom stream
// @access   Admin
router.patch("/streams/:id", admin, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    title,
    description,
    category,
    image_url,
    sling,
    sling_channel,
    hls_url,
    event_date,
    active
  } = req.body;
  try {
    const stream = await Stream.findById(req.params.id);
    if (title) {
      stream.title = title;
    }
    if (description) {
      stream.description = description;
    }
    if (category) {
      stream.category = category;
    }
    if (image_url) {
      stream.image_url = image_url;
    }
    if (sling !== undefined) {
      stream.sling = sling;
    }
    if (sling_channel) {
      stream.sling_channel = sling_channel;
    }
    if (hls_url) {
      stream.hls_url = hls_url;
    }
    if (event_date) {
      stream.event_date = new Date(event_date);
    }
    if (active !== undefined) {
      stream.active = active;
    }
    await stream.save();
    res.json(stream);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
