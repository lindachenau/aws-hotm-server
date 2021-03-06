const AWS = require('aws-sdk')

AWS.config.update({region: 'ap-southeast-2'})

const cwevents = new AWS.CloudWatchEvents()
const lambda = new AWS.Lambda()

const createEvent = (bookingType, bookingId) => {
  const cDate = new Date(new Date().getTime() + 3600000 * parseInt(process.env.AUTO_CANCEL_HOURS_AFTER_BOOKING))
  const minute = cDate.getMinutes()
  const hour = cDate.getHours()
  const params = {
    Name: `${bookingType}-${bookingId}-cancellation`,
    RoleArn: process.env.LAMBDA_ROLE,
    ScheduleExpression: `cron(${minute} ${hour} * * ? *)`, //Trigger 12 hours later from now
    State: 'ENABLED'
  }

  return new Promise((resolve, reject) => {
    cwevents.putRule(params, (err, data) => {
      if (err) reject(err)
      else {
        console.log("Auto cancellation scheduled successfully", data.RuleArn)
        resolve(data.RuleArn)
      }
    })
  })
}

const eventTarget = (bookingType, bookingId) => {
  const id = `${bookingType}-${bookingId}-cancellation`
  const params = {
    Rule: id,
    Targets: [
      {
        Arn: process.env.CANCELBOOKING_LAMBDA_ARN,
        Id: id,
        Input: JSON.stringify({
          "targetId": id,
          "rule": id,
          "bookingType": bookingType,
          "bookingId": bookingId
        })
      }
    ]
  }
  
  return new Promise((resolve, reject) => {
    cwevents.putTargets(params, (err, data)=> {
      if (err) reject(err)
      else {
        console.log("Event target set successfully", data)
        resolve(data)
      }
    })
  })
}

const lambdaTrigger = (ruleArn, bookingType, bookingId) => {
  const params = {
    Action: "lambda:InvokeFunction", 
    FunctionName: process.env.CANCELBOOKING_LAMBDA, 
    Principal: "events.amazonaws.com", 
    SourceArn: ruleArn, 
    StatementId: `${bookingType}-${bookingId}-cancellation`
  }
  
  return new Promise((resolve, reject) => {
    lambda.addPermission(params, (err, data)=> {
      if (err) reject(err)
      else {
        console.log("Trigger on lambda set successfully", data)
        resolve(data)
      }
    })
  })
}

module.exports.handler = (event, context, callback) => {
  const {bookingType, bookingId} = event.body

  createEvent(bookingType, bookingId)
  .then((ruleArn) => {
    return lambdaTrigger(ruleArn, bookingType, bookingId)
  })
  .then(() => {
    return eventTarget(bookingType, bookingId)
  })
  .then((data) => {
    callback(null, data)
  })
  .catch((err) => {
    console.error(err)
    callback(err)
  })
}