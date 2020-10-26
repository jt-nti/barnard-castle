const jwt = require('jsonwebtoken');
const mqtt = require('mqtt');

const mqttServer = process.env.MQTT_SERVER;
const mqttTopic = process.env.MQTT_TOPIC;

const nhsPublicKey = '-----BEGIN PUBLIC KEY-----\n' +
    'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEVyPX5CqxSdg0JE/2O0wog0qmvza/\nGLVAxNmJROQwMjtzk1U5YESBvk7njod0LJwVTmw+w/aIRvvnQsB1w5CW1g==\n' +
    '-----END PUBLIC KEY-----\n';

// curl -w "%{http_code}" -H "Content-Type: application/json" -X POST "localhost:3000/api/venue" -d '{"qr":"UKC19TRACING:1:eyJhbGciOiJFUzI1NiIsImtpZCI6IllycWVMVHE4ei1vZkg1bnpsYVNHbllSZkI5YnU5eVBsV1lVXzJiNnFYT1EifQ.eyJpZCI6IjVZM1Y0Mk01Iiwib3BuIjoiQmFybmFyZCBDYXN0bGUiLCJ2dCI6IjAwMCIsInBjIjoiREwxMjhQUiJ9.gINSi7vSZ3hnYceo1BvKF2TLeQHcCpiYbBxn6MvljICKGEfamrT6E1anNpyJl7kAhV0QYO6pQEFsJvPUhE91Iw"}'
// curl -w "%{http_code}" -H "Content-Type: application/json" -X POST "https://barnard-castle.jtonline.vercel.app/api/venue" -d '{"qr":"UKC19TRACING:1:eyJhbGciOiJFUzI1NiIsImtpZCI6IllycWVMVHE4ei1vZkg1bnpsYVNHbllSZkI5YnU5eVBsV1lVXzJiNnFYT1EifQ.eyJpZCI6IjVZM1Y0Mk01Iiwib3BuIjoiQmFybmFyZCBDYXN0bGUiLCJ2dCI6IjAwMCIsInBjIjoiREwxMjhQUiJ9.gINSi7vSZ3hnYceo1BvKF2TLeQHcCpiYbBxn6MvljICKGEfamrT6E1anNpyJl7kAhV0QYO6pQEFsJvPUhE91Iw"}'

// const testToken = 'eyJhbGciOiJFUzI1NiIsImtpZCI6IllycWVMVHE4ei1vZkg1bnpsYVNHbllSZkI5YnU5eVBsV1lVXzJiNnFYT1EifQ.eyJpZCI6IjVZM1Y0Mk01Iiwib3BuIjoiQmFybmFyZCBDYXN0bGUiLCJ2dCI6IjAwMCIsInBjIjoiREwxMjhQUiJ9.gINSi7vSZ3hnYceo1BvKF2TLeQHcCpiYbBxn6MvljICKGEfamrT6E1anNpyJl7kAhV0QYO6pQEFsJvPUhE91Iw';
// const fakeToken = 'bananas';
// const fakeKey = '-----BEGIN PUBLIC KEY-----\n' +
//     'MIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgHAbM/BAHdbUY6ORe3/YAQwwd+Cb\n' +
//     'HyFgYF7qOSJECYOqYzQ1JMoP1WDuLP4z/wBn/T73BeCz5kfY13AHBbSHXI2j3EIU\n' +
//     'AHAX+SBYkHS/0hNdPM64n3t75D3wqWdXfNDyNF3ZB1rH2YpFbzaSkNVXEwG97U5R\n' +
//     'JVgzXNaODqNxnbXjAgMBAAE=\n' +
//     '-----END PUBLIC KEY-----';

module.exports = (req, res) => {
    var code;
    if (req.method == 'POST' && req.body && req.body.qr) {
        code = req.body.qr;
    }

    var token;
    if (code && code.startsWith('UKC19TRACING:1:')) {
        token = code.replace('UKC19TRACING:1:', '');
    }

    var venue;
    if (token) {
        jwt.verify(token, nhsPublicKey, function (err, decoded) {
            if (decoded && !err) {
                venue = decoded;
            }
        });
    }

    if (!venue) {
        return res.status(400).send('');
    }

    var message = {
        id: venue.id
    }

    let jsonMessage = JSON.stringify(message, null, 2);

    var mqttClient = mqtt.connect(mqttServer);

    mqttClient.on('connect', function () {
        mqttClient.publish(mqttTopic, jsonMessage, function () {
            mqttClient.end();
            res.status(202).json(message);
        });
    });
}
