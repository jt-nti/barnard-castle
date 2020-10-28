const jwt = require('jsonwebtoken');
const mqtt = require('mqtt');

const mqttServer = process.env.MQTT_SERVER;
const mqttTopic = process.env.MQTT_TOPIC;

const nhsPublicKey = '-----BEGIN PUBLIC KEY-----\n' +
    'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEVyPX5CqxSdg0JE/2O0wog0qmvza/\nGLVAxNmJROQwMjtzk1U5YESBvk7njod0LJwVTmw+w/aIRvvnQsB1w5CW1g==\n' +
    '-----END PUBLIC KEY-----\n';

// Bounding box to validate position of venues
// -14.02,49.67,2.09,61.06 is too big but will do for now!
const minLat=49.67;
const maxLat=61.06;
const minLon=-14.02;
const maxLon=2.09;

function getErrorResponse(reason) {
    return {
        reason: reason
    }
}

module.exports = (req, res) => {
    if (req.method !== 'POST') {
        return res.status(400).json(getErrorResponse('InvalidMethod'));
    }

    if (!(req.body && req.body.qr && req.body.lat && req.body.lon)) {
        return res.status(400).json(getErrorResponse('BadRequest'));
    }
    
    const code = req.body.qr;
    const lat = req.body.lat;
    const lon = req.body.lon;

    // Validate the lat and lon values
    if (isNaN(lat) || lat < minLat || lat > maxLat) {
        return res.status(400).json(getErrorResponse('InvalidLat'));
    }

    if (isNaN(lon) || lon < minLon || lon > maxLon) {
        return res.status(400).json(getErrorResponse('InvalidLon'));
    }

    // Validate the QR data
    var token;
    if (code && code.startsWith('UKC19TRACING:1:')) {
        token = code.replace('UKC19TRACING:1:', '');
    } else {
        return res.status(400).json(getErrorResponse('InvalidQr'));
    }

    var venue;
    if (token) {
        jwt.verify(token, nhsPublicKey, function (err, decoded) {
            if (!err) {
                venue = decoded;
            }
        });
    }

    if (!(venue && venue.id)) {
        return res.status(400).json(getErrorResponse('InvalidVenue'));
    }

    // Publish the venue
    var message = {
        id: venue.id,
        postcode: venue.pc,
        lat: req.body.lat,
        lon: req.body.lon,
        timestamp: (new Date()).toISOString()
    }

    var mqttClient = mqtt.connect(mqttServer);

    mqttClient.on('connect', function () {
        mqttClient.publish(mqttTopic, JSON.stringify(message), function () {
            mqttClient.end();
            return res.status(202).json(message);
        });
    });
}
