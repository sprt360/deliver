const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  rank: {
    type: Number,
    required: true
  }
});

module.exports = Role = mongoose.model("role", RoleSchema);
