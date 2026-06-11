/* =====================================================================
   app.js — Venmurasu Quote Reader
   Books stored per-entry in IndexedDB (VenmurasuDB / books store).
   ===================================================================== */

var data = { books: [] };          // in-memory working copy
var activeBook = null, activeChapter = null, activeChar = null, currentTab = 'books';
var exportQuote = null, selectedExportTheme = 0, currentQuotes = [], _charList = [];
var charSort = 'default';
var LS_THEME = 'venmurasu_ui_theme';

/* ── IndexedDB setup ─────────────────────────────────────────────────── */
var DB_NAME    = 'VenmurasuDB';
var DB_VERSION = 1;
var STORE_NAME = 'books';
var _db = null;

function openDB(callback) {
  if (_db) { callback(_db); return; }
  var req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = function(e) {
    var db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      /* keyPath = title — each book is keyed by its title */
      db.createObjectStore(STORE_NAME, { keyPath: 'title' });
    }
  };
  req.onsuccess = function(e) { _db = e.target.result; callback(_db); };
  req.onerror   = function(e) { console.error('IndexedDB open error', e); };
}

/* Save one book object {title, chapters, bookOrder, isSelected} into the store */
function dbSaveBook(book, callback) {
  if (book.isSelected === undefined) book.isSelected = true; // default enabled
  openDB(function(db) {
    var tx    = db.transaction(STORE_NAME, 'readwrite');
    var store = tx.objectStore(STORE_NAME);
    store.put(book);
    tx.oncomplete = function() { if (callback) callback(); };
    tx.onerror    = function(e) { console.error('dbSaveBook error', e); };
  });
}

/* Delete one book by title */
function dbDeleteBook(title, callback) {
  openDB(function(db) {
    var tx    = db.transaction(STORE_NAME, 'readwrite');
    var store = tx.objectStore(STORE_NAME);
    store.delete(title);
    tx.oncomplete = function() { if (callback) callback(); };
    tx.onerror    = function(e) { console.error('dbDeleteBook error', e); };
  });
}

/* Load all books, accurately ordered by bookOrder integer key */
function dbLoadAllBooks(callback) {
  openDB(function(db) {
    var tx    = db.transaction(STORE_NAME, 'readonly');
    var store = tx.objectStore(STORE_NAME);
    var req   = store.getAll();
    req.onsuccess = function(e) {
      var arr = e.target.result || [];
      // Sort items based on their structural serialization hierarchy values
      arr.sort(function(a, b) {
        return (a.bookOrder ?? 99) - (b.bookOrder ?? 99);
      });
      callback(arr);
    };
    req.onerror   = function(e) { console.error('dbLoadAllBooks error', e); callback([]); };
  });
}

/* ── Theme ───────────────────────────────────────────────────────────── */
var EXPORT_THEMES = [
  {name:'Night Gold',   bg:'#0f0e0c',border:'#c8a84b',text:'#e8dfc8',meta:'#9a9080',accent:'#c8a84b',deco:'\u201C'},
  {name:'Manuscript',   bg:'#f5ead0',border:'#8b6914',text:'#2a1a00',meta:'#6b4c10',accent:'#8b3a0a',deco:'\u2726'},
  {name:'Midnight Blue',bg:'#0a0e1a',border:'#3a6faf',text:'#d8e4f4',meta:'#7a9cc8',accent:'#6ab0ff',deco:'\u2731'},
  {name:'Red Fire',     bg:'#1a0a08',border:'#c04030',text:'#f0ddd8',meta:'#a07060',accent:'#e06040',deco:'\u2694'},
  {name:'Pure White',   bg:'#ffffff',border:'#cccccc',text:'#111111',meta:'#666666',accent:'#333333',deco:'\u275E'},
  {name:'Forest Accent',bg:'#0c1a0e',border:'#3a7a42',text:'#d4ead6',meta:'#7aaa80',accent:'#5fc068',deco:'\u2740'},
  {name:'Clouds Sky',   bg:'#7597d4',border:'#ffffff',text:'#1a2a3a',meta:'#4a5d78',accent:'#1a2a3a',deco:'\u2601', type:'clouds',    glass:true, glassBg:'rgba(255,255,255,0.72)', glassBorder:'rgba(255,255,255,0.4)'},
  {name:'Misty Peaks',  bg:'#2b1a3d',border:'#fec389',text:'#f5f0fa',meta:'#c9646c',accent:'#fec389',deco:'\u25b2', type:'mountains', glass:true, glassBg:'rgba(18,10,31,0.65)',    glassBorder:'rgba(254,195,137,0.25)'},
  {name:'Deep Ocean',   bg:'#040d1a',border:'#5ba3e8',text:'#e5f2ff',meta:'#6888a8',accent:'#5ba3e8',deco:'\u2248', type:'ocean',     glass:true, glassBg:'rgba(4,13,26,0.72)',     glassBorder:'rgba(91,163,232,0.25)'},
  {name:'Serene Woods', bg:'#051108',border:'#5ec87a',text:'#e2f5e8',meta:'#7aaa80',accent:'#5ec87a',deco:'\u2741', type:'forest',    glass:true, glassBg:'rgba(5,17,8,0.75)',      glassBorder:'rgba(94,200,122,0.25)'},
];

