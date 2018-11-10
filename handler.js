'use strict';

const fs = require('fs');
const mime = require('mime-types')
const webPush = require('web-push');

let subscriptions = []

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.log("You must set the VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY " +
    "environment variables. You can use the following ones:");
  console.log(webPush.generateVAPIDKeys());
}

webPush.setVapidDetails(
  process.env.DOMAIN,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

function response(statusCode, body, file) {
  let payload = {
    statusCode,
    body: typeof (body) === 'string' ? body : JSON.stringify(body, null, 2),
  }
  if (file) {
    payload.headers = { 'content-type': mime.contentType(file) }
  }
  console.log('RESPOND', payload)
  return payload
}

module.exports.vapidPublicKey = async () => {
  return response(200, process.env.VAPID_PUBLIC_KEY);
}

module.exports.register = async (event, context) => {
  // Save the registered users subscriptions (event.body)
  subscriptions.push(JSON.parse(event.body))
  return response(201, event);
}

function send(subscriptions, payload, options, delay) {
  console.log('send', subscriptions, payload, options, delay)

  return new Promise((success) => {
    setTimeout(() => {

      Promise.all(subscriptions.map((each_subscription) => {
        return webPush.sendNotification(each_subscription, payload, options)
      }))
        .then(function () {
          success(response(201, {}))
        }).catch(function (error) {
          console.log('ERROR>', error);
          success(response(500, { error: error }))
        })

    }, 1000 * parseInt(delay))
  })
}

module.exports.sendNotification = async (event) => {
  console.log('register event', JSON.stringify(event, null, 2))
  let body = JSON.parse(event.body)
  const subscription = body.subscription;
  const payload = body.payload;
  const delay = body.delay;
  const options = {
    TTL: body.ttl | 5
  };

  return await send([subscription], payload, options, delay)
}

module.exports.registerOrSendToAll = async (event) => {
  // these two functions (register and SendtoAll) are in the same
  // handler, so that they share the same memory and we don't have
  // to setup a database for storing the subscriptions
  // this works for this test, but subscriptions will be deleted
  // when the lambda cointainer dies
  if (event.resource === '/register') {
    subscriptions.push(JSON.parse(event.body).subscription)
    return response(201, event);
  } else {
    console.log('register event', JSON.stringify(event, null, 2))
    let body = JSON.parse(event.body)
    console.log('got body', body)
    const payload = body.payload;
    const delay = body.delay;
    const options = {
      TTL: body.ttl | 5
    };
    return await send(subscriptions, payload, options, delay)
  }

}

module.exports.statics = async (event) => {
  // Serve static files from lambda (only for simplicity of this example)
  var file = fs.readFileSync(`./static${event.resource}`)
  return await response(200, file.toString(), event.resource.split('/')[1])
}