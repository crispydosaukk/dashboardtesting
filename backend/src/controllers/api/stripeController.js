import stripe from "../../config/stripe.js";

export const createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = "gbp" } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 0,
        message: "Invalid amount",
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // pounds → pence
      currency,
      automatic_payment_methods: { enabled: true },
    });

    return res.json({
      status: 1,
      clientSecret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (error) {
    console.error("Stripe error:", error);
    return res.status(500).json({
      status: 0,
      message: "Stripe error",
    });
  }
};
