const AWS = require('aws-sdk')
const PNF = require('google-libphonenumber').PhoneNumberFormat
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance()

AWS.config.update({region: 'ap-southeast-2'})

const sns = new AWS.SNS()
const cwevents = new AWS.CloudWatchEvents()
const lambda = new AWS.Lambda()

const removeTarget = (targetId, rule) => {
  const params = {
    Ids: [targetId],
    Rule: rule,
    Force: true
  }
  
  return new Promise((resolve, reject) => {
    cwevents.removeTargets(params, (err, data)=> {
      if (err) reject(err)
      else {
        console.log("Event target removed successfully", data)
        resolve(data)
      }
    })
  })
}

const deleteRule = (rule) => {
  const params = {
    Name: rule,
    Force: true
  }
  
  return new Promise((resolve, reject) => {
    cwevents.deleteRule(params, (err, data)=> {
      if (err) reject(err)
      else {
        console.log("Event rule removed successfully", data)
        resolve(data)
      }
    })
  })
}

const removeTrigger = (targetId) => {
  const params = {
    FunctionName: process.env.SMS_LAMBDA, 
    StatementId: targetId
  }
  
  return new Promise((resolve, reject) => {
    lambda.removePermission(params, (err, data)=> {
      if (err) reject(err)
      else {
        console.log(`Trigger ${targetId} on lambda removed successfully`, data)
        resolve(data)
      }
    })
  })
}

module.exports.handler = (event, context, callback) => {
  const {targetId, rule, localDate, name, phoneNumber} = event
  const parsedNumber = phoneUtil.parse(phoneNumber, 'AU')
  const intPhoneNum = phoneUtil.format(parsedNumber, PNF.INTERNATIONAL)
  const message = `${name}, your appointment with Hair Beauty Life Co on ${localDate} is coming soon.`

  const params = {
    Message: message, 
    PhoneNumber: intPhoneNum
  }

  // Create promise and SNS service object
  const publishTextPromise = sns.publish(params).promise()

  // Dummy for not sending SMS
  // const publishTextPromise = new Promise((resolve, reject) => {
  //   resolve({targetId, message})
  // })

  // Handle promise's fulfilled/rejected states
  publishTextPromise.then((data) => {
    // console.log(intPhoneNum)
    // console.log(data.targetId)
    // console.log(data.message)    
    console.log("MessageID is " + data.MessageId)
    callback(null, {messageId: data.MessageId})
  }).then(() => {
    return removeTrigger(targetId)
  }).then(() => {
    return removeTarget(targetId, rule)
  }).then(() => {
    return deleteRule(rule)
  }).catch((err) => {
    console.error(err);
    callback(err)
  })
}