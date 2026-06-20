/* =====================================================================
   navigation.js — Reusable Sidebar Navigation Element
   ===================================================================== */

const links = [
  { href: 'index.html', icon: '🏠', text: 'Home Launcher' },
  { href: 'my-youtube.html', icon: '📺', text: 'My Channels' },
  { href: 'quotes.html', icon: '✏️', text: 'Quote Maker', badge: 'NEW' },
  { href: 'vq-venmurasu_html.html', icon: '✍️', text: 'Venmurasu Quote Reader', badge: 'NEW' },
  { href: 'notepad.html', icon: '🗒️', text: 'Notepad++' },
  { href: 'comparator.html', icon: '🗒️', text: 'Text Comparator' },
  { href: 'loan.html', icon: '💰️', text: 'Loan Simulator' },
  { href: 'chat.html', icon: '⚡', text: 'P2P Share & Chat' },
  { href: 'venmurasu-quote-reader.html', icon: '✍️', text: 'Venmurasu Quote Reader (Legacy)' }
];

const styles = `
  #nav-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    z-index: 999998;
  }
  #nav-overlay.open {
    display: block;
  }
  #side-nav {
    position: fixed;
    top: 0;
    right: -280px;
    width: 260px;
    height: 100%;
    background: #141414;
    border-left: 1px solid #2a2a2a;
    z-index: 999999;
    transition: right 0.28s cubic-bezier(.4, 0, .2, 1);
    display: flex;
    flex-direction: column;
    padding: 0 0 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #fff;
    box-sizing: border-box;
    text-align: left;
  }
  #side-nav * {
    box-sizing: border-box;
  }
  #side-nav.open {
    right: 0;
  }
  .nav-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    border-bottom: 1px solid #2a2a2a;
  }
  .nav-header span {
    font-size: 0.8rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-weight: 600;
  }
  #nav-close {
    background: none;
    border: none;
    color: #555;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 4px;
    line-height: 1;
    transition: color 0.15s;
  }
  #nav-close:hover {
    color: #fff;
  }
  .nav-section-label {
    font-size: 0.68rem;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    padding: 18px 20px 8px;
    font-weight: 700;
  }
  .nav-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 20px;
    color: #bbb;
    text-decoration: none;
    font-size: 0.92rem;
    transition: background 0.15s, color 0.15s;
    line-height: 1.4;
  }
  .nav-link:hover {
    background: #1e1e1e;
    color: #fff;
  }
  .nav-link.active {
    color: #ff0000;
    background: #1e1e1e;
    font-weight: 600;
  }
  .nav-link .nav-icon {
    font-size: 1rem;
    width: 22px;
    text-align: center;
    display: inline-block;
  }
  .nav-link .nav-badge {
    margin-left: auto;
    background: #ff0000;
    color: #fff;
    font-size: 0.6rem;
    padding: 2px 6px;
    border-radius: 8px;
    font-weight: 700;
  }
  .nav-divider {
    border: none;
    border-top: 1px solid #222;
    margin: 8px 0;
  }
  
  /* Fallback Menu Button Styling */
  #nav-toggle {
    background: none;
    border: none;
    color: #ccc;
    font-size: 1.3rem;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background 0.15s, color 0.15s;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  #nav-toggle:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }
`;

function initNavigation() {
  if (document.getElementById('side-nav')) return;

  // 1. Inject CSS Styles
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // 2. Create Overlay Element
  const overlay = document.createElement('div');
  overlay.id = 'nav-overlay';
  document.body.appendChild(overlay);

  // 3. Create Sidebar Element
  const nav = document.createElement('nav');
  nav.id = 'side-nav';

  // 4. Create Sidebar Header
  const header = document.createElement('div');
  header.className = 'nav-header';
  header.innerHTML = `
    <span>Pages</span>
    <button id="nav-close" title="Close menu">✕</button>
  `;
  nav.appendChild(header);

  // 5. Create Sidebar Label
  const label = document.createElement('div');
  label.className = 'nav-section-label';
  label.textContent = 'Main';
  nav.appendChild(label);

  // 6. Append Links and Detect Active
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  
  links.forEach(link => {
    const a = document.createElement('a');
    a.href = link.href;
    a.className = 'nav-link';
    if (link.href === currentFile) {
      a.classList.add('active');
    }
    a.innerHTML = `
      <span class="nav-icon">${link.icon}</span>
      ${link.text}
      ${link.badge ? `<span class="nav-badge">${link.badge}</span>` : ''}
    `;
    nav.appendChild(a);
  });

  // 7. Append Coming Soon Section
  const divider = document.createElement('hr');
  divider.className = 'nav-divider';
  nav.appendChild(divider);

  const comingLabel = document.createElement('div');
  comingLabel.className = 'nav-section-label';
  comingLabel.textContent = 'Coming Soon';
  nav.appendChild(comingLabel);

  const bookmarkLink = document.createElement('a');
  bookmarkLink.href = '#';
  bookmarkLink.className = 'nav-link';
  bookmarkLink.style.opacity = '0.4';
  bookmarkLink.style.pointerEvents = 'none';
  bookmarkLink.innerHTML = `<span class="nav-icon">📌</span> Bookmarks`;
  nav.appendChild(bookmarkLink);

  const notesLink = document.createElement('a');
  notesLink.href = '#';
  notesLink.className = 'nav-link';
  notesLink.style.opacity = '0.4';
  notesLink.style.pointerEvents = 'none';
  notesLink.innerHTML = `<span class="nav-icon">🗒️</span> Notes`;
  nav.appendChild(notesLink);

  document.body.appendChild(nav);

  // 8. Auto-Inject Hamburger Button to <header> if missing
  let toggleBtn = document.getElementById('nav-toggle');
  if (!toggleBtn) {
    const headerEl = document.querySelector('header');
    if (headerEl) {
      toggleBtn = document.createElement('button');
      toggleBtn.id = 'nav-toggle';
      toggleBtn.title = 'Menu';
      toggleBtn.innerHTML = '☰';
      headerEl.appendChild(toggleBtn);
    }
  }

  // 9. Attach Event Listeners
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      nav.classList.add('open');
      overlay.classList.add('open');
    });
  }

  const closeBtn = document.getElementById('nav-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      nav.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  overlay.addEventListener('click', () => {
    nav.classList.remove('open');
    overlay.classList.remove('open');
  });
}

// Ensure execution after document body loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigation);
} else {
  initNavigation();
}
