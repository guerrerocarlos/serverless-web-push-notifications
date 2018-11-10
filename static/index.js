navigator.serviceWorker.register('service-worker.js');

/**
 * urlBase64ToUint8Array
 * 
 * @param {string} base64String a public vavid key
 */
function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);

  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

navigator.serviceWorker.ready
  .then(function (registration) {
    return registration.pushManager.getSubscription()
      .then(async function (subscription) {
        if (subscription) {
          console.log('got subscription!', subscription)
          return subscription;
        }
        const response = await fetch('./vapidPublicKey');
        const vapidPublicKey = await response.text();
        console.log('decoding:', vapidPublicKey)
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        console.log('got vapidPublicKey', vapidPublicKey, convertedVapidKey)

        return registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      });

  }).then(function (subscription) {
    console.log('register!', subscription)
    fetch('./register', {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        subscription: subscription
      }),
    });

    document.getElementById('doIt').onclick = function () {
      const payload = 'Hola!'
      const delay = '5'
      const ttl = '5'
      fetch('./sendNotification', {
        method: 'post',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription,
          payload: payload,
          delay: delay,
          ttl: ttl,
        }),
      });
    };

    document.getElementById('sendToAll').onclick = function () {
      fetch('./sendToAll', {
        method: 'post',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          payload: 'SEND TEXT TO ALL',
          delay: 0,
        }),
      });
    };

  });