const mongoose = require("mongoose");

const StreamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  category: {
    type: String,
    required: true
  },
  image_url: {
    type: String,
    required: true
  },
  active: {
    type: Boolean
  },
  sling: {
    type: Boolean,
    default: false
  },
  sling_channel: {
    type: String
  },
  hls_url: {
    type: String
  },
  event_date: {
    type: Date,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = Stream = mongoose.model("stream", StreamSchema);
