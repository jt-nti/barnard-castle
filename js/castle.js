class State {
    document;
    scanDialog;
    startButton;
    fileButton;
    fileInput;
    pasteButton;
    qrMessage;
    venueText;
    venueBox;
    addButton;
    shareButton;
    publishSuccess;
    publishFail;

    constructor(document,
                scanDialog,
                startButton,
                fileButton,
                fileInput,
                pasteButton,
                qrMessage,
                venueText,
                venueBox,
                addButton,
                shareButton,
                publishSuccess,
                publishFail) {
        this.document = document;
        this.scanDialog = scanDialog;
        this.startButton = startButton;
        this.fileButton = fileButton;
        this.fileInput = fileInput;
        this.pasteButton = pasteButton;
        this.qrMessage = qrMessage;
        this.venueText = venueText;
        this.venueBox = venueBox;
        this.addButton = addButton;
        this.shareButton = shareButton;
        this.publishSuccess = publishSuccess;
        this.publishFail = publishFail;
    }

    startScan() {
        this.addButton.disabled = true;
        this.shareButton.disabled = true;

        this.document.classList.add('is-clipped');
        this.scanDialog.classList.add('is-active');
    }

    scanFinished() {
        this.document.classList.remove('is-clipped');
        this.scanDialog.classList.remove('is-active');
    }

    loadImage() {
        this.startButton.disabled = true;
        this.fileButton.setAttribute('disabled', 'true');
        this.fileInput.disabled = true;
        this.pasteButton.disabled = true;
    }

    loadImageComplete() {
        this.startButton.disabled = false;
        this.fileButton.removeAttribute('disabled');
        this.fileInput.disabled = false;
        this.pasteButton.disabled = false;
    }

    previewVenue(preview) {
        this.venueText.value = preview;
        this.addButton.disabled = false;
        this.shareButton.disabled = false;

        this.qrMessage.classList.add('is-hidden');
        this.publishSuccess.classList.add('is-hidden');
        this.publishFail.classList.add('is-hidden');

        this.venueBox.scrollIntoView({ behavior: "smooth", inline: "nearest" });
    }

    resetVenue() {
        this.venueText.value = '';
        this.addButton.disabled = true;
        this.shareButton.disabled = true;

        this.qrMessage.classList.remove('is-hidden');
        this.publishSuccess.classList.add('is-hidden');
        this.publishFail.classList.add('is-hidden');
    }

    publishVenue() {
        this.shareButton.disabled = true;

        this.startButton.disabled = true;
        this.fileButton.setAttribute('disabled', 'true');
        this.fileInput.disabled = true;
        this.pasteButton.disabled = true;

        this.publishSuccess.classList.add('is-hidden');
        this.publishFail.classList.add('is-hidden');
    }

    publishComplete() {
        this.shareButton.disabled = false;

        this.startButton.disabled = false;
        this.fileButton.removeAttribute('disabled');
        this.fileInput.disabled = false;
        this.pasteButton.disabled = false;
    }

    publishSucceeded() {
        this.publishComplete();
        this.publishSuccess.classList.remove('is-hidden');
        this.publishSuccess.scrollIntoView({ behavior: "smooth", inline: "nearest" });
    }

    publishFailed() {
        this.publishComplete();
        this.publishFail.classList.remove('is-hidden');
        this.publishFail.scrollIntoView({ behavior: "smooth", inline: "nearest" });
    }
}

function getToken(code) {
    var token;

    if (code.startsWith('UKC19TRACING:1:')) {
        token = code.replace('UKC19TRACING:1:', '');
    }

    return token;
}

function getVenue(token) {
    var venue;

    try {
        const decoded = jwt_decode(token);

        if (decoded.id) {
            venue = decoded;
        }
    } catch (err) {
        // Invalid token
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
            lat: 54.54335,
            lon: -1.92698
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
    const token = getToken(code);
    const venue = getVenue(code);

    if (venue) {
        const time = Date.now();
        addScanResultRow(table, time, venue);
        saveScan(time, token);
    }
}

function publishVenue(state, code) {
    httpRequest = new XMLHttpRequest();

    if (!httpRequest) {
        console.log('Cannot create XMLHTTP instance');
        return false;
    }

    function success() {
        state.publishSucceeded();
    }

    function error() {
        state.publishFailed();
    }

    const url = 'https://covidqr.nti.me.uk/api/venue';

    state.publishVenue();
    getLocation(code, function (location) {
        console.log('Publishing', location);
        const body = JSON.stringify(location);

        httpRequest.onload = success;
        httpRequest.error = error;
        httpRequest.open('POST', url);
        httpRequest.setRequestHeader('Content-Type', 'application/json');
        httpRequest.send(body);
    });
}

function previewCode(state, qrContent) {
    const code = qrContent.value;
    const token = getToken(code);
    const venue = getVenue(token);

    if (venue) {
        console.log(code);
        console.log(venue);

        const preview = `${venue.opn || 'Unknown'}\n${venue.pc || 'Unknown'}\n${venue.id || 'Unknown'}`

        state.previewVenue(preview);
        return true;
    }

    state.resetVenue();
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
                const venue = getVenue(cursor.value);
                addScanResultRow(table, cursor.key, venue);
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
