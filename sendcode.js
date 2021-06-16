'use strict';

const aws = require('aws-sdk');
const ses = new aws.SES({region: 'ap-southeast-2'});

function generateCode() {
  let s = Math.floor(Math.random() * 1000000) + "";
  while (s.length < 6) s = "0" + s;
  return s;
}

module.exports.handler = (event, context, callback) => {
  const code = generateCode();
  const params = {
    Destination: {
      ToAddresses: [event.body.email]
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `<h2>Confirm your email address</h2><p>Thank you for visiting Hair Beauty Life Co. We're happy you're here!</p><p>Enter the following code in the pop up window to validate your email address.</p><br>${code}`
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `Hair Beauty Life Co email confirmation code: ${code}`
      }
    },
    Source: process.env.HOTM_ADMIN,
    ReplyToAddresses: [process.env.HOTM_ADMIN]
  };
  
  const sendPromise = ses.sendEmail(params).promise()
  sendPromise.then((data) => {
    console.log('Code has been sent to', event.body.email);
    console.log(data.MessageId);
    callback(null, {code});
  }).catch((err) => {
    console.error(err);
    callback(err)
  })
}
  