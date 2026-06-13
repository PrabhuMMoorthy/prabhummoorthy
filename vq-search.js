/* =====================================================================
   search.js — Fast Local Query Processing and Pagination
   ===================================================================== */

/* Draw the core Search Panel */
function renderSearchTab() {
  var totalActiveBooks = data.books.filter(function(b) { return b.isSelected !== false; }).length;
  var html = '<div class="section-label">Search Library</div>'
    + '<div class="search-sidebar-pane">'
    + '  <div class="search-input-group">'
    + '    <input type="text" id="searchInput" class="search-text-input" placeholder="Enter keyword..." value="' + esc(searchQuery) + '" onkeydown="handleSearchKeyDown(event)">'
    + '  </div>'
    + '  <button class="search-submit-btn" onclick="triggerSearch()">Search</button>'
    + '  <div class="search-meta-indicator">'
    + '    🔍 Searching across <b>' + totalActiveBooks + '</b> active books.<br>'
    + '    Only selected library entries are queried.'
    + '  </div>'
    + '</div>';
  document.getElementById('sidebar-body').innerHTML = html;
}

function handleSearchKeyDown(e) {
  if (e.key === 'Enter') {
    triggerSearch();
  }
}

function triggerSearch() {
  var input = document.getElementById('searchInput');
  if (!input) return;
  searchQuery = input.value.trim();
  if (searchQuery.length === 0) {
    showToast('⚠️ Please enter a keyword to search.');
    return;
  }
  
  executeSearch();
  closeSidebar();
}

/* Execute client-side indexing search block */
function executeSearch() {
  var results = [];
  var qLower = searchQuery.toLowerCase();

  data.books.forEach(function(b) {
    if (b.isSelected === false) return; // Skip deselected structures
    b.chapters && b.chapters.forEach(function(ch) {
      // Search standard quotes
      ch.big_quotes && ch.big_quotes.forEach(function(q) {
        var text = (q.quote || '').toLowerCase();
        var charName = (q.character_name || '').toLowerCase();
        if (text.indexOf(qLower) !== -1 || charName.indexOf(qLower) !== -1) {
          results.push({ quote: q.quote, character_name: q.character_name, chapter: ch.chapter, book: b.title });
        }
      });
      // Search philosophical quotes
      ch.philosophical_quotes && ch.philosophical_quotes.forEach(function(q) {
        var text = (q.quote || '').toLowerCase();
        var charName = (q.character_name || '').toLowerCase();
        var theme = (q.theme || '').toLowerCase();
        var texture = (q.texture || '').toLowerCase();
        if (text.indexOf(qLower) !== -1 || charName.indexOf(qLower) !== -1 || theme.indexOf(qLower) !== -1 || texture.indexOf(qLower) !== -1) {
          results.push({ quote: q.quote, character_name: q.character_name, chapter: ch.chapter, book: b.title, theme: q.theme, texture: q.texture, isPhil: true });
        }
      });
    });
  });

  searchResults = results;
  searchPage = 1;
  renderSearchResults();
}

/* Render outputs structured 100 quotes per page with sliding numeric pagination */
function renderSearchResults() {
  var c = document.getElementById('content');
  var total = searchResults.length;
  var title = 'Search: "' + searchQuery + '"';

  if (total === 0) {
    c.innerHTML = '<div class="content-header"><div><div class="content-title">' + esc(title) + '</div>'
      + '<div class="content-meta">0 quotes matched your keyword</div></div></div>'
      + '<div class="empty"><div class="icon">🔍</div>No matching quotes found inside selected books. Try modifying your query or enabling more books in the sidebar.</div>';
    return;
  }

  var totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  if (searchPage > totalPages) searchPage = totalPages;
  if (searchPage < 1) searchPage = 1;

  var startIdx = (searchPage - 1) * ITEMS_PER_PAGE;
  var endIdx = Math.min(startIdx + ITEMS_PER_PAGE, total);
  var pagedQuotes = searchResults.slice(startIdx, endIdx);

  // Link global scope pointer for exporters (sliced page view)
  currentQuotes = pagedQuotes;

  var metaText = 'Showing ' + (startIdx + 1) + ' - ' + endIdx + ' of ' + total + ' matching quotes';

  var html = '<div class="content-header"><div><div class="content-title">' + esc(title) + '</div>'
    + '<div class="content-meta">' + metaText + '</div></div></div><div class="quotes-grid">';

  pagedQuotes.forEach(function(q, idx) {
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

  // Display fully interactive sliding numeric pagination for search tab
  if (totalPages > 1) {
    html += '<div class="pagination">'
      + '  <button class="pagination-btn" onclick="changeSearchPage(-1)" ' + (searchPage === 1 ? 'disabled' : '') + '>◀ Prev</button>';

    var maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (var p = 1; p <= totalPages; p++) {
        var isActive = (p === searchPage);
        var activeClass = isActive ? ' active' : '';
        html += '  <button class="pagination-btn' + activeClass + '" onclick="goToSearchPage(' + p + ')">' + p + '</button>';
      }
    } else {
      var half = 2;
      var startPage = Math.max(2, searchPage - half);
      var endPage = Math.min(totalPages - 1, searchPage + half);

      if (searchPage <= 3) {
        endPage = 1 + half * 2;
      }
      if (searchPage >= totalPages - 2) {
        startPage = totalPages - half * 2;
      }

      // Page 1 Anchor
      var p1Active = (searchPage === 1) ? ' active' : '';
      html += '  <button class="pagination-btn' + p1Active + '" onclick="goToSearchPage(1)">1</button>';

      if (startPage > 2) {
        html += '  <span class="pagination-ellipsis">...</span>';
      }

      for (var p = startPage; p <= endPage; p++) {
        if (p > 1 && p < totalPages) {
          var isActive = (p === searchPage);
          var activeClass = isActive ? ' active' : '';
          html += '  <button class="pagination-btn' + activeClass + '" onclick="goToSearchPage(' + p + ')">' + p + '</button>';
        }
      }

      if (endPage < totalPages - 1) {
        html += '  <span class="pagination-ellipsis">...</span>';
      }

      // Final Page Anchor
      var pLastActive = (searchPage === totalPages) ? ' active' : '';
      html += '  <button class="pagination-btn' + pLastActive + '" onclick="goToSearchPage(' + totalPages + ')">' + totalPages + '</button>';
    }

    html += '  <button class="pagination-btn" onclick="changeSearchPage(1)" ' + (searchPage === totalPages ? 'disabled' : '') + '>Next ▶</button>'
      + '</div>';
  }

  c.innerHTML = html;
  c.scrollTop = 0; // Scroll back to container top cleanly
}

function goToSearchPage(pageNum) {
  var total = searchResults.length;
  var totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  if (pageNum >= 1 && pageNum <= totalPages) {
    searchPage = pageNum;
    renderSearchResults();
    var contentEl = document.getElementById('content');
    if (contentEl) contentEl.scrollTop = 0;
  }
}

function changeSearchPage(delta) {
  var total = searchResults.length;
  var totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  var newPage = searchPage + delta;
  if (newPage >= 1 && newPage <= totalPages) {
    searchPage = newPage;
    renderSearchResults();
    var contentEl = document.getElementById('content');
    if (contentEl) contentEl.scrollTop = 0;
  }
}