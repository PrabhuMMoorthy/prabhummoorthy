/* =====================================================================
   db.js — IndexedDB Connection and Operations Layer
   ===================================================================== */

var DB_NAME    = 'VenmurasuDB';
var DB_VERSION = 1;
var STORE_NAME = 'books';
var _db = null;

/* Open/Upgrade database connection */
function openDB(callback) {
  if (_db) { callback(_db); return; }
  var req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = function(e) {
    var db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      /* keyPath = title — each book is unique by its title */
      db.createObjectStore(STORE_NAME, { keyPath: 'title' });
    }
  };
  req.onsuccess = function(e) { 
    _db = e.target.result; 
    callback(_db); 
  };
  req.onerror = function(e) { 
    console.error('IndexedDB open error', e); 
  };
}

/* Save / Upsert a single book structure */
function dbSaveBook(book, callback) {
  if (book.isSelected === undefined) book.isSelected = true; // Enabled by default
  openDB(function(db) {
    var tx    = db.transaction(STORE_NAME, 'readwrite');
    var store = tx.objectStore(STORE_NAME);
    store.put(book);
    tx.oncomplete = function() { if (callback) callback(); };
    tx.onerror    = function(e) { console.error('dbSaveBook error', e); };
  });
}

/* Remove a book by its unique primary title key */
function dbDeleteBook(title, callback) {
  openDB(function(db) {
    var tx    = db.transaction(STORE_NAME, 'readwrite');
    var store = tx.objectStore(STORE_NAME);
    store.delete(title);
    tx.oncomplete = function() { if (callback) callback(); };
    tx.onerror    = function(e) { console.error('dbDeleteBook error', e); };
  });
}

/* Read all book structures sorted sequentially by order priority */
function dbLoadAllBooks(callback) {
  openDB(function(db) {
    var tx    = db.transaction(STORE_NAME, 'readonly');
    var store = tx.objectStore(STORE_NAME);
    var req   = store.getAll();
    req.onsuccess = function(e) {
      var arr = e.target.result || [];
      // Respect sequential structural reading order
      arr.sort(function(a, b) {
        return (a.bookOrder ?? 99) - (b.bookOrder ?? 99);
      });
      callback(arr);
    };
    req.onerror = function(e) { 
      console.error('dbLoadAllBooks error', e); 
      callback([]); 
    };
  });
}