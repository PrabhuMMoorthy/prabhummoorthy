/* =====================================================================
   state.js — Global variables, themes, and configuration state
   ===================================================================== */

var data = { books: [] }; // in-memory working copy
var activeBook = null;
var activeChapter = null;
var activeChar = null;
var currentTab = 'books';

var exportQuote = null;
var selectedExportTheme = 0;
var currentQuotes = [];
var _charList = [];
var charSort = 'default';
var LS_THEME = 'venmurasu_ui_theme';

// Search and pagination state
var searchQuery = '';
var searchPage = 1;
var searchResults = [];
var ITEMS_PER_PAGE = 100;

/* ── Export Themes Configuration ────────────────────────────────────── */
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

/* ── Theme Switcher Interface ────────────────────────────────────────── */
function setTheme(t) {
  document.body.setAttribute('data-theme', t);
  document.querySelectorAll('.theme-dot').forEach(function(d) {
    d.classList.toggle('active', d.getAttribute('data-t') === t);
  });
  try { localStorage.setItem(LS_THEME, t); } catch(e) {}
}

(function() {
  try { 
    var t = localStorage.getItem(LS_THEME); 
    if (t) setTheme(t); 
  } catch(e) {}
})();

/* ── HTML Escaping Utility Helper ────────────────────────────────────── */
function esc(s) {
  return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
}