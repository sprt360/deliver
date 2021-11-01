const express = require("express");
const router = express.Router();
const axios = require("axios");
const auth = require("../../middleware/auth");
const paypal = require("@paypal/checkout-server-sdk");
const payPalClient = require("../../config/payPalClient");
const Payment = require("../../models/Payment");
const Role = require("../../models/Role");
const User = require("../../models/User");

// @route    POST api/payments/paypal/transaction-complete
// @desc     Verify new PayPal payment
// @access   Private
router.post("/paypal/transaction-complete", auth, async (req, res) => {
  const { orderID, expires_at, cost } = req.body;

  let request = new paypal.orders.OrdersGetRequest(orderID);
  request.headers["prefer"] = "return=representation";

  let order;

  try {
    order = await payPalClient.client().execute(request);
  } catch (err) {
    res.status(500).send("Server Error");
  }

  if (+order.result.purchase_units[0].amount.value !== cost) {
    return res
      .status(400)
      .json({ errors: [{ msg: "Insufficient amount of funds sent" }] });
  } else {
    const { id, payer, create_time, status, purchase_units } = order.result;
    const paymentDetails = { id, payer, create_time, status, purchase_units };
    const newPayment = new Payment({
      user: req.user.id,
      paymentDetails
    });
    await newPayment.save();

    const assignPremiumRole = async () => {
      const user = await User.findById(req.user.id)
        .select("-password")
        .populate("roles.role", ["name", "rank"]);
      const premiumRole = await Role.findOne({ name: "Premium" });
      const roleID = premiumRole._id;
      if (
        user.roles.some(
          role =>
            role.role._id.toString() === roleID.toString() &&
            Date.now() < role.expires_at
        )
      ) {
        return res
          .status(400)
          .json({ errors: [{ msg: "You are already a Premium User!" }] });
      } else {
        user.roles.unshift({ role: roleID, expires_at });
        user.save();
        res.json(user);
      }
    };
    assignPremiumRole();
  }
});

// @route    GET api/payments
// @desc     Get logged in user's payment history
// @access   Private
router.get("/", auth, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id });
    res.json(payments);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