function setTheme(t) {
  document.body.setAttribute('data-theme', t);
  document.querySelectorAll('.theme-dot').forEach(function(d) {
    d.classList.toggle('active', d.getAttribute('data-t') === t);
  });
  try { localStorage.setItem(LS_THEME, t); } catch(e) {}
}
(function() {
  try { var t = localStorage.getItem(LS_THEME); if (t) setTheme(t); } catch(e) {}
})();

/* ── Sidebar toggle ──────────────────────────────────────────────────── */
function toggleSidebar() {
  var sb   = document.getElementById('sidebar');
  var open = sb.classList.toggle('open');
  document.getElementById('hamburger').classList.toggle('open', open);
  document.getElementById('overlay').classList.toggle('show', open);
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

/* ── File upload ─────────────────────────────────────────────────────── */
function loadFile(e) {
  var file = e.target.files[0];
  if (!file) return;
  
  var filename = file.name;
  e.target.value = '';

  var r = new FileReader();
  r.onload = function(ev) {
    try {
      var parsed = JSON.parse(ev.target.result);
      var booksToAdd = [];

      /* Shape filtering and explicit index key alignment configuration */
      if (parsed.books && Array.isArray(parsed.books)) {
        // Full series file -> capture items based on native index sequence positioning
        booksToAdd = parsed.books.map(function(b, idx) {
          b.bookOrder = idx + 1;
          if (b.isSelected === undefined) b.isSelected = true;
          return b;
        });
      } else if (parsed.title && parsed.chapters) {
        // Single file parser -> attempt retrieval of numerical structure identifier tags
        var detectedNum = 99;
        var match = filename.match(/^(\d+)[_\-\s]?/);
        if (match) {
          detectedNum = parseInt(match[1], 10);
        }
        parsed.bookOrder = detectedNum;
        if (parsed.isSelected === undefined) parsed.isSelected = true;
        booksToAdd = [parsed];
      } else {
        showToast('⚠️ Unrecognised JSON shape. Expected {title, chapters} or {books:[…]}');
        return;
      }

      dbLoadAllBooks(function(existingBooks) {
        var saved = 0, total = booksToAdd.length;
        booksToAdd.forEach(function(incoming) {
          var target = existingBooks.find(function(eb) { return eb.title === incoming.title; });

          if (!target) {
            dbSaveBook(incoming, function() {
              saved++;
              if (saved === total) finishLoad(booksToAdd);
            });
            return;
          }

          // If updating data structure, make sure context properties are preserved
          target.bookOrder = incoming.bookOrder;
          if (target.isSelected === undefined) target.isSelected = incoming.isSelected;

          if (!target.chapters) target.chapters = [];
          incoming.chapters && incoming.chapters.forEach(function(inCh) {
            var targetCh = target.chapters.find(function(tc) { return tc.chapter === inCh.chapter; });
            if (!targetCh) {
              target.chapters.push(inCh);
            } else {
              if (inCh.big_quotes)          targetCh.big_quotes          = inCh.big_quotes;
              if (inCh.philosophical_quotes) targetCh.philosophical_quotes = inCh.philosophical_quotes;
            }
          });

          dbSaveBook(target, function() {
            saved++;
            if (saved === total) finishLoad(booksToAdd);
          });
        });
      });

    } catch(err) {
      showToast('⚠️ Invalid JSON file.');
    }
  };
  r.readAsText(file, 'UTF-8');
}

function finishLoad(booksAdded) {
  refreshFromDB(function() {
    showToast('✅ Merged ' + booksAdded.length + ' book(s): ' + booksAdded.map(function(b){ return b.title; }).join(', '));
  });
}

/* ── Toggle selection state without deleting data ────────────────────── */
function toggleBookSelection(e, idx) {
  e.stopPropagation();
  var book = data.books[idx];
  book.isSelected = !book.isSelected;
  dbSaveBook(book, function() {
    refreshFromDB();
  });
}

/* ── Refresh in-memory data from DB, then re-render ─────────────────── */
function refreshFromDB(callback) {
  dbLoadAllBooks(function(books) {
    data.books = books;
    var sb = document.getElementById('sidebar');
    sb.style.display = 'flex';
    renderBookList();
    if (typeof callback === 'function') callback();
  });
}

/* ── App init: load whatever is already in IndexedDB ─────────────────── */
(function() {
  dbLoadAllBooks(function(books) {
    data.books = books;
    var sb = document.getElementById('sidebar');
    sb.style.display = 'flex';
    switchTab('books');
    if (data.books.length) selectBook(0);
    else showUploadPrompt();
  });
})();

/* ── Tabs ────────────────────────────────────────────────────────────── */
function switchTab(tab) {
  currentTab = tab;
  ['books', 'chars', 'themes', 'random'].forEach(function(t) {
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
  });
  if (tab === 'books')        renderBookList();
  else if (tab === 'chars')   renderCharList();
  else if (tab === 'themes')  renderThemeList();
  else { document.getElementById('sidebar-body').innerHTML = ''; showRandom(); }
}

/* ── Book list (with selection status checkbox controls) ─────────────── */
function renderBookList() {
  var body = document.getElementById('sidebar-body');
  var html = ''
    + '<div style="padding:6px 4px 10px">'
    + '  <label style="display:flex;align-items:center;justify-content:center;gap:6px;'
    + '    padding:7px 0;border:1px dashed var(--border);border-radius:8px;cursor:pointer;'
    + '    font-size:0.76rem;color:var(--text-dim);transition:border-color .2s;" '
    + '    onmouseover="this.style.borderColor=\'var(--gold-dim)\'" '
    + '    onmouseout="this.style.borderColor=\'var(--border)\'">'
    + '    📂 Add book JSON'
    + '    <input type="file" accept=".json" style="display:none" onchange="loadFile(event)">'
    + '  </label>'
    + '</div>';

  if (!data.books.length) {
    html += '<div class="empty" style="padding:20px 10px"><div class="icon">📭</div>No books loaded yet.</div>';
    body.innerHTML = html;
    return;
  }

  html += '<div class="section-label">Loaded Books</div>';
  data.books.forEach(function(b, i) {
    var isChecked = b.isSelected !== false;
    var displayIndex = b.bookOrder || (i + 1);
    
    html += '<div class="book-item' + (activeBook === i ? ' active' : '') + '" '
          + 'style="display:flex;align-items:flex-start;gap:8px;" '
          + 'onclick="selectBook(' + i + ')">'
          + '  <input type="checkbox" ' + (isChecked ? 'checked' : '') + ' '
          + '    style="margin-top:10px; cursor:pointer;" onclick="toggleBookSelection(event, ' + i + ')" title="Toggle Load State">'
          + '  <div style="min-width:0; flex:1;' + (!isChecked ? 'opacity:0.4;' : '') + '">'
          + '    <div class="book-num">Book ' + displayIndex + '</div>'
          + '    <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(b.title) + '</div>'
          + '  </div>'
          + '  <button onclick="deleteBook(event,' + i + ')" title="Remove" '
          + '    style="flex-shrink:0;background:none;border:none;cursor:pointer;color:var(--text-dim);'
          + '    font-size:0.8rem;padding:2px 4px;line-height:1;border-radius:4px;margin-top:2px;" '
          + '    onmouseover="this.style.color=\'#e06060\'" onmouseout="this.style.color=\'var(--text-dim)\'">✕</button>'
          + '</div>';

    /* Inline chapter rendering tracking context active block constraints */
    if (activeBook === i && b.chapters && isChecked) {
      html += '<div style="padding-left:24px"><div class="section-label">Chapters</div>';
      b.chapters.forEach(function(ch, j) {
        html += '<div class="chapter-item' + (activeChapter === j ? ' active' : '') + '" '
              + 'onclick="selectChapter(' + j + ');event.stopPropagation()">'
              + esc(ch.chapter) + '</div>';
      });
      html += '</div>';
    }
  });

  body.innerHTML = html;
}

/* ── Delete a book ───────────────────────────────────────────────────── */
function deleteBook(e, i) {
  e.stopPropagation();
  var title = data.books[i].title;
  if (!confirm('Remove "' + title + '" from your library?')) return;
  dbDeleteBook(title, function() {
    var wasActive = (activeBook === i);
    refreshFromDB(function() {
      if (wasActive) {
        activeBook = null; activeChapter = null;
        if (data.books.length) selectBook(0);
        else showUploadPrompt();
      }
      showToast('🗑️ "' + title + '" removed.');
    });
  });
}

/* ── Character list (excludes unchecked books) ───────────────────────── */
function buildCharMap() {
  var chars = {}, order = [];
  data.books.forEach(function(b) {
    if (b.isSelected === false) return; // Skip excluded books
    b.chapters && b.chapters.forEach(function(ch) {
      ch.big_quotes && ch.big_quotes.forEach(function(q) {
        if (!q.character_name) return;
        if (!chars[q.character_name]) { chars[q.character_name] = { count:0, role:'' }; order.push(q.character_name); }
        chars[q.character_name].count++;
      });
      ch.philosophical_quotes && ch.philosophical_quotes.forEach(function(q) {
        if (!q.character_name) return;
        if (!chars[q.character_name]) { chars[q.character_name] = { count:0, role:'' }; order.push(q.character_name); }
        chars[q.character_name].count++;
      });
      ch.characters && ch.characters.forEach(function(c) {
        if (chars[c.name] && !chars[c.name].role) chars[c.name].role = c.role || '';
      });
    });
  });
  var seen = {}, dedupe = [];
  order.forEach(function(n) { if (!seen[n]) { seen[n] = 1; dedupe.push(n); } });
  if (charSort === 'az')    _charList = dedupe.slice().sort(function(a,b){ return a.localeCompare(b,'ta'); });
  else if (charSort === 'za')    _charList = dedupe.slice().sort(function(a,b){ return b.localeCompare(a,'ta'); });
  else if (charSort === 'count') _charList = dedupe.slice().sort(function(a,b){ return chars[b].count - chars[a].count; });
  else _charList = dedupe;
  return chars;
}

function setCharSort(s) { charSort = s; renderCharList(); }

function renderCharList() {
  var chars = buildCharMap();
  var html = '<div class="char-sort-bar">'
    + '<button class="sort-btn' + (charSort==='default'?' active':'') + '" onclick="setCharSort(\'default\')">Default</button>'
    + '<button class="sort-btn' + (charSort==='az'?' active':'')      + '" onclick="setCharSort(\'az\')">A → Z</button>'
    + '<button class="sort-btn' + (charSort==='za'?' active':'')      + '" onclick="setCharSort(\'za\')">Z → A</button>'
    + '<button class="sort-btn' + (charSort==='count'?' active':'')   + '" onclick="setCharSort(\'count\')"># Quotes</button>'
    + '</div><div class="section-label">Characters</div>';
  
  if (!_charList.length) {
    html += '<div class="empty" style="padding:20px 10px"><div class="icon">👤</div>No active characters found.</div>';
    document.getElementById('sidebar-body').innerHTML = html;
    return;
  }

  _charList.forEach(function(name, idx) {
    var info = chars[name];
    html += '<div class="char-item' + (activeChar === name ? ' active' : '') + '" onclick="selectCharByIndex(' + idx + ')">'
          + '<div class="char-left"><span>' + esc(name) + '</span>'
          + (info.role ? '<span class="char-role">' + esc(info.role) + '</span>' : '') + '</div>'
          + '<span class="char-badge">' + info.count + '</span></div>';
  });
  document.getElementById('sidebar-body').innerHTML = html;
}

function selectCharByIndex(idx) { selectChar(_charList[idx]); }

/* ── Theme list (excludes unchecked books) ───────────────────────────── */
function buildThemeMap() {
  var themes = {}, order = [];
  data.books.forEach(function(b) {
    if (b.isSelected === false) return; // Skip excluded books
    b.chapters && b.chapters.forEach(function(ch) {
      ch.philosophical_quotes && ch.philosophical_quotes.forEach(function(q) {
        if (!q.theme) return;
        if (!themes[q.theme]) { themes[q.theme] = []; order.push(q.theme); }
        themes[q.theme].push({
          quote: q.quote, character_name: q.character_name,
          chapter: ch.chapter, book: b.title,
          theme: q.theme, texture: q.texture, isPhil: true
        });
      });
    });
  });
  return { themes: themes, order: order };
}

function renderThemeList() {
  var result = buildThemeMap();
  var html = '<div class="section-label">Themes</div>';
  if (!result.order.length) {
    html += '<div class="empty" style="padding:20px 10px"><div class="icon">🏷</div>No philosophical quotes active.</div>';
    document.getElementById('sidebar-body').innerHTML = html;
    return;
  }
  result.order.forEach(function(theme) {
    var count = result.themes[theme].length;
    html += '<div class="char-item" onclick="selectTheme(\'' + esc(theme) + '\')">'
          + '<div class="char-left"><span>' + esc(theme) + '</span></div>'
          + '<span class="char-badge">' + count + '</span></div>';
  });
  document.getElementById('sidebar-body').innerHTML = html;
}

function selectTheme(theme) {
  var result = buildThemeMap();
  var quotes = result.themes[theme] || [];
  document.querySelectorAll('#sidebar-body .char-item').forEach(function(el) {
    el.classList.toggle('active', el.textContent.trim().startsWith(theme));
  });
  renderQuotes(quotes, '🏷 ' + theme, quotes.length + ' philosophical quotes');
  closeSidebar();
}

/* ── Selectors ───────────────────────────────────────────────────────── */
function selectBook(i) {
  activeBook = i; activeChapter = null; activeChar = null;
  renderBookList();
  var book = data.books[i], quotes = [];
  
  if (book.isSelected === false) {
    renderQuotes([], esc(book.title), 'Book is unselected / excluded from view');
    closeSidebar();
    return;
  }

  book.chapters && book.chapters.forEach(function(ch) {
    ch.big_quotes && ch.big_quotes.forEach(function(q) {
      quotes.push({ quote:q.quote, character_name:q.character_name, chapter:ch.chapter, book:book.title });
    });
    ch.philosophical_quotes && ch.philosophical_quotes.forEach(function(q) {
      quotes.push({ quote:q.quote, character_name:q.character_name, chapter:ch.chapter, book:book.title,
                    theme:q.theme, texture:q.texture, isPhil:true });
    });
  });
  renderQuotes(quotes, esc(book.title), quotes.length + ' quotes');
  closeSidebar();
}

function selectChapter(j) {
  activeChapter = j;
  var book = data.books[activeBook], ch = book.chapters[j], quotes = [];
  renderBookList();
  (ch.big_quotes || []).forEach(function(q) {
    quotes.push({ quote:q.quote, character_name:q.character_name, chapter:ch.chapter, book:book.title });
  });
  (ch.philosophical_quotes || []).forEach(function(q) {
    quotes.push({ quote:q.quote, character_name:q.character_name, chapter:ch.chapter, book:book.title,
                  theme:q.theme, texture:q.texture, isPhil:true });
  });
  renderQuotes(quotes, esc(book.title) + ' &mdash; ' + esc(ch.chapter), quotes.length + ' quotes');
  closeSidebar();
}

function selectChar(name) {
  activeChar = name; activeBook = null; activeChapter = null;
  renderCharList();
  var quotes = [];
  data.books.forEach(function(b) {
    if (b.isSelected === false) return; // Skip unselected books
    b.chapters && b.chapters.forEach(function(ch) {
      ch.big_quotes && ch.big_quotes.forEach(function(q) {
        if (q.character_name === name)
          quotes.push({ quote:q.quote, character_name:q.character_name, chapter:ch.chapter, book:b.title });
      });
      ch.philosophical_quotes && ch.philosophical_quotes.forEach(function(q) {
        if (q.character_name === name)
          quotes.push({ quote:q.quote, character_name:q.character_name, chapter:ch.chapter, book:b.title,
                        theme:q.theme, texture:q.texture, isPhil:true });
      });
    });
  });
  renderQuotes(quotes, esc(name), quotes.length + ' quotes');
  closeSidebar();
}

/* ── Render quotes ───────────────────────────────────────────────────── */
function renderQuotes(quotes, title, meta) {
  currentQuotes = quotes;
  var c = document.getElementById('content');
  if (!quotes.length) {
    c.innerHTML = '<div class="content-header"><div><div class="content-title">' + title + '</div>'
      + '<div class="content-meta">' + meta + '</div></div></div>'
      + '<div class="empty"><div class="icon">🔍</div>No quotes found.</div>';
    return;
  }
  var html = '<div class="content-header"><div><div class="content-title">' + title + '</div>'
    + '<div class="content-meta">' + meta + '</div></div></div><div class="quotes-grid">';
  quotes.forEach(function(q, idx) {
    var isPhil = !!q.isPhil;
    html += '<div class="quote-card' + (isPhil ? ' is-phil' : '') + '">';
    html += '<div class="quote-text">' + esc(q.quote) + '</div>'
          + '<div class="quote-footer">'
          + '<span class="quote-char">' + esc(q.character_name || 'Unknown') + '</span>'
          + '<span class="quote-loc">' + (q.book ? esc(q.book) + ' &middot; ' : '') + esc(q.chapter || '') + '</span>'
          + '</div>'
          + '<div class="quote-actions">';
    if (isPhil && q.theme) {
      html += '<span class="theme-badge">' + esc(q.theme) + '</span>';
    }
    if (isPhil && q.texture) {
      html += '<span class="texture-label">' + esc(q.texture) + '</span>';
    }
    html += '<button class="export-btn" onclick="openExport(' + idx + ')">📸 Save as Image</button>'
          + '</div>'
          + '</div>';
  });
  html += '</div>';
  c.innerHTML = html;
}

/* ── Upload prompt (shown when DB is empty) ──────────────────────────── */
function showUploadPrompt() {
  document.getElementById('content').innerHTML =
    '<div class="upload-wrap">'
    + '<div class="upload-area" onclick="document.getElementById(\'mainFileInput\').click()">'
    + '<div class="upload-icon">📖</div>'
    + '<div class="upload-title">Load a book JSON</div>'
    + '<div class="upload-sub">Upload books via the Books sidebar, or click here to start.</div>'
    + '<button class="upload-btn" onclick="event.stopPropagation();document.getElementById(\'mainFileInput\').click()">Choose File</button>'
    + '<input type="file" id="mainFileInput" accept=".json" style="display:none" onchange="loadFile(event)">'
    + '</div></div>';
}

/* ── Random (excludes unchecked books) ───────────────────────────────── */
function showRandom() {
  if (!data.books.length) {
    document.getElementById('content').innerHTML =
      '<div class="empty"><div class="icon">📭</div>No books loaded yet.</div>';
    return;
  }
  var all = [];
  data.books.forEach(function(b) {
    if (b.isSelected === false) return; // Skip excluded books
    b.chapters && b.chapters.forEach(function(ch) {
      ch.big_quotes && ch.big_quotes.forEach(function(q) {
        all.push({ quote:q.quote, character_name:q.character_name, chapter:ch.chapter, book:b.title });
      });
      ch.philosophical_quotes && ch.philosophical_quotes.forEach(function(q) {
        all.push({ quote:q.quote, character_name:q.character_name, chapter:ch.chapter, book:b.title,
                   theme:q.theme, texture:q.texture, isPhil:true });
      });
    });
  });
  if (!all.length) {
    document.getElementById('content').innerHTML = '<div class="empty"><div class="icon">🎲</div>No active quotes found. Enable books in the sidebar.</div>';
    return;
  }
  var pick = all[Math.floor(Math.random() * all.length)];
  currentQuotes = [pick];
  var actionsHtml = '';
  if (pick.isPhil && pick.theme)   actionsHtml += '<span class="theme-badge">' + esc(pick.theme) + '</span>';
  if (pick.isPhil && pick.texture) actionsHtml += '<span class="texture-label">' + esc(pick.texture) + '</span>';
  actionsHtml += '<button class="export-btn" onclick="openExport(0)">📸 Save as Image</button>';
  document.getElementById('content').innerHTML =
    '<div class="content-header"><div><div class="content-title">Random Quote</div></div>'
    + '<button class="random-btn" onclick="showRandom()"><span>🎲</span> Another</button></div>'
    + '<div class="random-card' + (pick.isPhil ? ' is-phil' : '') + '">'
    + '<div class="random-loc-badge">' + esc(pick.book) + ' &middot; ' + esc(pick.chapter) + '</div>'
    + '<div class="quote-text">' + esc(pick.quote) + '</div>'
    + '<div class="quote-footer"><span class="quote-char">' + esc(pick.character_name || 'Unknown') + '</span></div>'
    + '<div class="quote-actions" style="margin-top:12px">' + actionsHtml + '</div>'
    + '</div>';
}

/* ── Toast notification ──────────────────────────────────────────────── */
function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);'
      + 'background:var(--surface);border:1px solid var(--border);color:var(--text);'
      + 'padding:9px 18px;border-radius:20px;font-size:0.82rem;z-index:999;'
      + 'opacity:0;transition:opacity .3s,transform .3s;pointer-events:none;white-space:nowrap;'
      + 'box-shadow:0 4px 16px rgba(0,0,0,.35);';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(function() {
    t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3000);
}

