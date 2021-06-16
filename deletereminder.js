const AWS = require('aws-sdk')

AWS.config.update({region: 'ap-southeast-2'})

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
  const {bookingType, bookingId} = event.body
  const targetId = `${bookingType}-${bookingId}-reminder`
  const rule = targetId

  removeTrigger(targetId).then(() => {
    callback(null, {status: 'Reminder deleted'})
    return removeTarget(targetId, rule)
  }).then(() => {
    return deleteRule(rule)
  }).catch((err) => {
    callback(err)
    console.error(err)
  })
} 