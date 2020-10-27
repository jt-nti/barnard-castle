function getVenue(code) {
    var venue;

    if (code.startsWith('UKC19TRACING:1:')) {
        var token = code.replace('UKC19TRACING:1:', '');
        venue = jwt_decode(token);
    }

    return venue;
}

function getLocation(qr, callback) {
    function success(position) {
        const location = {
            qr: qr,
            lat: position.coords.latitude,
            lon: position.coords.longitude
        };

        callback(location);
    }

    function error() {
        console.log('Using default location');
        const location = {
            qr: qr,
            lat: 54.55,
            lon: 1.92
        };

        callback(location);
    }

    if (!navigator.geolocation) {
        error();
    } else {
        navigator.geolocation.getCurrentPosition(success, error);
    }
}

function checkIn(table, code) {
    var venue = getVenue(code);

    if (venue) {
        var time = Date.now();
        addScanResultRow(table, time, venue);
        saveScan(time, token);
    }
}

function publishVenue(code) {
    httpRequest = new XMLHttpRequest();

    if (!httpRequest) {
        console.log('Cannot create XMLHTTP instance');
        return false;
    }

    const url = 'https://covidqr.nti.me.uk/api/venue';

    getLocation(code, function (location) {
        console.log('Publishing', location);
        const body = JSON.stringify(location);

        httpRequest.open('POST', url);
        httpRequest.setRequestHeader('Content-Type', 'application/json');
        httpRequest.send(body);
    });
}

function previewCode(infoMessage, venueText, venueBox, addButton, shareButton, qrContent) {
    var code = qrContent.value;
    var venue = getVenue(code);

    if (venue) {
        console.log(code);
        console.log(venue);

        var preview = `${venue.opn || 'Unknown'}\n${venue.pc || 'Unknown'}\n${venue.id || 'Unknown'}`

        infoMessage.classList.add('is-hidden');
        venueText.value = preview;
        addButton.disabled = false;
        shareButton.disabled = false;
        venueBox.scrollIntoView({behavior: "smooth", inline: "nearest"});
        return true;
    }

    infoMessage.classList.remove('is-hidden');
    venueText.value = '';
    addButton.disabled = true;
    shareButton.disabled = true;
    return false;
}

function addScanResultRow(table, timestamp, result) {
    let newRow = table.insertRow(0);

    let timeCell = newRow.insertCell();
    let timeText = document.createTextNode(new Date(timestamp).toLocaleString() || 'Unknown');
    timeCell.appendChild(timeText);

    let locationCell = newRow.insertCell();
    let locationText = document.createTextNode(`${result.opn || 'Unknown'}, ${result.pc || 'Unknown'}`);
    locationCell.appendChild(locationText);

    let idCell = newRow.insertCell();
    let idText = document.createTextNode(result.id || 'Unknown');
    idCell.appendChild(idText);
}

// ####### Location check-in history #######

const dbName = 'castledb';
const storeName = 'tokens';
var db = null;

function initDb() {
    return new Promise(function (resolve, reject) {
        if (!('indexedDB' in window)) {
            console.warn('IndexedDB not supported');
            resolve(null);
        } else {
            var request = indexedDB.open(dbName, 2);

            request.onsuccess = function (event) {
                console.log('IndexedDB opened');
                var db = event.target.result;
                resolve(db);
            };

            request.onerror = function (event) {
                console.error('IndexedDB not opened');
                resolve(null);
            };

            request.onupgradeneeded = function (event) {
                console.log('IndexedDB upgrading');
                var db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }

                var upgradeTxn = event.target.transaction;
                upgradeTxn.oncomplete = function (event) {
                    resolve(db);
                }
            };
        }
    });
}

function loadScans(table) {
    if (db) {
        // Check the db
        db.transaction(storeName).objectStore(storeName).openCursor().onsuccess = function (event) {
            let cursor = event.target.result;
            if (cursor) {
                var decoded = jwt_decode(cursor.value);
                addScanResultRow(table, cursor.key, decoded);
                cursor.continue();
            }
            else {
                // no more results
            }
        };
    }
}

function saveScan(timestamp, token) {
    if (db) {
        var scanObjectStore = db.transaction(storeName, 'readwrite').objectStore(storeName);
        scanObjectStore.add(token, timestamp);
    }
}

function clearScans(table) {
    var scanObjectStore = db.transaction(storeName, 'readwrite').objectStore(storeName);
    scanObjectStore.clear();

    while (table.firstChild) {
        table.removeChild(table.lastChild);
    }
}
