function checkIn(table, code) {
    if (code.startsWith('UKC19TRACING:1:')) {
        var token = code.replace('UKC19TRACING:1:', '');
        var decoded = jwt_decode(token);

        // TODO: get timestamp from file modified date
        addScanResultRow(table, Date.now(), decoded);
        saveScan(Date.now(), token);
    }
}

function previewCode(table, code) {
    if (code.startsWith('UKC19TRACING:1:')) {
        var token = code.replace('UKC19TRACING:1:', '');
        var decoded = jwt_decode(token);

        while (table.firstChild) {
            table.removeChild(table.lastChild);
        }
        addScanResultRow(table, Date.now(), decoded);
    }
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
