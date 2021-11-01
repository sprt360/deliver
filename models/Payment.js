const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
  },
  paymentDetails: {
    type: Object
  }
});

module.exports = Payment = mongoose.model("payment", PaymentSchema);
