const AWS = require('aws-sdk')

AWS.config.update({region: 'ap-southeast-2'})

const cwevents = new AWS.CloudWatchEvents()
const lambda = new AWS.Lambda()

const createEvent = (bookingType, bookingId, bookingDate) => {
  const bDate = new Date((new Date(bookingDate)).getTime() - parseInt(process.env.REMINDER_HOURS_BEFORE) * 3600000)

  if (bDate.getTime() < (new Date()).getTime()) //The appointment is less than REMINDER_HOURS_BEFORE_APPOINTMENT hours away. No need to send reminder.
    return Promise.reject({
      booking_id: bookingId,
      message: 'No need to send reminder'
      })
  const min = bDate.getMinutes()
  const hour = bDate.getHours()
  const date = bDate.getDate()
  const month = bDate.getMonth() + 1
  const id = `${bookingType}-${bookingId}-reminder`
  const params = {
    Name: id,
    RoleArn: process.env.LAMBDA_ROLE,
    ScheduleExpression: `cron(${min} ${hour} ${date} ${month} ? *)`,
    State: 'ENABLED'
  }

  return new Promise((resolve, reject) => {
    cwevents.putRule(params, (err, data) => {
      if (err) reject(err)
      else {
        console.log(`Reminder is scheduled successfully`, data.RuleArn)
        resolve({ruleArn: data.RuleArn, id})
      }
    })
  })
}

const eventTarget = (id, localDate, name, phoneNumber) => {
  const params = {
    Rule: id,
    Targets: [
      {
        Arn: process.env.SMS_LAMBDA_ARN,
        Id: id,
        Input: JSON.stringify({
          "targetId": id,
          "rule": id,
          "localDate" : localDate,
          "name": name,
          "phoneNumber": phoneNumber
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

const lambdaTrigger = (ruleArn, id) => {
  const params = {
    Action: "lambda:InvokeFunction", 
    FunctionName: process.env.SMS_LAMBDA, 
    Principal: "events.amazonaws.com", 
    SourceArn: ruleArn, 
    StatementId: id
  }
  
  return new Promise((resolve, reject) => {
    lambda.addPermission(params, (err, data)=> {
      if (err) reject(err)
      else {
        console.log("Trigger on lambda set successfully", data)
        resolve(id)
      }
    })
  })
}

module.exports.handler = (event, context, callback) => {
  const {bookingType, bookingId, bookingDate, localDate, phoneNumber, name} = event.body

  createEvent(bookingType, bookingId, bookingDate)
  .then((data) => {
    return lambdaTrigger(data.ruleArn, data.id)
  })
  .then((id) => {
    return eventTarget(id, localDate, name, phoneNumber)
  })
  .then((data) => {
    callback(null, data)
  })
  .catch((err) => {
    console.error(err)
    callback(err)
  })
}