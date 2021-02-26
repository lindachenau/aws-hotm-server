'use strict';

const aws = require('aws-sdk');
const ses = new aws.SES({region: 'ap-southeast-2'});

module.exports.handler = (event, context, callback) => {
  const params = {
    Destination: {
      ToAddresses: [event.body.email]
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: event.body.body
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: event.body.subject
      }
    },
    Source: event.body.source,
    ReplyToAddresses: [event.body.source]
  };
  
  const sendPromise = ses.sendEmail(params).promise()
  sendPromise.then((data) => {
    console.log('Email has been sent to', event.body.email);
    console.log(data.MessageId);
    callback(null, {status: 'success'});
  }).catch((err) => {
    console.error(err);
    callback(err)
  })
}
  