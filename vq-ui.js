/* =====================================================================
   ui.js — UI Panels, Tabs, File Upload, and Sidebar Controllers
   ===================================================================== */

/* ── Sidebar Actions ─────────────────────────────────────────────────── */
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

/* ── File parsing and verification ───────────────────────────────────── */
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

      if (parsed.books && Array.isArray(parsed.books)) {
        booksToAdd = parsed.books.map(function(b, idx) {
          b.bookOrder = idx + 1;
          if (b.isSelected === undefined) b.isSelected = true;
          return b;
        });
      } else if (parsed.title && parsed.chapters) {
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

function toggleBookSelection(e, idx) {
  e.stopPropagation();
  var book = data.books[idx];
  book.isSelected = !book.isSelected;
  dbSaveBook(book, function() {
    refreshFromDB();
  });
}

function refreshFromDB(callback) {
  dbLoadAllBooks(function(books) {
    data.books = books;
    var sb = document.getElementById('sidebar');
    sb.style.display = 'flex';
    if (currentTab === 'books') renderBookList();
    else if (currentTab === 'chars') renderCharList();
    else if (currentTab === 'themes') renderThemeList();
    else if (currentTab === 'search') renderSearchTab();
    else if (currentTab === 'stats') renderStatsTab();
    if (typeof callback === 'function') callback();
  });
}

/* ── App Initialization ──────────────────────────────────────────────── */
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

/* ── Tab Switcher Routing ────────────────────────────────────────────── */
function switchTab(tab) {
  currentTab = tab;
  ['books', 'chars', 'themes', 'search', 'random', 'stats'].forEach(function(t) {
    var btn = document.getElementById('tab-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'books')        renderBookList();
  else if (tab === 'chars')   renderCharList();
  else if (tab === 'themes')  renderThemeList();
  else if (tab === 'search')  renderSearchTab();
  else if (tab === 'stats')   { document.getElementById('sidebar-body').innerHTML = ''; showStatsPage(); }
  else { document.getElementById('sidebar-body').innerHTML = ''; showRandom(); }
}

/* ── Render Sidebar Book Panel ───────────────────────────────────────── */
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

/* ── Character Panel Controllers ────────────────────────────────────── */
function buildCharMap() {
  var chars = {}, order = [];
  data.books.forEach(function(b) {
    if (b.isSelected === false) return;
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

/* ── Theme Panel Controllers ─────────────────────────────────────────── */
function buildThemeMap() {
  var themes = {}, order = [];
  data.books.forEach(function(b) {
    if (b.isSelected === false) return;
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

/* ── Selection Triggers & Renderers ──────────────────────────────────── */
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
    if (b.isSelected === false) return; // Ignore deselected
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

/* ── Dynamic Randomizers ────────────────────────────────────────────── */
function showRandom() {
  if (!data.books.length) {
    document.getElementById('content').innerHTML =
      '<div class="empty"><div class="icon">📭</div>No books loaded yet.</div>';
    return;
  }
  var all = [];
  data.books.forEach(function(b) {
    if (b.isSelected === false) return; // Skip deselected structures
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

/* ── Stats Page Panel Controller ────────────────────────────────────── */
function renderStatsTab() {
  document.getElementById('sidebar-body').innerHTML = 
    '<div class="section-label">Library Insights</div>' +
    '<div style="padding:10px; color:var(--text-dim); font-size:0.84rem; line-height:1.4;">' +
    '📊 Displays statistical insights calculated from currently uploaded library databases.' +
    '</div>';
}

function showStatsPage() {
  var c = document.getElementById('content');
  if (!data.books.length) {
    c.innerHTML = 
      '<div class="content-header"><div><div class="content-title">Library Statistics</div></div></div>' +
      '<div class="empty"><div class="icon">📊</div>No loaded library data found to compute metrics.</div>';
    return;
  }

  // Statistics calculation parameters
  var totalBooks = data.books.length;
  var activeBooks = data.books.filter(function(b) { return b.isSelected !== false; }).length;
  var totalChapters = 0;
  var activeChapters = 0;
  var charSet = new Set();
  var totalQuotes = 0;
  var narrativeQuotes = 0;
  var philosophicalQuotes = 0;
  var themesSet = new Set();

  data.books.forEach(function(b) {
    var selected = (b.isSelected !== false);
    if (b.chapters) {
      totalChapters += b.chapters.length;
      if (selected) {
        activeChapters += b.chapters.length;
      }

      b.chapters.forEach(function(ch) {
        var big = ch.big_quotes || [];
        var phil = ch.philosophical_quotes || [];

        if (selected) {
          narrativeQuotes += big.length;
          philosophicalQuotes += phil.length;
          totalQuotes += (big.length + phil.length);

          big.forEach(function(q) {
            if (q.character_name) charSet.add(q.character_name.trim());
          });
          phil.forEach(function(q) {
            if (q.character_name) charSet.add(q.character_name.trim());
            if (q.theme) themesSet.add(q.theme.trim());
          });
        }
      });
    }
  });

  var html = 
    '<div class="content-header">' +
    '  <div>' +
    '    <div class="content-title">Library Insights</div>' +
    '    <div class="content-meta">Live metrics across ' + activeBooks + ' active / ' + totalBooks + ' total books</div>' +
    '  </div>' +
    '</div>' +
    '<div class="stats-grid">' +
    '  <div class="stats-card">' +
    '    <div class="stats-val">' + totalBooks + '</div>' +
    '    <div class="stats-lbl">Books Loaded</div>' +
    '  </div>' +
    '  <div class="stats-card">' +
    '    <div class="stats-val">' + totalChapters + '</div>' +
    '    <div class="stats-lbl">Total Chapters</div>' +
    '  </div>' +
    '  <div class="stats-card">' +
    '    <div class="stats-val">' + charSet.size + '</div>' +
    '    <div class="stats-lbl">Distinct Characters</div>' +
    '  </div>' +
    '  <div class="stats-card">' +
    '    <div class="stats-val">' + totalQuotes + '</div>' +
    '    <div class="stats-lbl">Active Quotes</div>' +
    '  </div>' +
    '  <div class="stats-card">' +
    '    <div class="stats-val">' + narrativeQuotes + '</div>' +
    '    <div class="stats-lbl">Narrative Quotes</div>' +
    '  </div>' +
    '  <div class="stats-card">' +
    '    <div class="stats-val">' + philosophicalQuotes + '</div>' +
    '    <div class="stats-lbl">Philosophical Quotes</div>' +
    '  </div>' +
    '  <div class="stats-card" style="grid-column: span 2;">' +
    '    <div class="stats-val">' + themesSet.size + '</div>' +
    '    <div class="stats-lbl">Conceptual Themes</div>' +
    '  </div>' +
    '</div>';

  c.innerHTML = html;
  closeSidebar();
}

/* ── Toast notifications ─────────────────────────────────────────────── */
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

/* ── Export Modals & Configuration ──────────────────────────────────── */
function openExport(idx) {
  exportQuote = currentQuotes[idx];
  if (!exportQuote) return;
  buildExportThemeGrid();
  document.getElementById('exportModal').classList.add('show');
  drawPreview();
}

function closeModal() { 
  document.getElementById('exportModal').classList.remove('show'); 
}

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

window.addEventListener('resize', function() { if (window.innerWidth > 700) closeSidebar(); });