/* ===== EXPORT ===================================================================== */
function openExport(idx) {
  exportQuote = currentQuotes[idx];
  if (!exportQuote) return;
  buildExportThemeGrid();
  document.getElementById('exportModal').classList.add('show');
  drawPreview();
}
function closeModal() { document.getElementById('exportModal').classList.remove('show'); }

function buildExportThemeGrid() {
  var grid = document.getElementById('exportThemeGrid');
  grid.innerHTML = '';
  EXPORT_THEMES.forEach(function(t, i) {
    var div = document.createElement('div');
    div.className = 'eth-opt' + (i === selectedExportTheme ? ' selected' : '');
    var ps = 'background:' + t.bg + ';';
    if (t.type === 'clouds')    ps = 'background:linear-gradient(180deg,#7597d4,#f5e2d6);';
    else if (t.type === 'mountains') ps = 'background:linear-gradient(180deg,#2b1a3d,#c9646c,#fec389);';
    else if (t.type === 'ocean')     ps = 'background:linear-gradient(180deg,#040d1a,#134e6f);';
    else if (t.type === 'forest')    ps = 'background:linear-gradient(180deg,#051108,#1e462b);';
    div.innerHTML = '<div class="eth-preview" style="' + ps + 'border:1px solid ' + t.border + ';color:' + t.accent + '">' + t.deco + '</div>'
      + '<div style="font-size:0.64rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">' + t.name + '</div>';
    div.onclick = (function(idx) { return function() {
      selectedExportTheme = idx;
      document.querySelectorAll('.eth-opt').forEach(function(el, j) { el.classList.toggle('selected', j === idx); });
      drawPreview();
    }; })(i);
    grid.appendChild(div);
  });
}

