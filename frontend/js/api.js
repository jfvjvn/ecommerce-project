const API = "";

function getToken() { return localStorage.getItem("token"); }
function getUser() { return JSON.parse(localStorage.getItem("user") || "null"); }
function isLoggedIn() { return !!getToken(); }
function isAdmin() { const u = getUser(); return u && u.role === "admin"; }

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login.html";
}

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function requireAuth() {
  if (!isLoggedIn()) { window.location.href = "/login.html"; return false; }
  return true;
}

function requireAdmin() {
  if (!isLoggedIn()) { window.location.href = "/login.html"; return false; }
  if (!isAdmin()) { window.location.href = "/index.html"; return false; }
  return true;
}

function renderNav(activePage) {
  const user = getUser();
  const loggedIn = isLoggedIn();
  const admin = isAdmin();
  return `
    <nav class="navbar">
      <a href="/index.html" class="nav-brand">
        <span class="brand-icon">✦</span> ShopKart
      </a>
      <div class="nav-links">
        <a href="/index.html" ${activePage==="home"?'class="active"':""}>Shop</a>
        ${loggedIn ? `<a href="/cart.html" ${activePage==="cart"?'class="active"':""}>Cart</a>` : ""}
        ${loggedIn ? `<a href="/orders.html" ${activePage==="orders"?'class="active"':""}>Orders</a>` : ""}
        ${admin ? `<a href="/admin.html" class="nav-admin ${activePage==="admin"?"active":""}">⚙ Admin</a>` : ""}
      </div>
      <div class="nav-actions">
        ${loggedIn
          ? `<span class="nav-user">${user.name}${admin?' <span class="admin-badge">Admin</span>':''}</span>
             <button onclick="logout()" class="btn-logout">Sign out</button>`
          : `<a href="/login.html" class="btn-login ${activePage==="login"?"active":""}">Login</a>
             <a href="/register.html" class="btn-register">Get Started</a>`
        }
      </div>
    </nav>`;
}

function showToast(msg, type = "success") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

