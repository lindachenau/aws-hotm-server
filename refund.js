'use strict';

const stripe = require("stripe")(process.env.REACT_APP_STRIPE_PRIVATE_KEY, {
  maxNetworkRetries: 2, // Retry a request twice before giving up
});

//Stripe charge server
module.exports.handler = async (event, context, callback) => {
  try {
    const {id, status} = await stripe.refunds.create({
      charge: event.body.id
    });

    callback(null, {id, status});
    context.succeed(event);
  } catch (err) {
    callback(err);
    context.fail(err);
  }
}