/* ── Canvas background drawers ───────────────────────────────────────── */
function drawCloudsBg(ctx, W, H) {
  var g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#7597d4'); g.addColorStop(0.6,'#b1c5e5'); g.addColorStop(1,'#f5e2d6');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  function cloud(cx,cy,s){
    ctx.beginPath();
    ctx.arc(cx,cy,30*s,0,Math.PI*2); ctx.arc(cx+25*s,cy-10*s,42*s,0,Math.PI*2);
    ctx.arc(cx+62*s,cy,32*s,0,Math.PI*2); ctx.arc(cx+31*s,cy+15*s,31*s,0,Math.PI*2);
    ctx.closePath(); ctx.fill();
  }
  cloud(W*0.2,H*0.25,W/600); cloud(W*0.75,H*0.16,W/500);
  cloud(W*0.85,H*0.76,W/550); cloud(W*0.15,H*0.82,W/600);
}
function drawMountainsBg(ctx, W, H) {
  var g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#2b1a3d'); g.addColorStop(0.5,'#5c3a56');
  g.addColorStop(0.8,'#c9646c'); g.addColorStop(1,'#fec389');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = 'rgba(254,210,150,0.55)';
  ctx.beginPath(); ctx.arc(W*0.5,H*0.65,W*0.14,0,Math.PI*2); ctx.fill();
  drawMountainRidge(ctx,W,H,0.62,'rgba(92,58,86,0.5)',40,100);
  drawMountainRidge(ctx,W,H,0.76,'rgba(43,26,61,0.75)',65,200);
  drawMountainRidge(ctx,W,H,0.91,'rgba(18,10,31,0.96)',80,300);
}
function drawMountainRidge(ctx, W, H, sy, color, rough, seed) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0,H);
  var pts = 16, step = W/(pts-1);
  function prng(x){var s=Math.sin(x)*10000;return s-Math.floor(s);}
  for (var i=0;i<pts;i++) ctx.lineTo(i*step, H*sy + prng(seed+i)*rough - rough/2);
  ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
}
function drawOceanBg(ctx, W, H) {
  var g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#040d1a'); g.addColorStop(0.6,'#082545'); g.addColorStop(1,'#134e6f');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  var glow = ctx.createRadialGradient(W*0.5,H*0.4,10,W*0.5,H*0.4,W*0.5);
  glow.addColorStop(0,'rgba(255,255,255,0.12)'); glow.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(0,0,W,H);
  drawWave(ctx,W,H,0.74,'rgba(19,78,111,0.3)',20,0.007,0);
  drawWave(ctx,W,H,0.81,'rgba(12,55,84,0.53)',24,0.009,120);
  drawWave(ctx,W,H,0.89,'rgba(5,25,45,0.88)',16,0.013,240);
}
function drawWave(ctx, W, H, sy, color, amp, freq, phase) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0,H);
  for (var x=0;x<=W;x+=10) ctx.lineTo(x, H*sy + Math.sin(x*freq+phase)*amp);
  ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
}
function drawForestBg(ctx, W, H) {
  var g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#051108'); g.addColorStop(0.7,'#112a18'); g.addColorStop(1,'#1e462b');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  [14,47,72,29,53,81,38,62,95,107].forEach(function(s){
    ctx.beginPath(); ctx.arc(((s*17)%100)/100*W, ((s*33)%100)/100*H*0.48, 1.4, 0, Math.PI*2); ctx.fill();
  });
  drawForestRow(ctx,W,H,0.86,'rgba(10,28,15,0.65)',W*0.06,W*0.13,555);
  drawForestRow(ctx,W,H,0.91,'rgba(4,15,8,0.92)',W*0.08,W*0.17,777);
}
function drawForestRow(ctx, W, H, sy, color, tW, tH, seed) {
  ctx.fillStyle = color;
  function prng(x){var s=Math.sin(x)*10000;return s-Math.floor(s);}
  for (var x=-tW;x<W+tW;x+=tW*0.65){
    var rs=0.72+prng(seed+x)*0.58, h=tH*rs, w=tW*rs;
    drawPineTree(ctx, x+w/2, H*sy+prng(seed+x+2)*(H*0.05), w, h);
  }
}
function drawPineTree(ctx, cx, base, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx,base-h);
  ctx.lineTo(cx-w*0.25,base-h*0.7); ctx.lineTo(cx-w*0.15,base-h*0.7);
  ctx.lineTo(cx-w*0.4,base-h*0.4);  ctx.lineTo(cx-w*0.25,base-h*0.4);
  ctx.lineTo(cx-w*0.5,base);         ctx.lineTo(cx+w*0.5,base);
  ctx.lineTo(cx+w*0.25,base-h*0.4); ctx.lineTo(cx+w*0.4,base-h*0.4);
  ctx.lineTo(cx+w*0.15,base-h*0.7); ctx.lineTo(cx+w*0.25,base-h*0.7);
  ctx.closePath(); ctx.fill();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

