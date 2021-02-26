const AWS = require('aws-sdk')
const axios = require('axios')

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
    FunctionName: "aws-hotm-server-dev-cancelbooking", 
    StatementId: targetId
  }
  
  return new Promise((resolve, reject) => {
    lambda.removePermission(params, (err, data)=> {
      if (err) reject(err)
      else {
        console.log("Trigger on lambda removed successfully", data)
        resolve(data)
      }
    })
  })
}

const deleteBooking = async (bookingType, bookingId) => {
  const endPt = bookingType === 'therapist' ? '/bookings' : '/admin/bookings'
  const url = `${process.env.HOTM_BOOKING_API}${endPt}`

  const config = {
    method: 'get',
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate"
    },
    url: `${url}?id=${bookingId}`
  }

  try {
    const result = await axios(config)
    const unpaid = result.data ? result.data.paid_amount === 0 : false //booking can return null if deleted

    if (unpaid) {
      const config = {
        method: 'delete',
        headers: {"Content-Type": "application/json"},
        url: url,
        data: {
          booking_id: bookingId
        }
      }
      return axios(config)
    } else {
      return Promise.resolve({
        data: {
          booking_id: bookingId,
          message: 'paid already'
        }})
    }
  } catch (err) {
    return Promise.reject({
      booking_id: bookingId,
      message: 'Booking has been cancelled'
    })
  }
}

module.exports.handler = (event, context, callback) => {
  const {targetId, rule, bookingType, bookingId} = event

  // Handle promise's fulfilled/rejected states
  deleteBooking(bookingType, bookingId).then((data) => {
    console.log(data.data)
  }).then(() => {
    return removeTrigger(targetId)
  }).then(() => {
    return removeTarget(targetId, rule)
  }).then(() => {
    return deleteRule(rule)
  }).catch((err) => {
    console.error(err)
    //Remove the rule even cancellation failed
    removeTrigger(targetId).then(() => {
      return removeTarget(targetId, rule)
    }).then(() => {
      return deleteRule(rule)
    }).catch((err) => {
      console.error(err)
    })
  })
}