const BASE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Outfit:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #f7f5f0;
    --bg2: #eeeae2;
    --surface: #ffffff;
    --border: #e0dbd0;
    --border2: #ccc8bc;
    --accent: #c8873a;
    --accent-dark: #a86820;
    --accent-light: #fdf3e7;
    --text: #1a1714;
    --text2: #5a5550;
    --muted: #9a9590;
    --red: #c0392b;
    --red-light: #fdf0ee;
    --green: #2d7a4f;
    --green-light: #edf7f2;
    --radius: 10px;
    --shadow: 0 2px 12px rgba(0,0,0,0.07);
    --shadow-lg: 0 8px 30px rgba(0,0,0,0.1);
  }
  body { background: var(--bg); color: var(--text); font-family: 'Outfit', sans-serif; min-height: 100vh; }
  h1,h2,h3,h4 { font-family: 'Playfair Display', serif; }

  .navbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 2.5rem; height: 66px;
    background: var(--surface); border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 100;
    box-shadow: 0 1px 8px rgba(0,0,0,0.05);
  }
  .nav-brand {
    font-family: 'Playfair Display', serif; font-weight: 800; font-size: 1.25rem;
    color: var(--text); text-decoration: none; display: flex; align-items: center; gap: 0.4rem;
  }
  .brand-icon { color: var(--accent); font-size: 1rem; }
  .nav-links { display: flex; align-items: center; gap: 0.3rem; }
  .nav-links a {
    color: var(--text2); text-decoration: none; font-size: 0.9rem; font-weight: 500;
    padding: 0.4rem 0.8rem; border-radius: 6px; transition: all 0.2s;
  }
  .nav-links a:hover { background: var(--bg2); color: var(--text); }
  .nav-links a.active { color: var(--accent); font-weight: 600; }
  .nav-admin { color: var(--accent) !important; }
  .admin-badge {
    background: var(--accent); color: #fff; font-size: 0.65rem; font-family: 'Outfit', sans-serif;
    font-weight: 600; padding: 0.1rem 0.45rem; border-radius: 20px; vertical-align: middle; margin-left: 3px;
  }
  .nav-actions { display: flex; align-items: center; gap: 0.8rem; }
  .nav-user { font-size: 0.85rem; color: var(--text2); font-weight: 500; }
  .btn-logout {
    background: none; border: 1px solid var(--border2); color: var(--text2);
    padding: 0.35rem 0.9rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;
    font-family: 'Outfit', sans-serif; transition: all 0.2s;
  }
  .btn-logout:hover { border-color: var(--red); color: var(--red); background: var(--red-light); }
  .btn-login { color: var(--text2) !important; font-weight: 500 !important; }
  .btn-register {
    background: var(--accent) !important; color: #fff !important;
    padding: 0.4rem 1rem !important; border-radius: 6px; font-weight: 600 !important;
  }
  .btn-register:hover { background: var(--accent-dark) !important; }

  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
    padding: 0.6rem 1.3rem; border-radius: var(--radius); border: none; cursor: pointer;
    font-family: 'Outfit', sans-serif; font-size: 0.9rem; font-weight: 600; transition: all 0.2s;
    text-decoration: none;
  }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover { background: var(--accent-dark); transform: translateY(-1px); box-shadow: var(--shadow); }
  .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }
  .btn-danger { background: var(--red-light); border: 1px solid #e8b4ae; color: var(--red); }
  .btn-danger:hover { background: var(--red); color: #fff; }
  .btn-outline { background: transparent; border: 1px solid var(--border2); color: var(--text2); }
  .btn-outline:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
  .btn-sm { padding: 0.35rem 0.8rem; font-size: 0.82rem; }

  .container { max-width: 1200px; margin: 0 auto; padding: 2rem 2.5rem; }
  .page-title { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 0.3rem; }
  .page-sub { color: var(--muted); margin-bottom: 1.8rem; font-size: 0.9rem; }

  .field { margin-bottom: 1.1rem; }
  .field label { display: block; font-size: 0.78rem; color: var(--text2); margin-bottom: 0.35rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .field input, .field textarea, .field select {
    width: 100%; background: var(--bg); border: 1.5px solid var(--border);
    border-radius: 8px; padding: 0.7rem 1rem; color: var(--text);
    font-family: 'Outfit', sans-serif; font-size: 0.92rem; outline: none; transition: border-color 0.2s;
  }
  .field input:focus, .field textarea:focus, .field select:focus { border-color: var(--accent); background: #fff; }
  .field textarea { resize: vertical; min-height: 80px; }

  .error-box { background: var(--red-light); border: 1px solid #e8b4ae; color: var(--red); border-radius: 8px; padding: 0.7rem 1rem; font-size: 0.88rem; margin-bottom: 1rem; display: none; }
  .success-box { background: var(--green-light); border: 1px solid #a8d9be; color: var(--green); border-radius: 8px; padding: 0.7rem 1rem; font-size: 0.88rem; margin-bottom: 1rem; display: none; }

  .toast {
    position: fixed; bottom: 2rem; right: 2rem; padding: 0.85rem 1.5rem;
    border-radius: var(--radius); font-size: 0.9rem; z-index: 9999;
    animation: slideUp 0.3s ease; box-shadow: var(--shadow-lg); font-weight: 500;
  }
  .toast.success { background: var(--green); color: #fff; }
  .toast.error { background: var(--red); color: #fff; }
  @keyframes slideUp { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }

  .spinner { display: flex; justify-content: center; align-items: center; padding: 4rem; color: var(--muted); font-size: 1.5rem; gap: 0.5rem; }
  .spin { animation: spin 1s linear infinite; display: inline-block; }
  @keyframes spin { to{transform:rotate(360deg);} }

  .empty-state { text-align: center; padding: 4rem 2rem; color: var(--muted); }
  .empty-state .icon { font-size: 2.5rem; margin-bottom: 1rem; }
  .empty-state p { margin-bottom: 1.5rem; font-size: 1rem; }
  .empty-state a { color: var(--accent); text-decoration: none; font-weight: 600; }

  .status-badge { padding: 0.22rem 0.65rem; border-radius: 20px; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; display: inline-block; }
  .status-pending { background: #fef3e2; color: #b45309; }
  .status-processing { background: #eff6ff; color: #1d4ed8; }
  .status-shipped { background: #f0fdf4; color: #166534; }
  .status-delivered { background: #dcfce7; color: #15803d; }
  .status-cancelled { background: var(--red-light); color: var(--red); }
`;