/* ── Draw to canvas ──────────────────────────────────────────────────── */
function drawToCanvas(canvas, W, H) {
  var t = EXPORT_THEMES[selectedExportTheme], q = exportQuote;
  var ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;

  if      (t.type === 'clouds')    drawCloudsBg(ctx,W,H);
  else if (t.type === 'mountains') drawMountainsBg(ctx,W,H);
  else if (t.type === 'ocean')     drawOceanBg(ctx,W,H);
  else if (t.type === 'forest')    drawForestBg(ctx,W,H);
  else { ctx.fillStyle = t.bg; ctx.fillRect(0,0,W,H); }

  if (t.glass) {
    ctx.fillStyle = t.glassBg; ctx.strokeStyle = t.glassBorder || t.border;
    ctx.lineWidth = Math.max(1, Math.round(W*0.0015));
    roundRect(ctx, W*0.07, H*0.13, W*0.86, H*0.69, W*0.035);
    ctx.fill(); ctx.stroke();
  }

  var pad = Math.round(W*0.04);
  ctx.strokeStyle = t.border; ctx.lineWidth = W*0.002;
  ctx.strokeRect(pad,pad,W-pad*2,H-pad*2);
  ctx.globalAlpha = 0.2; ctx.lineWidth = W*0.001;
  ctx.strokeRect(pad+W*0.01,pad+W*0.01,W-pad*2-W*0.02,H-pad*2-W*0.02);
  ctx.globalAlpha = 1;

  ctx.font = 'bold ' + Math.round(W*0.028) + 'px serif';
  ctx.fillStyle = t.accent; ctx.textAlign = 'center';
  ctx.fillText('வெண்முரசு', W/2, W*0.09);

  ctx.strokeStyle = t.border; ctx.lineWidth = W*0.001;
  ctx.beginPath(); ctx.moveTo(W*0.2,W*0.105); ctx.lineTo(W*0.8,W*0.105); ctx.stroke();

  ctx.font = Math.round(W*0.11) + 'px serif';
  ctx.fillStyle = t.accent; ctx.globalAlpha = 0.1; ctx.textAlign = 'left';
  ctx.fillText('\u201C', W*0.09, H*0.35);
  ctx.globalAlpha = 1;

  var maxW = W*0.78, maxLines = 10, fsize = Math.round(W*0.035), lineH, lines;
  while (fsize >= Math.round(W*0.018)) {
    ctx.font = fsize + 'px serif'; lineH = Math.round(fsize*1.7);
    lines = wrapText(ctx, q.quote || '', maxW);
    if (lines.length <= maxLines) break;
    fsize -= Math.round(W*0.002);
  }
  ctx.font = fsize + 'px serif'; ctx.fillStyle = t.text; ctx.textAlign = 'center';
  var startY = Math.max(H*0.18, (H - lines.length*lineH)/2 - H*0.06);
  lines.forEach(function(line) { ctx.fillText(line, W/2, startY); startY += lineH; });

  var afterY = startY + H*0.03;
  ctx.strokeStyle = t.border; ctx.lineWidth = W*0.001; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(W/2-W*0.13,afterY); ctx.lineTo(W/2+W*0.13,afterY); ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.font = 'italic ' + Math.round(W*0.026) + 'px serif';
  ctx.fillStyle = t.accent; ctx.textAlign = 'center';
  ctx.fillText('\u2014 ' + (q.character_name || ''), W/2, afterY + H*0.045);

  ctx.font = Math.round(W*0.02) + 'px serif'; ctx.fillStyle = t.meta;
  ctx.fillText((q.book || '') + (q.chapter ? ' \u00B7 ' + q.chapter : ''), W/2, afterY + H*0.085);

  ctx.strokeStyle = t.border; ctx.lineWidth = W*0.001;
  ctx.beginPath(); ctx.moveTo(W*0.2,H-W*0.105); ctx.lineTo(W*0.8,H-W*0.105); ctx.stroke();

  ctx.font = Math.round(W*0.018) + 'px serif'; ctx.fillStyle = t.meta; ctx.globalAlpha = 0.5;
  ctx.fillText('venmurasu.in', W/2, H - W*0.07);
  ctx.globalAlpha = 1;
}

function drawPreview() { drawToCanvas(document.getElementById('previewCanvas'), 540, 540); }

function doExport() {
  var canvas = document.getElementById('exportCanvas');
  drawToCanvas(canvas, 1080, 1080);
  canvas.style.display = 'block';
  var a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'venmurasu_' + (exportQuote.character_name || 'quote').replace(/\s+/g,'_') + '.png';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  canvas.style.display = 'none';
  closeModal();
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function wrapText(ctx, text, maxW) {
  var words = (text || '').split(/\s+/), lines = [], cur = '';
  words.forEach(function(w) {
    var test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW) { if (cur) lines.push(cur); cur = w; }
    else cur = test;
  });
  if (cur) lines.push(cur);
  return lines;
}
function esc(s) {
  return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
}
window.addEventListener('resize', function() { if (window.innerWidth > 700) closeSidebar(); });