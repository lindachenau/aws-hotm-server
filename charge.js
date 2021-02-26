'use strict';

const stripe = require("stripe")(process.env.REACT_APP_STRIPE_PRIVATE_KEY, {
  maxNetworkRetries: 2, // Retry a request twice before giving up
});

//Stripe charge server
module.exports.handler = async (event, context, callback) => {
  try {
    const {id, status} = await stripe.charges.create({
      amount: event.body.amount,
      currency: "aud",
      description: event.body.description,
      source: event.body.id
    });

    callback(null, {id, status});
    context.succeed(event);
  } catch (err) {
    callback(err);
    context.fail(err);
  }
}
