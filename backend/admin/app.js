const API = '/api';
let state = { page: 'login', admin: null, token: null, products: [], categories: [], product: null };

function $(id) { return document.getElementById(id); }
function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function qsa(sel, ctx) { return (ctx || document).querySelectorAll(sel); }

function toast(msg, type = 'success') {
  const c = document.querySelector('.toast-container') || (() => {
    const d = document.createElement('div'); d.className = 'toast-container';
    document.body.appendChild(d); return d;
  })();
  const t = document.createElement('div'); t.className = `toast toast-${type}`;
  t.textContent = msg; c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

async function api(method, path, body, isFormData) {
  const opts = { method, headers: {} };
  if (state.token) opts.headers['Authorization'] = `Bearer ${state.token}`;
  if (body) {
    if (isFormData) {
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Lỗi không xác định');
  return data;
}

function apiUpload(method, path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${API}${path}`);
    if (state.token) xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (!data.success) reject(new Error(data.error || 'Lỗi không xác định'));
        else resolve(data);
      } catch { reject(new Error('Lỗi phản hồi từ máy chủ')); }
    };
    xhr.onerror = () => reject(new Error('Lỗi kết nối'));
    xhr.send(formData);
  });
}

// ─── ROUTER ───
function navigate(page, params) {
  state.page = page;
  state.params = params;
  render();
}

// ─── AUTH ───
async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const phone = $('login-phone').value;
  const password = $('login-password').value;
  const err = $('login-error');
  err.style.display = 'none';
  if (btn) { (btn).disabled = true; btn.textContent = '⏳ Đang đăng nhập...'; }
  try {
    const data = await api('POST', '/auth/admin/login', { phone, password });
    state.admin = data.data.admin;
    state.token = data.data.token;
    localStorage.setItem('admin_token', state.token);
    localStorage.setItem('admin_user', JSON.stringify(state.admin));
    navigate('dashboard');
  } catch (e) {
    if (btn) { (btn).disabled = false; btn.textContent = 'Đăng nhập'; }
    err.textContent = e.message;
    err.style.display = 'block';
  }
}

function logout() {
  state.admin = null;
  state.token = null;
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  navigate('login');
}

// ─── RENDER ───
function render() {
  const app = $('app');
  if (!state.token) {
    const saved = localStorage.getItem('admin_token');
    if (saved) {
      state.token = saved;
      state.page = 'dashboard';
      try { state.admin = JSON.parse(localStorage.getItem('admin_user')); } catch {}
    }
  }
  if (!state.token || !state.admin) { renderLogin(app); return; }

  if (state.page === 'login') { renderLogin(app); return; }

  const layout = document.createElement('div'); layout.className = 'layout';
  layout.innerHTML = `
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <span>🏪 Hải Sản HN</span>
        <button class="sidebar-close" id="sidebar-close">✕</button>
      </div>
      <div class="sidebar-user">
        <strong>${esc(state.admin.name)}</strong>
        <span>${roleLabel(state.admin.role)} · ${state.admin.phone}</span>
      </div>
      <nav class="sidebar-nav">
        <a href="#" data-page="dashboard" class="${state.page === 'dashboard' ? 'active' : ''}"><span class="icon">📊</span> Tổng quan</a>
        <a href="#" data-page="products" class="${state.page === 'products' || state.page === 'product-edit' ? 'active' : ''}"><span class="icon">🦐</span> Sản phẩm</a>
        <a href="#" data-page="orders" class="${state.page === 'orders' ? 'active' : ''}"><span class="icon">📦</span> Đơn hàng <span id="orders-badge" style="display:none;background:var(--danger);color:white;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:4px"></span><span id="orders-hard-badge" title="Đơn khó nhận ship" style="display:none;background:#7f1d1d;color:white;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:4px">⚠️ <span id="orders-hard-badge-count"></span></span></a>
        <a href="#" data-page="customers" class="${state.page === 'customers' ? 'active' : ''}"><span class="icon">👥</span> Khách hàng</a>
        <a href="#" data-page="vouchers" class="${state.page === 'vouchers' ? 'active' : ''}"><span class="icon">🏷️</span> Khuyến mãi</a>
        <div class="nav-section-label">Giao tiếp & Nội dung</div>
        <a href="#" data-page="inbox" class="${state.page === 'inbox' ? 'active' : ''}" id="nav-inbox"><span class="icon">💬</span> Hộp thư <span id="inbox-unread-badge" style="display:none;background:var(--danger);color:white;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:4px"></span></a>
        <a href="#" data-page="videos" class="${state.page === 'videos' ? 'active' : ''}"><span class="icon">🎬</span> Video sản phẩm</a>
        <div class="nav-section-label">Cấu hình</div>
        <a href="#" data-page="shipping-partners" class="${state.page === 'shipping-partners' ? 'active' : ''}"><span class="icon">🚚</span> Đối tác vận chuyển</a>
        <div class="nav-section-label">Hóa đơn VAT</div>
        <a href="#" data-page="invoice-settings" class="${state.page === 'invoice-settings' ? 'active' : ''}"><span class="icon">⚙️</span> Cấu hình</a>
        <a href="#" data-page="invoice-rules" class="${state.page === 'invoice-rules' ? 'active' : ''}"><span class="icon">📋</span> Quy tắc xuất</a>
        <a href="#" data-page="invoices" class="${state.page === 'invoices' ? 'active' : ''}"><span class="icon">🧾</span> Lịch sử hóa đơn</a>
      </nav>
      <div class="sidebar-footer">
        <a id="logout-btn">🚪 Đăng xuất</a>
      </div>
    </aside>
    <div class="main">
      <div class="topbar">
        <button class="menu-btn" id="menu-btn">☰</button>
        <h2>${pageTitle()}</h2>
      </div>
      <div class="content" id="page-content"></div>
    </div>
  `;
  app.innerHTML = '';
  app.appendChild(layout);

  // Sidebar toggle for mobile
  function closeSidebar() { layout.classList.remove('sidebar-open'); }
  function openSidebar() { layout.classList.add('sidebar-open'); }

  layout.querySelector('#menu-btn')?.addEventListener('click', openSidebar);
  layout.querySelector('#sidebar-close')?.addEventListener('click', closeSidebar);
  layout.querySelector('#sidebar-overlay')?.addEventListener('click', closeSidebar);

  layout.querySelectorAll('[data-page]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); closeSidebar(); navigate(a.dataset.page); });
  });
  layout.querySelector('#logout-btn').addEventListener('click', () => { closeSidebar(); logout(); });

  const content = $('page-content');

  // Stop inbox polling when leaving inbox
  if (state.page !== 'inbox') {
    stopInboxPolling();
  }

  switch (state.page) {
    case 'dashboard': renderDashboard(content); break;
    case 'products': renderProducts(content); break;
    case 'product-edit': renderProductEdit(content); break;
    case 'orders': renderOrders(content); break;
    case 'order-detail': renderOrderDetail(content); break;
    case 'customers': renderCustomers(content); break;
    case 'vouchers': renderVouchers(content); break;
    case 'inbox': renderInbox(content); break;
    case 'videos': renderVideos(content); break;
    case 'shipping-partners': renderShippingPartners(content); break;
    case 'invoice-settings': renderInvoiceSettings(content); break;
    case 'invoice-rules': renderInvoiceRules(content); break;
    case 'invoices': renderInvoices(content); break;
    case 'invoice-detail': renderInvoiceDetail(content); break;
    default: content.innerHTML = '<p>Trang không tồn tại</p>';
  }

  pollUnreadCount();
  pollPendingOrders();
}

let unreadPollTimer = null;
async function pollUnreadCount() {
  if (unreadPollTimer) clearInterval(unreadPollTimer);
  const badge = $('inbox-unread-badge');
  if (!badge) return;
  const poll = async () => {
    try {
      const data = await api('GET', '/chat/admin/unread-count');
      const count = data.data?.count || 0;
      if (count > 0) {
        badge.style.display = 'inline';
        badge.textContent = count;
      } else {
        badge.style.display = 'none';
      }
    } catch {}
  };
  await poll();
  unreadPollTimer = setInterval(poll, 10000);
}

// ─── ĐƠN CHỜ XÁC NHẬN + ĐƠN KHÓ NHẬN SHIP (alert cho admin) ───
let pendingOrdersTimer = null;
let lastPendingCount = -1;
let lastHardShipCount = -1;

function ensureNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

function alertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const play = (freq, start, dur) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.12, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      o.start(start); o.stop(start + dur);
    };
    play(880, ctx.currentTime, 0.18);
    play(1174, ctx.currentTime + 0.22, 0.22);
  } catch {}
}

function notifyAdminNewOrder(count) {
  const msg = `Có ${count} đơn hàng mới đang chờ xác nhận`;
  toast(msg, 'warning');
  alertBeep();
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('📦 Đơn hàng mới', { body: msg, icon: '/admin/logo.png' }); } catch {}
  }
}

function notifyAdminHardShip(count) {
  const msg = `${count} đơn đang khó nhận ship (đã 10 phút chưa có tài xế nhận)`;
  toast(msg, 'error');
  alertBeep();
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('⚠️ Đơn khó nhận ship', { body: msg, icon: '/admin/logo.png' }); } catch {}
  }
}

async function pollPendingOrders() {
  if (pendingOrdersTimer) clearInterval(pendingOrdersTimer);
  const badge = $('orders-badge');
  if (!badge) return;
  const hardBadge = $('orders-hard-badge');
  const hardBadgeCount = $('orders-hard-badge-count');
  const poll = async () => {
    try {
      const data = await api('GET', '/admin/orders/pending-count');
      const count = data.data?.count || 0;
      if (count > 0) {
        badge.style.display = 'inline';
        badge.textContent = count;
        if (lastPendingCount >= 0 && count > lastPendingCount) {
          notifyAdminNewOrder(count);
        }
      } else {
        badge.style.display = 'none';
      }
      const hardShipCount = data.data?.hardShipCount || 0;
      if (hardBadge && hardBadgeCount) {
        if (hardShipCount > 0) {
          hardBadge.style.display = 'inline';
          hardBadgeCount.textContent = hardShipCount;
          if (lastHardShipCount >= 0 && hardShipCount > lastHardShipCount) {
            notifyAdminHardShip(hardShipCount);
          }
        } else {
          hardBadge.style.display = 'none';
        }
      }
      lastPendingCount = count;
      lastHardShipCount = hardShipCount;
    } catch {}
  };
  ensureNotificationPermission();
  await poll();
  pendingOrdersTimer = setInterval(poll, 10000);
}

function gotoPendingOrders() {
  orderFilters.status = 'pending';
  navigate('orders');
}

function esc(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function roleLabel(role) { return { admin:'Quản trị viên', staff:'Nhân viên', inventory_staff:'Nhân viên kho' }[role] || role; }
function can(perm) {
  if (state.admin.role === 'admin') return true;
  if (perm === 'delete') return false;
  if (perm === 'edit-price') return state.admin.role !== 'inventory_staff';
  if (perm === 'edit-stock') return true;
  if (perm === 'create') return state.admin.role !== 'inventory_staff';
  if (perm === 'invoice-config') return state.admin.role === 'admin';
  if (perm === 'invoice-issue') return state.admin.role !== 'inventory_staff';
  return state.admin.role !== 'inventory_staff';
}
function pageTitle() {
  const t = { dashboard:'Tổng quan', products:'Sản phẩm', 'product-edit': state.params?.id ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm', orders:'Đơn hàng', 'order-detail':'Chi tiết đơn hàng', customers:'Khách hàng', vouchers:'Khuyến mãi', inbox:'Hộp thư hỗ trợ', videos:'Video sản phẩm', 'shipping-partners':'Đối tác vận chuyển', 'invoice-settings':'Cấu hình hóa đơn VAT', 'invoice-rules':'Quy tắc xuất hóa đơn', invoices:'Lịch sử hóa đơn', 'invoice-detail':'Chi tiết hóa đơn' }[state.page];
  return t || 'Admin';
}

// ─── LOGIN ───
function renderLogin(app) {
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <span class="brand">🦐 Hải Sản Hà Nội</span>
        <h1>Đăng nhập Admin</h1>
        <p>Vui lòng đăng nhập để quản lý hệ thống</p>
        <form id="login-form">
          <div class="form-group">
            <label>Số điện thoại</label>
            <input type="tel" id="login-phone" placeholder="0987654321" required>
          </div>
          <div class="form-group">
            <label>Mật khẩu</label>
            <input type="password" id="login-password" placeholder="••••••" required>
          </div>
          <div class="error-msg" id="login-error"></div>
          <button type="submit" class="btn btn-primary btn-full">Đăng nhập</button>
        </form>
      </div>
    </div>
  `;
  $('login-form').addEventListener('submit', handleLogin);
}

// ─── DASHBOARD ───
async function renderDashboard(el) {
  el.innerHTML = '<p>Đang tải...</p>';
  try {
    const data = await api('GET', '/admin/dashboard');
    const d = data.data;
    el.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><span class="value">${d.ordersToday}</span><span class="label">Đơn hôm nay</span></div>
        <div class="stat-card"><span class="value">${fmt(d.revenueToday)}₫</span><span class="label">Doanh thu hôm nay</span></div>
        <div class="stat-card"><span class="value">${d.totalProducts}</span><span class="label">Sản phẩm đang bán</span></div>
        <div class="stat-card"><span class="value">${d.totalCustomers}</span><span class="label">Khách hàng</span></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Đơn hàng gần đây</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
            <tbody>
              ${(d.recentOrders || []).map(o => `<tr>
                <td>${esc(o.code)}</td>
                <td>${esc(o.customer_name || '')}</td>
                <td class="num">${fmt(o.total)}₫</td>
                <td>${statusBadge(o.status)}</td>
                <td>${formatDate(o.created_at)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger)">Lỗi: ${e.message}</p>`;
  }
}

// ─── PRODUCTS ───
let productFilters = { page: 1, search: '', category: '', status: '' };
async function renderProducts(el) {
  if (state.params?.refresh) { productFilters = { page: 1, search: '', category: '', status: '' }; }
  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Danh sách sản phẩm</h3>
        <div style="display:flex;gap:8px">
          ${can('create') ? '<button class="btn btn-primary btn-sm" id="add-product-btn">+ Thêm sản phẩm</button>' : ''}
        </div>
      </div>
      <div class="table-controls">
        <input class="search-box" id="product-search" placeholder="🔍 Tìm kiếm theo tên..." value="${esc(productFilters.search)}">
        <select id="filter-category"><option value="">Tất cả danh mục</option></select>
        <select id="filter-status">
          <option value="">Tất cả trạng thái</option>
          <option value="active" ${productFilters.status === 'active' ? 'selected':''}>Đang bán</option>
          <option value="draft" ${productFilters.status === 'draft' ? 'selected':''}>Nháp</option>
          <option value="out_of_stock" ${productFilters.status === 'out_of_stock' ? 'selected':''}>Hết hàng</option>
          <option value="inactive" ${productFilters.status === 'inactive' ? 'selected':''}>Ngừng bán</option>
        </select>
      </div>
      <div class="batch-bar" id="batch-bar">
        <span id="batch-count"></span>
        <button class="btn btn-sm btn-outline" id="batch-active">Đang bán</button>
        <button class="btn btn-sm btn-outline" id="batch-inactive">Ngừng bán</button>
        ${can('delete') ? '<button class="btn btn-sm btn-danger" id="batch-delete">Xóa</button>' : ''}
      </div>
      <div class="table-wrap"><div id="product-table"><p style="padding:32px;text-align:center;color:var(--text-secondary)">Đang tải...</p></div></div>
      <div class="pagination" id="product-pagination"></div>
    </div>
  `;

  // Load categories for filter
  try {
    const cats = await api('GET', '/admin/categories');
    state.categories = cats.data;
    const sel = $('filter-category');
    cats.data.forEach(c => {
      const o = document.createElement('option'); o.value = c.id; o.textContent = c.name;
      if (c.id === productFilters.category) o.selected = true;
      sel.appendChild(o);
    });
  } catch {}

  loadProducts();

  $('product-search').addEventListener('input', debounce(() => {
    productFilters.search = $('product-search').value;
    productFilters.page = 1;
    loadProducts();
  }, 300));

  $('filter-category').addEventListener('change', () => {
    productFilters.category = $('filter-category').value;
    productFilters.page = 1;
    loadProducts();
  });

  $('filter-status').addEventListener('change', () => {
    productFilters.status = $('filter-status').value;
    productFilters.page = 1;
    loadProducts();
  });

  if ($('add-product-btn')) {
    $('add-product-btn').addEventListener('click', () => navigate('product-edit'));
  }

  $('batch-active').addEventListener('click', () => batchAction('active'));
  $('batch-inactive').addEventListener('click', () => batchAction('inactive'));
  if ($('batch-delete')) $('batch-delete').addEventListener('click', () => batchAction('delete'));
}

async function loadProducts() {
  const el = $('product-table');
  if (!el) return;
  el.innerHTML = '<p style="padding:32px;text-align:center;color:var(--text-secondary)">Đang tải...</p>';

  try {
    const params = new URLSearchParams({ page: productFilters.page, limit: '20' });
    if (productFilters.search) params.set('search', productFilters.search);
    const data = await api('GET', `/admin/products?${params}`);

    const products = data.data;
    const pag = data.pagination;

    if (products.length === 0) {
      el.innerHTML = `
        <div style="padding:48px;text-align:center">
          <p style="font-size:48px;margin-bottom:12px">🦐</p>
          <p style="color:var(--text-secondary)">Không tìm thấy sản phẩm phù hợp</p>
          <button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="productFilters={page:1,search:'',category:'',status:''};loadProducts()">Xóa bộ lọc</button>
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <table>
        <thead><tr>
          <th style="width:36px"><input type="checkbox" id="select-all"></th>
          <th style="width:76px">Ảnh</th>
          <th>Sản phẩm</th>
          <th>Danh mục</th>
          <th>Giá</th>
          <th>Tồn kho</th>
          <th>Trạng thái</th>
          <th style="width:120px">Hành động</th>
        </tr></thead>
        <tbody>
          ${products.map(p => `
            <tr>
              <td><input type="checkbox" class="product-check" value="${p.id}"></td>
              <td>${productThumb(p)}</td>
              <td><strong>${esc(p.name)}</strong></td>
              <td>${esc(p.category_name || '')}</td>
              <td class="num">${fmt(p.price)}₫</td>
              <td class="num">${p.stock}</td>
              <td>${productStatusBadge(p)}</td>
              <td>
                <button class="btn btn-sm btn-outline" onclick="navigate('product-edit',{id:'${p.id}'})">✏️</button>
                ${can('delete') ? `<button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}','${esc(p.name)}')">🗑️</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Pagination
    const totalPages = Math.ceil(pag.total / pag.limit);
    const pg = $('product-pagination');
    if (totalPages > 1) {
      pg.innerHTML = `
        <button ${productFilters.page <= 1 ? 'disabled':''} onclick="productFilters.page--;loadProducts()">‹</button>
        ${Array.from({length: totalPages}, (_,i) => i+1).map(p =>
          `<button class="${p === productFilters.page ? 'active':''}" onclick="productFilters.page=${p};loadProducts()">${p}</button>`
        ).join('')}
        <button ${productFilters.page >= totalPages ? 'disabled':''} onclick="productFilters.page++;loadProducts()">›</button>
        <span style="font-size:12px;color:var(--text-secondary);margin-left:8px">${pag.total} sản phẩm</span>
      `;
    } else {
      pg.innerHTML = `<span style="font-size:12px;color:var(--text-secondary)">${pag.total} sản phẩm</span>`;
    }

    // Ảnh 404 (file đã mất) trông giống ảnh chưa tải xong, nên đánh dấu rõ ràng
    qsa('.list-thumb').forEach(img => {
      img.addEventListener('error', () => {
        const badge = document.createElement('span');
        badge.className = 'badge badge-orange';
        badge.title = `Không tải được ảnh: ${img.getAttribute('src')}`;
        badge.textContent = 'Ảnh lỗi';
        img.replaceWith(badge);
      });
    });

    // Select all
    $('select-all').addEventListener('change', function() {
      qsa('.product-check').forEach(c => c.checked = this.checked);
      updateBatchBar();
    });
    qsa('.product-check').forEach(c => c.addEventListener('change', updateBatchBar));

  } catch (e) {
    el.innerHTML = `<div style="padding:48px;text-align:center">
      <p style="color:var(--danger)">Lỗi: ${e.message}</p>
      <button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="loadProducts()">Tải lại</button>
    </div>`;
  }
}

function updateBatchBar() {
  const checked = qsa('.product-check:checked');
  const bar = $('batch-bar');
  if (checked.length > 0) {
    bar.classList.add('show');
    $('batch-count').textContent = `Đã chọn ${checked.length} sản phẩm`;
  } else {
    bar.classList.remove('show');
  }
}

async function batchAction(action) {
  const ids = Array.from(qsa('.product-check:checked')).map(c => c.value);
  if (ids.length === 0) return;

  if (action === 'delete' && !confirm(`Xóa ${ids.length} sản phẩm đã chọn?`)) return;

  try {
    for (const id of ids) {
      if (action === 'active') await api('PUT', `/admin/products/${id}`, { active: true });
      else if (action === 'inactive') await api('PUT', `/admin/products/${id}`, { active: false });
      else if (action === 'delete') await api('DELETE', `/admin/products/${id}`);
    }
    toast(`Đã ${action === 'active' ? 'bật' : action === 'inactive' ? 'tắt' : 'xóa'} ${ids.length} sản phẩm`);
    loadProducts();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Xóa sản phẩm "${name}"?\nSản phẩm đã phát sinh đơn hàng sẽ chuyển sang Ngừng bán.`)) return;
  try {
    await api('DELETE', `/admin/products/${id}`);
    toast('Đã xóa sản phẩm');
    loadProducts();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function productThumb(p) {
  const url = (p.images || [])[0];
  if (!url) return '<span class="badge badge-red" title="Sản phẩm chưa có ảnh">Chưa có ảnh</span>';
  return `<img class="list-thumb" src="${esc(url)}" alt="" loading="lazy" title="${esc(url)}">`;
}

function productStatusBadge(p) {
  if (!p.active) return '<span class="badge badge-red">Ngừng bán</span>';
  if (p.stock === 0) return '<span class="badge badge-orange">Hết hàng</span>';
  if (p.stock <= 5) return '<span class="badge badge-orange">Sắp hết</span>';
  return '<span class="badge badge-green">Đang bán</span>';
}

function statusBadge(s) {
  const m = { pending:'badge-orange', confirmed:'badge-blue', hard_to_ship:'badge-red', customer_refused:'badge-orange', delivered:'badge-green', exchanged:'badge-blue', returned:'badge-red', cancelled:'badge-gray' };
  const l = { pending:'Chờ xác nhận', confirmed:'Đã xác nhận', hard_to_ship:'Khó đặt ship', customer_refused:'Khách không nhận đơn', delivered:'Hoàn thành', exchanged:'Đổi hàng', returned:'Bị trả hàng', cancelled:'Đã hủy' };
  return `<span class="badge ${m[s] || 'badge-gray'}">${l[s] || s}</span>`;
}

// ─── PRODUCT EDIT ───
let editForm = { tab: 'basic', data: {}, variants: [], saving: false, dirty: false };

async function renderProductEdit(el) {
  const id = state.params?.id;
  editForm = { tab: 'basic', data: {}, variants: [], saving: false, dirty: false };

  // Load categories
  try {
    const cats = await api('GET', '/admin/categories');
    state.categories = cats.data;
  } catch {}

  if (id) {
    try {
      const data = await api('GET', `/admin/products/${id}`);
      // Also get products list to find this product
      const all = await api('GET', '/admin/products?limit=100');
      const p = all.data.find(x => x.id === id);
      if (p) {
        editForm.data = p;
        if (p.variants) editForm.variants = p.variants;
      }
      // Load variants
      try {
        const v = await api('GET', `/admin/products/${id}/variants`);
        editForm.variants = (v.data || []).map(x => ({ ...x, stock: x.stock ?? 0, price: x.price ?? 0, compare_price: x.compare_price ?? null }));
      } catch {}
    } catch (e) {
      toast('Không thể tải sản phẩm: ' + e.message, 'error');
    }
  } else {
    editForm.data = { name: '', description: '', category_id: '', price: 0, old_price: null, unit: '/kg', stock: 0, is_fresh: true, active: false, images: [] };
    editForm.variants = [{ label: '', unit: 'kg', price: 0, compare_price: null, sku: '', active: true, stock: 0 }];
  }

  renderForm(el);
}

function syncBasicData() {
  const name = $('f-name');
  const desc = $('f-desc');
  const cat = $('f-category');
  const status = $('f-status');
  if (name) editForm.data.name = name.value;
  if (desc) editForm.data.description = desc.value;
  if (cat) editForm.data.category_id = cat.value;
  if (status) editForm.data.active = status.value === 'true';
}

function renderForm(el) {
  syncBasicData();
  const d = editForm.data;
  el.innerHTML = `
    <div class="tabs">
      <button class="tab-btn ${editForm.tab === 'basic' ? 'active':''}" data-tab="basic">📝 Thông tin cơ bản</button>
      <button class="tab-btn ${editForm.tab === 'variants' ? 'active':''}" data-tab="variants">🏷️ Biến thể & Giá bán</button>
      <button class="tab-btn ${editForm.tab === 'inventory' ? 'active':''}" data-tab="inventory">📦 Tồn kho</button>
    </div>
    <div id="form-body"></div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="navigate('products')">Hủy</button>
      ${can('create') ? `<button class="btn btn-primary" id="save-draft-btn">Lưu nháp</button>` : ''}
      ${can('create') ? `<button class="btn btn-primary" id="save-active-btn">Lưu và đăng bán</button>` : ''}
    </div>
  `;

  qsa('.tab-btn').forEach(b => b.addEventListener('click', () => {
    editForm.tab = b.dataset.tab;
    renderForm(el);
  }));

  renderTabContent($('form-body'));

  if ($('save-draft-btn')) $('save-draft-btn').addEventListener('click', () => saveProduct(false));
  if ($('save-active-btn')) $('save-active-btn').addEventListener('click', () => saveProduct(true));
}

function renderTabContent(el) {
  el.innerHTML = '';
  if (editForm.tab === 'basic') renderBasicTab(el);
  else if (editForm.tab === 'variants') renderVariantsTab(el);
  else if (editForm.tab === 'inventory') renderInventoryTab(el);
}

function renderBasicTab(el) {
  const d = editForm.data;
  el.innerHTML = `
    <div class="card">
      <div class="card-body" style="display:flex;flex-direction:column;gap:16px">
        <div class="form-group">
          <label>Tên sản phẩm <span style="color:var(--danger)">*</span></label>
          <input type="text" id="f-name" value="${esc(d.name)}" maxlength="120" placeholder="VD: Tôm sú tươi">
          <div class="field-error" id="f-name-error"></div>
        </div>
        <div class="form-group">
          <label>Mô tả sản phẩm</label>
          <textarea id="f-desc" maxlength="2000" placeholder="Mô tả sản phẩm...">${esc(d.description || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Danh mục <span style="color:var(--danger)">*</span></label>
            <select id="f-category">
              <option value="">Chọn danh mục</option>
              ${state.categories.map(c => `<option value="${c.id}" ${d.category_id === c.id ? 'selected':''}>${esc(c.name)}</option>`).join('')}
            </select>
            <div class="field-error" id="f-category-error"></div>
          </div>
          <div class="form-group">
            <label>Trạng thái</label>
            <select id="f-status">
              <option value="false" ${!d.active ? 'selected':''}>Nháp</option>
              <option value="true" ${d.active ? 'selected':''}>Đang bán</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Cân nặng (kg)</label>
            <input type="number" id="f-weight" min="0.1" step="0.1" value="${d.weight != null ? d.weight : 1}">
            <div class="hint">Dùng để tính phí vận chuyển AhaMove</div>
          </div>
        </div>
        <div class="form-group">
          <label>Hình ảnh sản phẩm</label>
          <div class="image-grid" id="image-grid">
            ${(d.images || []).map((img, i) => `
              <div class="image-item">
                <img src="${esc(img)}">
                <button class="remove-btn" onclick="removeImage(${i})">×</button>
                ${i === 0 ? '<span class="main-badge">Ảnh đại diện</span>' : ''}
              </div>
            `).join('')}
            <div class="image-item" onclick="document.getElementById('image-input').click()">
              +
              <input type="file" id="image-input" accept="image/*" style="display:none" multiple>
            </div>
          </div>
          <div class="hint">Tối đa 8 ảnh, JPG/PNG/WebP, ≤ 5MB/ảnh</div>
        </div>
      </div>
    </div>
  `;

  // Image upload → Cloudflare R2
  if ($('image-input')) {
    $('image-input').addEventListener('change', function() {
      Array.from(this.files).forEach(f => {
        if (f.size > 5 * 1024 * 1024) { toast('Ảnh vượt quá 5MB', 'error'); return; }
        const fd = new FormData();
        fd.append('image', f);
        apiUpload('POST', '/admin/upload/image', fd)
          .then(res => {
            if (editForm.data.images.length >= 8) { toast('Tối đa 8 ảnh', 'warning'); return; }
            editForm.data.images.push(res.data.url);
            editForm.dirty = true;
            renderForm($('page-content'));
          })
          .catch(err => toast('Lỗi upload ảnh: ' + (err.message || ''), 'error'));
      });
    });
  }

  ['f-name','f-desc','f-category','f-status'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', () => { editForm.dirty = true; syncBasicData(); });
  });
}

function removeImage(i) {
  if (!confirm('Xóa ảnh này?')) return;
  editForm.data.images.splice(i, 1);
  editForm.dirty = true;
  renderForm($('page-content'));
}

function renderVariantsTab(el) {
  const variants = editForm.variants;
  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Biến thể & Giá bán</h3>
        <button class="btn btn-sm btn-primary" onclick="addVariant()">+ Thêm biến thể</button>
      </div>
      <div class="table-wrap">
        <table class="variant-table">
          <thead><tr>
            <th>Quy cách</th>
            <th>ĐVT</th>
            <th>Giá bán (₫)</th>
            <th>Giá gốc (₫)</th>
            <th>Giảm</th>
            <th>SKU</th>
            <th>Trạng thái</th>
            <th></th>
          </tr></thead>
          <tbody id="variant-body">
            ${variants.length === 0 ? '<tr><td colspan="8" style="text-align:center;color:var(--text-secondary);padding:32px">Chưa có biến thể. Nhấn "+ Thêm biến thể" để bắt đầu.</td></tr>' :
              variants.map((v, i) => renderVariantRow(v, i)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderVariantRow(v, i) {
  const discount = v.compare_price && v.price ? Math.round((1 - v.price / v.compare_price) * 100) : 0;
  return `<tr>
    <td><input type="text" value="${esc(v.label || '')}" placeholder="500g" onchange="updateVariant(${i},'label',this.value)"></td>
    <td><select onchange="updateVariant(${i},'unit',this.value)">
      ${['kg','g','gói','hộp','con','set'].map(u => `<option value="${u}" ${v.unit === u ? 'selected':''}>${u}</option>`).join('')}
    </select></td>
    <td><input class="num" type="number" value="${v.price || ''}" placeholder="0" min="0" onchange="updateVariant(${i},'price',Number(this.value))"></td>
    <td><input class="num" type="number" value="${v.compare_price || ''}" placeholder="0" min="0" onchange="updateVariant(${i},'compare_price',Number(this.value)||null)"></td>
    <td>${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}</td>
    <td><input type="text" value="${esc(v.sku || '')}" placeholder="Tự động" onchange="updateVariant(${i},'sku',this.value)"></td>
    <td><label style="display:flex;align-items:center;gap:4px;font-size:13px"><input type="checkbox" ${v.active !== false ? 'checked':''} onchange="updateVariant(${i},'active',this.checked)"> Bán</label></td>
    <td><button class="btn btn-sm btn-danger" onclick="removeVariant(${i})">×</button></td>
  </tr>`;
}

function addVariant() {
  editForm.variants.push({ label: '', unit: 'kg', price: 0, compare_price: null, sku: '', active: true, stock: 0 });
  editForm.dirty = true;
  const el = $('page-content');
  renderForm(el);
  // Switch to variants tab
  editForm.tab = 'variants';
  renderForm(el);
}

function updateVariant(i, field, value) {
  editForm.variants[i][field] = value;
  editForm.dirty = true;
  // Re-render discount badge
  if (field === 'price' || field === 'compare_price') {
    renderForm($('page-content'));
    editForm.tab = 'variants';
  }
}

function removeVariant(i) {
  if (editForm.variants.length <= 1) {
    if (!confirm('Sản phẩm cần ít nhất 1 biến thể để hiển thị cho khách. Xóa?')) return;
  }
  editForm.variants.splice(i, 1);
  editForm.dirty = true;
  renderForm($('page-content'));
  editForm.tab = 'variants';
}

function renderInventoryTab(el) {
  const variants = editForm.variants;
  el.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Tồn kho theo biến thể</h3></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Biến thể</th><th>Tồn kho</th><th>Ngưỡng cảnh báo</th><th>Cho phép đặt trước</th><th>Giới hạn mua/đơn</th></tr></thead>
          <tbody>
            ${variants.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-secondary)">Thêm biến thể trước khi nhập tồn kho</td></tr>' :
              variants.map((v, i) => `
            <tr>
              <td><strong>${esc(v.label) || `Biến thể ${i+1}`}</strong></td>
              <td><input class="num" type="number" value="${v.stock ?? 0}" min="0" style="width:100px" onchange="updateVariant(${i},'stock',Number(this.value));editForm.dirty=true"></td>
              <td><input class="num" type="number" value="${v.low_stock_threshold ?? ''}" min="0" style="width:100px" placeholder="10%" onchange="updateVariant(${i},'low_stock_threshold',Number(this.value)||null);editForm.dirty=true"></td>
              <td><input type="checkbox" ${v.backorder ? 'checked':''} onchange="updateVariant(${i},'backorder',this.checked);editForm.dirty=true"></td>
              <td><input class="num" type="number" value="${v.max_per_order ?? ''}" min="0" style="width:100px" placeholder="Không giới hạn" onchange="updateVariant(${i},'max_per_order',Number(this.value)||null);editForm.dirty=true"></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function saveProduct(publish) {
  if (editForm.saving) return;
  editForm.saving = true;

  const draftBtn = $('save-draft-btn');
  const activeBtn = $('save-active-btn');
  if (draftBtn) { (draftBtn).disabled = true; draftBtn.textContent = '⏳ Đang lưu...'; }
  if (activeBtn) { (activeBtn).disabled = true; activeBtn.textContent = '⏳ Đang lưu...'; }

  syncBasicData();

  // Collect data
  const id = state.params?.id;
  const basic = {
    name: editForm.data.name || $('f-name')?.value || '',
    description: editForm.data.description || $('f-desc')?.value || '',
    category_id: editForm.data.category_id || $('f-category')?.value || '',
    active: editForm.data.active ?? (($('f-status')?.value || 'false') === 'true'),
    images: editForm.data.images || [],
    is_fresh: editForm.data.is_fresh !== false,
    unit: editForm.data.unit || '/kg',
    weight: parseFloat($('f-weight')?.value) || 1,
    price: editForm.variants[0]?.price || 0,
    stock: editForm.variants[0]?.stock ?? 0,
  };

  // Validate
  let errors = [];
  if (!basic.name) errors.push('Tên sản phẩm là bắt buộc');
  if (!basic.category_id) errors.push('Danh mục là bắt buộc');
  if (editForm.variants.length === 0) errors.push('Cần ít nhất 1 biến thể');
  if (editForm.variants.some(v => !v.label)) errors.push('Vui lòng nhập quy cách cho tất cả biến thể');
  if (editForm.variants.some(v => !v.price || v.price <= 0)) errors.push('Giá bán phải lớn hơn 0');
  if (editForm.variants.some(v => v.compare_price && v.compare_price <= v.price)) errors.push('Giá so sánh phải lớn hơn giá bán');

  if (errors.length > 0) {
    toast(errors.join('\n'), 'error');
    editForm.saving = false;
    return;
  }

  try {
    let product;
    if (id) {
      const res = await api('PUT', `/admin/products/${id}`, basic);
      product = res.data;
    } else {
      const res = await api('POST', '/admin/products', basic);
      product = res.data;
    }

    // Save variants — use the (newly created or existing) product ID
    const targetId = product.id || id;
    if (targetId && editForm.variants.length > 0) {
      // Delete existing variants first if editing
      if (id) {
        try { const v = await api('GET', `/admin/products/${id}/variants`); await Promise.all((v.data || []).map(v => api('DELETE', `/admin/products/${id}/variants/${v.id}`))); } catch {}
      }
      await Promise.all(editForm.variants.map(v =>
        api('POST', `/admin/products/${targetId}/variants`, v)
      ));
    }

    toast(publish ? 'Sản phẩm đã được đăng bán' : 'Đã lưu thông tin sản phẩm');
    navigate('products', { refresh: true });
  } catch (e) {
    if (draftBtn) { (draftBtn).disabled = false; draftBtn.textContent = 'Lưu nháp'; }
    if (activeBtn) { (activeBtn).disabled = false; activeBtn.textContent = 'Lưu và đăng bán'; }
    toast(e.message, 'error');
  } finally {
    editForm.saving = false;
  }
}

// ─── ORDERS ───
let orderFilters = { page: 1, status: '' };
async function renderOrders(el) {
  el.innerHTML = '<p>Đang tải...</p>';
  try {
    const qs = orderFilters.status ? `&status=${orderFilters.status}` : '';
    const data = await api('GET', `/admin/orders?limit=50${qs}`);
    const orders = data.data;
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    el.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Đơn hàng ${pendingCount > 0 ? `<span style="color:var(--warning);font-size:13px">(${pendingCount} chờ xác nhận)</span>` : ''}</h3>
          <div style="display:flex;gap:8px;align-items:center">
            <select id="f-order-status" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:12.5px">
              <option value="">Tất cả trạng thái</option>
              <option value="pending" ${orderFilters.status === 'pending' ? 'selected':''}>Chờ xác nhận</option>
              <option value="confirmed" ${orderFilters.status === 'confirmed' ? 'selected':''}>Đã xác nhận</option>
              <option value="hard_to_ship" ${orderFilters.status === 'hard_to_ship' ? 'selected':''}>Khó đặt ship</option>
              <option value="customer_refused" ${orderFilters.status === 'customer_refused' ? 'selected':''}>Khách không nhận đơn</option>
              <option value="delivered" ${orderFilters.status === 'delivered' ? 'selected':''}>Hoàn thành</option>
              <option value="exchanged" ${orderFilters.status === 'exchanged' ? 'selected':''}>Đổi hàng</option>
              <option value="returned" ${orderFilters.status === 'returned' ? 'selected':''}>Bị trả hàng</option>
              <option value="cancelled" ${orderFilters.status === 'cancelled' ? 'selected':''}>Đã hủy</option>
            </select>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>SĐT</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày</th><th></th></tr></thead>
            <tbody>
              ${orders.map(o => `<tr style="cursor:pointer" onclick="navigate('order-detail',{id:'${o.id}'})">
                <td><strong>${esc(o.code)}</strong>${o.status === 'pending' ? ' <span style="color:var(--warning)">🔔</span>' : ''}</td>
                <td>${esc(o.customer_name || '')}</td>
                <td>${esc(o.customer_phone || '')}</td>
                <td class="num">${fmt(o.total)}₫</td>
                <td>${statusBadge(o.status)}</td>
                <td>${formatDate(o.created_at)}</td>
                <td style="white-space:nowrap">${o.status === 'pending' ? `
                  <button class="btn btn-success btn-sm" onclick="event.stopPropagation();confirmOrder('${o.id}')">✓ Xác nhận</button>
                  <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();rejectOrder('${o.id}')">✕ Từ chối</button>
                ` : ''}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    $('f-order-status').addEventListener('change', () => {
      orderFilters.status = $('f-order-status').value;
      renderOrders(el);
    });
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger)">Lỗi: ${e.message}</p>`;
  }
}

async function confirmOrder(orderId) {
  if (!confirm('Xác nhận đủ hàng cho đơn này? Đơn vận chuyển AhaMove sẽ được tạo ngay.')) return;
  try {
    const data = await api('POST', `/admin/orders/${orderId}/confirm`);
    const o = data.data;
    toast(`Đã xác nhận đơn ${o.code}${o.shipping_tracking_code ? ` · Mã VC ${o.shipping_tracking_code}` : ''}`);
    navigate('order-detail', { id: orderId });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function rejectOrder(orderId) {  const reason = prompt('Lý do từ chối đơn (không bắt buộc):') ?? '';
  if (!confirm('Từ chối đơn hàng này? Khách sẽ thấy trạng thái đã hủy.')) return;
  try {
    const data = await api('POST', `/admin/orders/${orderId}/reject`, { reason: reason || 'Cửa hàng không đủ hàng' });
    toast(`Đã từ chối đơn ${data.data.code}`);
    navigate('order-detail', { id: orderId });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function cancelShipAndConfirm(orderId) {
  if (!confirm('Hủy vận chuyển cũ (AhaMove) và đặt lại đơn này? Đơn sẽ quay lại chờ xác nhận để tạo vận chuyển mới.')) return;
  try {
    const data = await api('POST', `/admin/orders/${orderId}/retry-shipping`);
    toast(data.data?.message || 'Đã đặt lại vận chuyển');
    navigate('order-detail', { id: orderId });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function autoReship(orderId) {
  if (!confirm('Hủy vận chuyển cũ (AhaMove) và tự đặt ship lại ngay cho đơn này? Đơn sẽ quay lại trạng thái đã xác nhận.')) return;
  try {
    const data = await api('POST', `/admin/orders/${orderId}/auto-reship`);
    toast(data.data?.message || 'Đã đặt lại vận chuyển');
    navigate('order-detail', { id: orderId });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function completeOrder(orderId) {
  if (!confirm('Hoàn thành đơn này? Đơn sẽ chuyển sang trạng thái đã hoàn thành.')) return;
  try {
    const data = await api('PUT', `/admin/orders/${orderId}/status`, { status: 'delivered' });
    toast(`Đã hoàn thành đơn ${data.data.code}`);
    navigate('order-detail', { id: orderId });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function changeOrderStatus(orderId) {
  const status = $('f-order-next-status')?.value;
  if (!status) { toast('Vui lòng chọn trạng thái mới', 'error'); return; }
  try {
    const data = await api('PUT', `/admin/orders/${orderId}/status`, { status });
    toast(`Đã chuyển đơn ${data.data.code} sang trạng thái mới`);
    navigate('order-detail', { id: orderId });
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ─── CUSTOMERS ───
async function renderCustomers(el) {
  el.innerHTML = '<p>Đang tải...</p>';
  try {
    const data = await api('GET', '/admin/customers?limit=50');
    const customers = data.data;
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Khách hàng</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Tên</th><th>SĐT</th><th>Email</th><th>Hạng</th><th>Đơn hàng</th><th>Ngày tham gia</th></tr></thead>
            <tbody>
              ${customers.map(c => `<tr>
                <td><strong>${esc(c.name)}</strong></td>
                <td>${esc(c.phone)}</td>
                <td>${esc(c.email || '')}</td>
                <td>${esc(c.tier)}</td>
                <td class="num">${c.total_orders || 0}</td>
                <td>${formatDate(c.created_at)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger)">Lỗi: ${e.message}</p>`;
  }
}

// ─── VOUCHERS ───
async function renderVouchers(el) {
  el.innerHTML = '<p>Đang tải...</p>';
  try {
    const data = await api('GET', '/admin/vouchers');
    const vouchers = data.data;
    el.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Khuyến mãi</h3>
          <button class="btn btn-sm btn-primary" onclick="showVoucherDialog()">+ Thêm Khuyến mãi mới</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Mã</th><th>Nhãn</th><th>Loại</th><th>Giá trị</th><th>Đã dùng</th><th>HSD</th><th>Trạng thái</th><th style="width:80px">Hành động</th>
            </tr></thead>
            <tbody>
              ${vouchers.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-secondary)">Chưa có mã khuyến mãi nào</td></tr>' :
              vouchers.map(v => `<tr>
                <td><strong>${esc(v.code)}</strong></td>
                <td>${esc(v.label)}</td>
                <td>${v.type === 'percent' ? '% Giảm' : v.type === 'fixed' ? '₫ Giảm' : '🚚 Miễn ship'}</td>
                <td>${v.type === 'percent' ? `${v.value}%` : v.type === 'fixed' ? `${fmt(v.value)}₫` : '-'}</td>
                <td class="num">${v.current_uses || 0}${v.max_uses ? `/${v.max_uses}` : ''}</td>
                <td style="font-size:12px">${v.expires_at ? formatDate(v.expires_at) : '—'}</td>
                <td>${v.active ? '<span class="badge badge-green">Hoạt động</span>' : '<span class="badge badge-red">Tắt</span>'}</td>
                <td><button class="btn btn-sm btn-outline" onclick="showVoucherDialog('${v.id}')">✏️</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger)">Lỗi: ${e.message}</p>`;
  }
}

function showVoucherDialog(voucherId) {
  (async () => {
    let voucher = null;
    if (voucherId) {
      try {
        const data = await api('GET', '/admin/vouchers');
        voucher = (data.data || []).find(v => v.id === voucherId);
      } catch {}
    }
    const v = voucher || { code: '', label: '', description: '', type: 'percent', value: 0, cap: 0, min_order: 0, max_uses: null, expires_at: '', active: true };
    const overlay = document.createElement('div'); overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog" style="width:520px">
        <h3>${voucher ? 'Sửa mã khuyến mãi' : 'Thêm khuyến mãi mới'}</h3>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
          <div class="form-row">
            <div class="form-group">
              <label>Mã <span style="color:var(--danger)">*</span></label>
              <input type="text" id="dlg-vc-code" value="${esc(v.code)}" placeholder="VD: SALE50" ${voucher ? 'readonly' : ''}>
            </div>
            <div class="form-group">
              <label>Nhãn hiển thị</label>
              <input type="text" id="dlg-vc-label" value="${esc(v.label || '')}" placeholder="VD: Giảm 50%">
            </div>
          </div>
          <div class="form-group">
            <label>Mô tả</label>
            <textarea id="dlg-vc-desc" rows="2" placeholder="Mô tả ngắn...">${esc(v.description || '')}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Loại</label>
              <select id="dlg-vc-type">
                <option value="percent" ${v.type === 'percent' ? 'selected':''}>% Giảm giá</option>
                <option value="fixed" ${v.type === 'fixed' ? 'selected':''}>₫ Giảm trực tiếp</option>
                <option value="freeship" ${v.type === 'freeship' ? 'selected':''}>🚚 Miễn phí ship</option>
              </select>
            </div>
            <div class="form-group">
              <label>Giá trị <span style="color:var(--danger)">*</span></label>
              <input type="number" id="dlg-vc-value" value="${v.value}" min="0">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Giới hạn giảm tối đa (₫)</label>
              <input type="number" id="dlg-vc-cap" value="${v.cap || 0}" min="0" placeholder="0 = không giới hạn">
            </div>
            <div class="form-group">
              <label>Đơn tối thiểu (₫)</label>
              <input type="number" id="dlg-vc-min" value="${v.min_order || 0}" min="0">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Số lượt tối đa</label>
              <input type="number" id="dlg-vc-max" value="${v.max_uses || ''}" min="0" placeholder="Không giới hạn">
            </div>
            <div class="form-group">
              <label>Ngày hết hạn</label>
              <input type="date" id="dlg-vc-expires" value="${v.expires_at ? v.expires_at.slice(0,10) : ''}">
            </div>
          </div>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="dlg-vc-active" ${v.active !== false ? 'checked':''}>
              <span>Kích hoạt</span>
            </label>
          </div>
        </div>
        <div class="dialog-actions" style="margin-top:20px">
          <button class="btn btn-cancel" id="dlg-cancel">Hủy</button>
          <button class="btn btn-primary" id="dlg-save">${voucher ? 'Cập nhật' : 'Tạo'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const vcSaveBtn = overlay.querySelector('#dlg-save');
    const vcCancelBtn = overlay.querySelector('#dlg-cancel');
    vcCancelBtn?.addEventListener('click', () => overlay.remove());
    vcSaveBtn?.addEventListener('click', async () => {
      const data = {
        code: $('dlg-vc-code')?.value?.trim().toUpperCase(),
        label: $('dlg-vc-label')?.value?.trim() || null,
        description: $('dlg-vc-desc')?.value?.trim() || null,
        type: $('dlg-vc-type')?.value,
        value: parseInt($('dlg-vc-value')?.value) || 0,
        cap: parseInt($('dlg-vc-cap')?.value) || 0,
        min_order: parseInt($('dlg-vc-min')?.value) || 0,
        max_uses: parseInt($('dlg-vc-max')?.value) || null,
        expires_at: $('dlg-vc-expires')?.value || null,
        active: $('dlg-vc-active')?.checked !== false,
      };
      if (!data.code) { toast('Vui lòng nhập mã khuyến mãi', 'error'); return; }
      if (!data.value || data.value <= 0) { toast('Giá trị khuyến mãi phải lớn hơn 0', 'error'); return; }
      (vcSaveBtn).disabled = true;
      (vcSaveBtn).textContent = '⏳ Đang lưu...';
      if (vcCancelBtn) (vcCancelBtn).disabled = true;
      try {
        if (voucher?.id) {
          await api('PUT', `/admin/vouchers/${voucher.id}`, data);
          toast('Đã cập nhật khuyến mãi');
        } else {
          await api('POST', '/admin/vouchers', data);
          toast('Đã tạo khuyến mãi');
        }
        overlay.remove();
        navigate('vouchers');
      } catch (e) {
        (vcSaveBtn).disabled = false;
        (vcSaveBtn).textContent = voucher ? 'Cập nhật' : 'Tạo';
        if (vcCancelBtn) (vcCancelBtn).disabled = false;
        toast(e.message, 'error');
      }
    });
  })();
}

// ─── ORDER DETAIL ───
async function renderOrderDetail(el) {
  const id = state.params?.id;
  if (!id) { el.innerHTML = '<p>Không tìm thấy đơn hàng</p>'; return; }
  el.innerHTML = '<p>Đang tải...</p>';
  try {
    const [orderRes, invRes] = await Promise.all([
      api('GET', `/admin/orders/${id}`),
      api('GET', `/admin/invoice/order/${id}`).catch(() => null),
    ]);
    const o = orderRes.data;
    const inv = invRes?.data;

    el.innerHTML = `
      ${o.status === 'hard_to_ship' ? `
        <div class="card" style="border-color:var(--danger);background:#FEF2F2">
          <div class="card-body" style="display:flex;align-items:center;gap:12px">
            <span style="font-size:22px">⚠️</span>
            <div>
              <strong style="color:var(--danger)">Đơn khó đặt ship</strong>
              <p style="color:var(--danger);font-size:12.5px;margin-top:2px">Đã quá thời gian chờ nhưng chưa có tài xế nhận đơn. Khách gọi số cửa hàng 0936141757 để được hỗ trợ. Bạn có thể hủy vận chuyển và đặt lại.</p>
            </div>
            <div style="margin-left:auto;display:flex;gap:8px">
              <button class="btn btn-danger btn-sm" onclick="cancelShipAndConfirm('${o.id}')">Hủy VC & xác nhận lại</button>
              <button class="btn btn-success btn-sm" onclick="completeOrder('${o.id}')">Hoàn thành</button>
            </div>
          </div>
        </div>` : ''}
      <div class="card">
        <div class="card-header"><h3>Đơn hàng ${esc(o.code)}</h3>${statusBadge(o.status)}${o.status === 'pending' ? `
          <div style="margin-left:auto;display:flex;gap:8px">
            <button class="btn btn-success btn-sm" onclick="confirmOrder('${o.id}')">✓ Xác nhận đủ hàng</button>
            <button class="btn btn-danger btn-sm" onclick="rejectOrder('${o.id}')">✕ Hủy đơn</button>
          </div>` : ''}</div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div>
              <label style="font-size:12px;color:var(--text-secondary)">Khách hàng</label>
              <p><strong>${esc(o.customer_name || '')}</strong></p>
              <p>${esc(o.customer_phone || '')}</p>
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-secondary)">Thông tin giao hàng</label>
              <p><strong>${o.delivery_mode === 'hoatoc' ? '⚡ Siêu tốc' : o.delivery_mode === 'express2h' ? '🚀 Siêu tốc - tiết kiệm' : o.delivery_mode === 'interprovince' ? '🛵 4H' : '📅 Hẹn ngày giao'}</strong></p>
              ${o.delivery_date ? `<p>${formatDate(o.delivery_date)} ${o.delivery_time || ''}</p>` : ''}
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-secondary)">Thanh toán</label>
              <p>${o.payment_method === 'cod' ? '💵 COD' : o.payment_method === 'wallet' ? '💳 Ví' : '💳 Thẻ'} · ${fmt(o.total)}₫</p>
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-secondary)">Địa chỉ</label>
              <p>${esc(o.address_snapshot?.full || o.address_snapshot?.full_address || '')}</p>
            </div>
          </div>
          <div style="margin-top:12px">
            <label style="font-size:12px;color:var(--text-secondary)">Ghi chú</label>
            <p>${o.note ? esc(o.note) : '—'}</p>
          </div>
          ${o.status !== 'pending' && o.status !== 'cancelled' ? `
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <label style="font-size:12.5px;color:var(--text-secondary)"><strong>Chuyển trạng thái:</strong></label>
              <select id="f-order-next-status" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:12.5px">
                <option value="">— Chọn trạng thái —</option>
                <option value="confirmed" ${o.status === 'confirmed' ? 'disabled' : ''}>Đã xác nhận</option>
                <option value="hard_to_ship" ${o.status === 'hard_to_ship' ? 'disabled' : ''}>Khó đặt ship</option>
                <option value="customer_refused" ${o.status === 'customer_refused' ? 'disabled' : ''}>Khách không nhận đơn</option>
                <option value="delivered" ${o.status === 'delivered' ? 'disabled' : ''}>Hoàn thành</option>
                <option value="exchanged" ${o.status === 'exchanged' ? 'disabled' : ''}>Đổi hàng</option>
                <option value="returned" ${o.status === 'returned' ? 'disabled' : ''}>Bị trả hàng</option>
              </select>
              <button class="btn btn-primary btn-sm" onclick="changeOrderStatus('${o.id}')">Cập nhật</button>
            </div>` : ''}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Sản phẩm</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Sản phẩm</th><th>ĐVT</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
            <tbody>
              ${(o.items || []).map((item) => `
                <tr>
                  <td>${esc(item.name || item.product_name || '')}</td>
                  <td>${esc(item.unit || '')}</td>
                  <td class="num">${item.quantity}</td>
                  <td class="num">${fmt(item.price)}₫</td>
                  <td class="num">${fmt(item.price * item.quantity)}₫</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr><td colspan="4" style="text-align:right;font-weight:600">Tạm tính</td><td class="num">${fmt(o.subtotal)}₫</td></tr>
              ${o.discount ? `<tr><td colspan="4" style="text-align:right;color:var(--success)">Giảm giá</td><td class="num">-${fmt(o.discount)}₫</td></tr>` : ''}
              <tr><td colspan="4" style="text-align:right">Phí giao hàng</td><td class="num">${fmt(o.shipping_fee)}₫</td></tr>
              <tr><td colspan="4" style="text-align:right;font-weight:700;font-size:15px">Tổng cộng</td><td class="num" style="font-weight:700;font-size:15px">${fmt(o.total)}₫</td></tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div class="card" id="invoice-section">
        <div class="card-header"><h3>🧾 Hóa đơn VAT</h3></div>
        <div class="card-body">
          ${inv ? renderInvoiceInfo(o, inv) : '<p style="color:var(--text-secondary)">Đang tải...</p>'}
        </div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger)">Lỗi: ${e.message}</p>`;
  }
}

function renderInvoiceInfo(order, inv) {
  if (!order.invoice_requested) {
    return `<p style="color:var(--text-secondary)">Khách hàng không yêu cầu xuất hóa đơn.</p>`;
  }
  let info = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div><label style="font-size:12px;color:var(--text-secondary)">Công ty</label><p>${esc(order.invoice_company_name || '')}</p></div>
      <div><label style="font-size:12px;color:var(--text-secondary)">Mã số thuế</label><p>${esc(order.invoice_tax_code || '')}</p></div>
      <div style="grid-column:1/-1"><label style="font-size:12px;color:var(--text-secondary)">Địa chỉ</label><p>${esc(order.invoice_company_address || '')}</p></div>
      <div><label style="font-size:12px;color:var(--text-secondary)">Email nhận</label><p>${esc(order.invoice_email || '')}</p></div>
      <div><label style="font-size:12px;color:var(--text-secondary)">Người đại diện</label><p>${esc(order.invoice_representative || '')}</p></div>
    </div>
  `;

  if (!inv || !inv.id) {
    info += `<button class="btn btn-primary btn-sm" onclick="issueInvoice('${order.id}')">📄 Xuất hóa đơn</button>`;
  } else {
    info += `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">`;
    info += `<span>Trạng thái: <strong>${invoiceStatusBadge(inv.status)}</strong></span>`;
    if (inv.invoice_number) info += `<span>Số HĐ: <strong>${esc(inv.invoice_number)}</strong></span>`;
    if (inv.issued_at) info += `<span>Ngày xuất: ${formatDate(inv.issued_at)}</span>`;
    info += `</div>`;
    if (inv.error_message) info += `<p style="color:var(--danger);margin-top:8px">Lỗi: ${esc(inv.error_message)}</p>`;
    info += `<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">`;
    if (inv.status === 'issued') {
      info += `<button class="btn btn-sm btn-outline" onclick="viewInvoice('${inv.id}')">👁️ Xem</button>`;
      info += `<button class="btn btn-sm btn-outline" onclick="resendInvoiceEmail('${inv.id}')">📧 Gửi email</button>`;
      info += `<button class="btn btn-sm btn-danger" onclick="cancelInvoice('${inv.id}')">🗑️ Hủy</button>`;
    } else if (inv.status === 'failed') {
      info += `<button class="btn btn-sm btn-primary" onclick="retryInvoice('${inv.id}')">🔄 Thử lại</button>`;
      info += `<button class="btn btn-sm btn-outline" onclick="viewInvoice('${inv.id}')">👁️ Xem</button>`;
    } else if (inv.status === 'processing') {
      info += `<span style="color:var(--text-secondary)">Đang xử lý...</span>`;
    } else if (inv.status === 'cancelled') {
      info += `<span style="color:var(--text-secondary)">Đã hủy lúc ${formatDate(inv.cancelled_at)}</span>`;
    } else {
      info += `<button class="btn btn-primary btn-sm" onclick="issueInvoice('${order.id}')">📄 Xuất hóa đơn</button>`;
    }
    info += `</div>`;
  }
  return info;
}

async function issueInvoice(orderId) {
  if (!confirm('Xác nhận xuất hóa đơn cho đơn hàng này?')) return;
  try {
    await api('POST', `/admin/invoice/issue/${orderId}`);
    toast('Hóa đơn đã được xuất thành công');
    navigate('order-detail', { id: orderId });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function retryInvoice(id) {
  if (!confirm('Thử lại xuất hóa đơn này?')) return;
  try {
    await api('POST', `/admin/invoice/${id}/retry`);
    toast('Đang thử lại...');
    navigate('invoices');
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function cancelInvoice(id) {
  const reason = prompt('Lý do hủy hóa đơn (không bắt buộc):');
  try {
    await api('POST', `/admin/invoice/${id}/cancel`, { reason: reason || '' });
    toast('Đã hủy hóa đơn');
    navigate('invoices');
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function resendInvoiceEmail(id) {
  try {
    await api('POST', `/admin/invoice/${id}/resend-email`);
    toast('Email sẽ được gửi lại');
  } catch (e) {
    toast(e.message, 'error');
  }
}

function invoiceStatusBadge(s) {
  const m = { pending:'badge-gray', processing:'badge-blue', issued:'badge-green', failed:'badge-red', cancelled:'badge-red' };
  const l = { pending:'Chưa xuất', processing:'Đang xử lý', issued:'Đã xuất', failed:'Lỗi', cancelled:'Đã hủy' };
  return `<span class="badge ${m[s] || 'badge-gray'}">${l[s] || s}</span>`;
}

// ─── INVOICE SETTINGS ───
let invoiceSettingsCache;

async function renderInvoiceSettings(el) {
  if (!can('invoice-config')) {
    el.innerHTML = '<p style="color:var(--danger)">Bạn không có quyền truy cập trang này</p>';
    return;
  }
  el.innerHTML = '<p>Đang tải...</p>';
  try {
    const res = await api('GET', '/admin/invoice/settings');
    const cfg = res.data || {};
    invoiceSettingsCache = { ...cfg };

    el.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Thông tin doanh nghiệp</h3></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:16px">
          <div class="form-row">
            <div class="form-group">
              <label>Tên công ty <span style="color:var(--danger)">*</span></label>
              <input type="text" id="inv-company-name" value="${esc(cfg.company_name || '')}">
            </div>
            <div class="form-group">
              <label>Mã số thuế <span style="color:var(--danger)">*</span></label>
              <input type="text" id="inv-tax-code" value="${esc(cfg.tax_code || '')}">
            </div>
          </div>
          <div class="form-group">
            <label>Địa chỉ công ty <span style="color:var(--danger)">*</span></label>
            <textarea id="inv-company-address" rows="2">${esc(cfg.company_address || '')}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Số điện thoại <span style="color:var(--danger)">*</span></label>
              <input type="text" id="inv-phone" value="${esc(cfg.phone || '')}">
            </div>
            <div class="form-group">
              <label>Email công ty <span style="color:var(--danger)">*</span></label>
              <input type="email" id="inv-email" value="${esc(cfg.email || '')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Người đại diện</label>
              <input type="text" id="inv-rep-name" value="${esc(cfg.representative_name || '')}">
            </div>
            <div class="form-group">
              <label>Chức vụ</label>
              <input type="text" id="inv-rep-title" value="${esc(cfg.representative_title || '')}">
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Kết nối nhà cung cấp E-invoice</h3></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:16px">
          <div class="form-row">
            <div class="form-group">
              <label>Nhà cung cấp <span style="color:var(--danger)">*</span></label>
              <select id="inv-provider">
                <option value="viettel" ${cfg.provider === 'viettel' ? 'selected':''}>Viettel</option>
                <option value="vnpt" ${cfg.provider === 'vnpt' ? 'selected':''}>VNPT</option>
                <option value="minvoice" ${cfg.provider === 'minvoice' ? 'selected':''}>M-Invoice</option>
                <option value="hoadonplus" ${cfg.provider === 'hoadonplus' ? 'selected':''}>Hóa đơn Plus</option>
              </select>
            </div>
            <div class="form-group">
              <label>API Endpoint <span style="color:var(--danger)">*</span></label>
              <input type="url" id="inv-api-endpoint" value="${esc(cfg.api_endpoint || '')}" placeholder="https://api.provider.vn/v1/invoices">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>API Key / Token</label>
              <input type="password" id="inv-api-key" value="${esc(cfg.api_key || '')}" placeholder="${cfg.api_key ? '••••••••' : 'Nhập API Key'}">
            </div>
            <div class="form-group">
              <label>Mẫu hóa đơn <span style="color:var(--danger)">*</span></label>
              <input type="text" id="inv-template" value="${esc(cfg.invoice_template || '01GTKT')}" placeholder="01GTKT">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Ký hiệu hóa đơn <span style="color:var(--danger)">*</span></label>
              <input type="text" id="inv-serial" value="${esc(cfg.invoice_serial || 'HSHN')}" placeholder="HSHN">
            </div>
            <div class="form-group">
              <label>Số bắt đầu</label>
              <input type="number" id="inv-start-number" value="${cfg.invoice_start_number || 1}" min="1">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Số hiện tại</label>
              <input type="number" id="inv-current-number" value="${cfg.invoice_current_number || 1}" min="1">
            </div>
            <div class="form-group" style="display:flex;align-items:flex-end;gap:12px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="inv-active" ${cfg.active ? 'checked':''}>
                <span>Kích hoạt tính năng</span>
              </label>
              <button class="btn btn-sm btn-outline" id="test-connection-btn">🔌 Kiểm tra kết nối</button>
            </div>
          </div>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="navigate('dashboard')">Hủy</button>
        <button class="btn btn-primary" id="save-invoice-config">Lưu cấu hình</button>
      </div>
    `;

    $('save-invoice-config').addEventListener('click', saveInvoiceConfig);
    if ($('test-connection-btn')) {
      $('test-connection-btn').addEventListener('click', testConnection);
    }
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger)">Lỗi: ${e.message}</p>`;
  }
}

async function saveInvoiceConfig() {
  const btn = $('save-invoice-config');
  const data = {
    company_name: $('inv-company-name')?.value,
    tax_code: $('inv-tax-code')?.value,
    company_address: $('inv-company-address')?.value,
    phone: $('inv-phone')?.value,
    email: $('inv-email')?.value,
    representative_name: $('inv-rep-name')?.value || null,
    representative_title: $('inv-rep-title')?.value || null,
    provider: $('inv-provider')?.value,
    api_endpoint: $('inv-api-endpoint')?.value || null,
    api_key: $('inv-api-key')?.value || null,
    invoice_template: $('inv-template')?.value,
    invoice_serial: $('inv-serial')?.value,
    invoice_current_number: parseInt($('inv-current-number')?.value) || 1,
    active: $('inv-active')?.checked || false,
  };

  if (!data.company_name || !data.tax_code || !data.company_address || !data.phone || !data.email) {
    toast('Vui lòng điền đầy đủ thông tin doanh nghiệp', 'error');
    return;
  }

  if (btn) { (btn).disabled = true; btn.textContent = '⏳ Đang lưu...'; }
  try {
    await api('PUT', '/admin/invoice/settings', data);
    toast('Đã lưu cấu hình');
    navigate('dashboard');
  } catch (e) {
    if (btn) { (btn).disabled = false; btn.textContent = 'Lưu cấu hình'; }
    toast(e.message, 'error');
  }
}

async function testConnection() {
  const endpoint = $('inv-api-endpoint')?.value;
  const provider = $('inv-provider')?.value;
  const apiKey = $('inv-api-key')?.value;
  if (!endpoint) {
    toast('Vui lòng nhập API Endpoint', 'error');
    return;
  }
  try {
    await api('POST', '/admin/invoice/settings/test', { provider, api_endpoint: endpoint, api_key: apiKey });
    toast('Kết nối thành công');
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ─── INVOICE RULES ───
async function renderInvoiceRules(el) {
  el.innerHTML = '<p>Đang tải...</p>';
  try {
    const res = await api('GET', '/admin/invoice/rules');
    const rules = res.data || [];

    el.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Quy tắc tự động xuất hóa đơn</h3>
          ${can('invoice-config') ? '<button class="btn btn-sm btn-primary" id="add-rule-btn">+ Thêm quy tắc</button>' : ''}
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Thời điểm xuất</th>
              <th>Điều kiện</th>
              <th>Đơn tối thiểu</th>
              <th>Loại HĐ</th>
              <th>Tự động gửi email</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr></thead>
            <tbody>
              ${rules.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-secondary)">Chưa có quy tắc nào</td></tr>' :
                rules.map((r) => `
              <tr>
                <td>${ruleTriggerLabel(r.trigger_on)}</td>
                <td>${ruleConditionLabel(r.condition_type)}</td>
                <td class="num">${r.min_order_amount ? fmt(r.min_order_amount) + '₫' : '-'}</td>
                <td>${r.invoice_type === 'vat' ? 'VAT' : r.invoice_type === 'sales' ? 'Bán hàng' : 'Thường'}</td>
                <td>${r.auto_send_email ? '✅' : '❌'}</td>
                <td>${r.active ? '<span class="badge badge-green">Bật</span>' : '<span class="badge badge-gray">Tắt</span>'}</td>
                <td><button class="btn btn-sm btn-outline" onclick="editRule('${r.id}')">✏️ Sửa</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if ($('add-rule-btn')) {
      $('add-rule-btn').addEventListener('click', () => showRuleDialog());
    }
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger)">Lỗi: ${e.message}</p>`;
  }
}

function ruleTriggerLabel(t) {
  return { paid:'💳 Đã thanh toán', delivered:'✅ Đã giao thành công', customer_request:'🙋 Theo yêu cầu', manual:'✋ Thủ công' }[t] || t;
}

function ruleConditionLabel(t) {
  return { always:'Luôn xuất', on_request:'Chỉ khi khách yêu cầu', min_amount:'Đơn tối thiểu' }[t] || t;
}

function showRuleDialog(rule) {
  const r = rule || { trigger_on: 'delivered', condition_type: 'on_request', min_order_amount: '', invoice_type: 'vat', auto_send_email: true, email_template: '', bcc_email: '', active: true };
  const overlay = document.createElement('div'); overlay.className = 'dialog-overlay';
  overlay.innerHTML = `
    <div class="dialog" style="width:560px">
      <h3>${rule ? 'Sửa quy tắc' : 'Thêm quy tắc'}</h3>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
        <div class="form-row">
          <div class="form-group">
            <label>Thời điểm xuất</label>
            <select id="dlg-trigger">
              <option value="delivered" ${r.trigger_on === 'delivered' ? 'selected':''}>Đã giao thành công</option>
              <option value="paid" ${r.trigger_on === 'paid' ? 'selected':''}>Đã thanh toán</option>
              <option value="customer_request" ${r.trigger_on === 'customer_request' ? 'selected':''}>Theo yêu cầu khách</option>
              <option value="manual" ${r.trigger_on === 'manual' ? 'selected':''}>Thủ công</option>
            </select>
          </div>
          <div class="form-group">
            <label>Điều kiện</label>
            <select id="dlg-condition">
              <option value="always" ${r.condition_type === 'always' ? 'selected':''}>Luôn xuất</option>
              <option value="on_request" ${r.condition_type === 'on_request' ? 'selected':''}>Chỉ khi khách yêu cầu</option>
              <option value="min_amount" ${r.condition_type === 'min_amount' ? 'selected':''}>Đơn tối thiểu</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Đơn hàng tối thiểu (₫)</label>
            <input type="number" id="dlg-min-amount" value="${r.min_order_amount || ''}" min="0" placeholder="0">
          </div>
          <div class="form-group">
            <label>Loại hóa đơn</label>
            <select id="dlg-type">
              <option value="vat" ${r.invoice_type === 'vat' ? 'selected':''}>Hóa đơn GTGT (VAT)</option>
              <option value="sales" ${r.invoice_type === 'sales' ? 'selected':''}>Hóa đơn bán hàng</option>
              <option value="normal" ${r.invoice_type === 'normal' ? 'selected':''}>Hóa đơn thường</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="dlg-auto-email" ${r.auto_send_email ? 'checked':''}>
            <span>Tự động gửi email cho khách</span>
          </label>
        </div>
        <div class="form-group" id="dlg-email-bcc-group">
          <label>Gửi bản sao (BCC)</label>
          <input type="email" id="dlg-bcc" value="${esc(r.bcc_email || '')}" placeholder="admin@example.com">
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="dlg-active" ${r.active !== false ? 'checked':''}>
            <span>Kích hoạt</span>
          </label>
        </div>
      </div>
      <div class="dialog-actions" style="margin-top:20px">
        <button class="btn btn-cancel" id="dlg-cancel">Hủy</button>
        <button class="btn btn-primary" id="dlg-save">Lưu</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const irSaveBtn = overlay.querySelector('#dlg-save');
  const irCancelBtn = overlay.querySelector('#dlg-cancel');
  irCancelBtn?.addEventListener('click', () => overlay.remove());
  irSaveBtn?.addEventListener('click', async () => {
    const data = {
      trigger_on: $('dlg-trigger')?.value,
      condition_type: $('dlg-condition')?.value,
      min_order_amount: parseInt($('dlg-min-amount')?.value) || null,
      invoice_type: $('dlg-type')?.value,
      auto_send_email: $('dlg-auto-email')?.checked,
      bcc_email: $('dlg-bcc')?.value || null,
      active: $('dlg-active')?.checked,
    };
    (irSaveBtn).disabled = true;
    (irSaveBtn).textContent = '⏳ Đang lưu...';
    if (irCancelBtn) (irCancelBtn).disabled = true;
    try {
      if (rule?.id) {
        await api('PUT', `/admin/invoice/rules/${rule.id}`, data);
        toast('Đã cập nhật quy tắc');
      } else {
        await api('POST', '/admin/invoice/rules', data);
        toast('Đã thêm quy tắc');
      }
      overlay.remove();
      navigate('invoice-rules');
    } catch (e) {
      (irSaveBtn).disabled = false;
      (irSaveBtn).textContent = 'Lưu';
      if (irCancelBtn) (irCancelBtn).disabled = false;
      toast(e.message, 'error');
    }
  });
}

function editRule(id) {
  // Re-fetch rules to get the latest data
  api('GET', '/admin/invoice/rules').then(res => {
    const rule = (res.data || []).find((r) => r.id === id);
    if (rule) showRuleDialog(rule);
    else toast('Không tìm thấy quy tắc', 'error');
  }).catch(e => toast(e.message, 'error'));
}

// ─── INVOICE HISTORY ───
let invoiceFilters = { page: 1, status: '', search: '', from: '', to: '' };

async function renderInvoices(el) {
  el.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Danh sách hóa đơn</h3></div>
      <div class="table-controls">
        <input class="search-box" id="inv-search" placeholder="🔍 Tìm số HĐ, mã đơn, khách hàng..." value="${esc(invoiceFilters.search)}">
        <select id="inv-filter-status">
          <option value="">Tất cả trạng thái</option>
          <option value="pending" ${invoiceFilters.status === 'pending' ? 'selected':''}>Chưa xuất</option>
          <option value="processing" ${invoiceFilters.status === 'processing' ? 'selected':''}>Đang xử lý</option>
          <option value="issued" ${invoiceFilters.status === 'issued' ? 'selected':''}>Đã xuất</option>
          <option value="failed" ${invoiceFilters.status === 'failed' ? 'selected':''}>Lỗi</option>
          <option value="cancelled" ${invoiceFilters.status === 'cancelled' ? 'selected':''}>Đã hủy</option>
        </select>
        <input type="date" id="inv-from" value="${invoiceFilters.from}" style="font-size:13px" title="Từ ngày">
        <input type="date" id="inv-to" value="${invoiceFilters.to}" style="font-size:13px" title="Đến ngày">
      </div>
      <div class="table-wrap"><div id="invoice-table"><p style="padding:32px;text-align:center;color:var(--text-secondary)">Đang tải...</p></div></div>
      <div class="pagination" id="invoice-pagination"></div>
    </div>
  `;

  loadInvoices();

  $('inv-search')?.addEventListener('input', debounce(() => {
    invoiceFilters.search = $('inv-search')?.value || '';
    invoiceFilters.page = 1;
    loadInvoices();
  }, 300));

  $('inv-filter-status')?.addEventListener('change', () => {
    invoiceFilters.status = $('inv-filter-status')?.value || '';
    invoiceFilters.page = 1;
    loadInvoices();
  });

  $('inv-from')?.addEventListener('change', () => {
    invoiceFilters.from = $('inv-from')?.value || '';
    invoiceFilters.page = 1;
    loadInvoices();
  });

  $('inv-to')?.addEventListener('change', () => {
    invoiceFilters.to = $('inv-to')?.value || '';
    invoiceFilters.page = 1;
    loadInvoices();
  });
}

async function loadInvoices() {
  const el = $('invoice-table');
  if (!el) return;
  el.innerHTML = '<p style="padding:32px;text-align:center;color:var(--text-secondary)">Đang tải...</p>';

  try {
    const params = new URLSearchParams({ page: String(invoiceFilters.page), limit: '20' });
    if (invoiceFilters.status) params.set('status', invoiceFilters.status);
    if (invoiceFilters.search) params.set('search', invoiceFilters.search);
    if (invoiceFilters.from) params.set('from', invoiceFilters.from);
    if (invoiceFilters.to) params.set('to', invoiceFilters.to);

    const data = await api('GET', `/admin/invoice?${params}`);
    const invoices = data.data;
    const pag = data.pagination;

    if (invoices.length === 0) {
      el.innerHTML = `
        <div style="padding:48px;text-align:center">
          <p style="font-size:48px;margin-bottom:12px">🧾</p>
          <p style="color:var(--text-secondary)">Không tìm thấy hóa đơn phù hợp</p>
          <button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="invoiceFilters={page:1,status:'',search:'',from:'',to:''};loadInvoices()">Xóa bộ lọc</button>
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <table>
        <thead><tr>
          <th>Số hóa đơn</th>
          <th>Đơn hàng</th>
          <th>Khách hàng</th>
          <th>Tổng tiền</th>
          <th>Ngày xuất</th>
          <th>Trạng thái</th>
          <th style="width:100px">Hành động</th>
        </tr></thead>
        <tbody>
          ${invoices.map((inv) => `
            <tr style="cursor:pointer" onclick="navigate('invoice-detail',{id:'${inv.id}'})">
              <td><strong>${esc(inv.invoice_number || '—')}</strong></td>
              <td>${esc(inv.order_code || '')}</td>
              <td>${esc(inv.customer_name || inv.invoice_company_name || '')}</td>
              <td class="num">${fmt(inv.total_amount)}₫</td>
              <td>${inv.issued_at ? formatDate(inv.issued_at) : ''}</td>
              <td>${invoiceStatusBadge(inv.status)}</td>
              <td>
                <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();navigate('invoice-detail',{id:'${inv.id}'})">👁️</button>
                ${inv.status === 'failed' ? `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();retryInvoice('${inv.id}')">🔄</button>` : ''}
                ${inv.status === 'issued' ? `<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();cancelInvoice('${inv.id}')">🗑️</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const totalPages = Math.ceil(pag.total / pag.limit);
    const pg = $('invoice-pagination');
    if (totalPages > 1) {
      pg.innerHTML = `
        <button ${invoiceFilters.page <= 1 ? 'disabled':''} onclick="invoiceFilters.page--;loadInvoices()">‹</button>
        ${Array.from({length: Math.min(totalPages, 10)}, (_, i) => {
          const p = i + 1;
          return `<button class="${p === invoiceFilters.page ? 'active':''}" onclick="invoiceFilters.page=${p};loadInvoices()">${p}</button>`;
        }).join('')}
        <button ${invoiceFilters.page >= totalPages ? 'disabled':''} onclick="invoiceFilters.page++;loadInvoices()">›</button>
        <span style="font-size:12px;color:var(--text-secondary);margin-left:8px">${pag.total} hóa đơn</span>
      `;
    } else {
      pg.innerHTML = `<span style="font-size:12px;color:var(--text-secondary)">${pag.total} hóa đơn</span>`;
    }
  } catch (e) {
    el.innerHTML = `<div style="padding:48px;text-align:center"><p style="color:var(--danger)">Lỗi: ${e.message}</p></div>`;
  }
}

// ─── INVOICE DETAIL ───
async function renderInvoiceDetail(el) {
  const id = state.params?.id;
  if (!id) { el.innerHTML = '<p>Không tìm thấy hóa đơn</p>'; return; }
  el.innerHTML = '<p>Đang tải...</p>';

  try {
    const res = await api('GET', `/admin/invoice/${id}`);
    const inv = res.data;

    el.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Hóa đơn ${esc(inv.invoice_number || '')}</h3>
          ${invoiceStatusBadge(inv.status)}
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
            <div>
              <label style="font-size:12px;color:var(--text-secondary)">Đơn hàng</label>
              <p><strong>${esc(inv.order_code)}</strong></p>
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-secondary)">Khách hàng</label>
              <p><strong>${esc(inv.customer_name || inv.invoice_company_name || '')}</strong></p>
              ${inv.customer_phone ? `<p>${esc(inv.customer_phone)}</p>` : ''}
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-secondary)">Email nhận HĐ</label>
              <p>${esc(inv.invoice_email || inv.customer_email || '')}</p>
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-secondary)">Số hóa đơn</label>
              <p><strong>${esc(inv.invoice_number || '—')}</strong></p>
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-secondary)">Ngày xuất</label>
              <p>${inv.issued_at ? formatDate(inv.issued_at) : '—'}</p>
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-secondary)">Mẫu số / Ký hiệu</label>
              <p>${esc(inv.invoice_template || '')} / ${esc(inv.invoice_serial || '')}</p>
            </div>
          </div>
          ${inv.invoice_tax_code ? `
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
            <label style="font-size:12px;color:var(--text-secondary)">Thông tin bên mua (có VAT)</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">
              <div><strong>Công ty:</strong> ${esc(inv.invoice_company_name || '')}</div>
              <div><strong>Mã số thuế:</strong> ${esc(inv.invoice_tax_code || '')}</div>
              <div style="grid-column:1/-1"><strong>Địa chỉ:</strong> ${esc(inv.invoice_company_address || '')}</div>
              <div><strong>Người đại diện:</strong> ${esc(inv.invoice_representative || '')}</div>
            </div>
          </div>` : ''}
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
            <div>
              <label style="font-size:12px;color:var(--text-secondary)">Tiền hàng (chưa VAT)</label>
              <p style="font-size:18px;font-weight:700">${fmt(inv.total_before_vat || 0)}₫</p>
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-secondary)">Thuế VAT (${inv.vat_rate || 10}%)</label>
              <p style="font-size:18px;font-weight:700">${fmt(inv.vat_amount || 0)}₫</p>
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-secondary)">Phí giao hàng</label>
              <p>${fmt(inv.shipping_fee || 0)}₫</p>
            </div>
            <div style="grid-column:1/-1;text-align:right">
              <label style="font-size:14px;color:var(--text-secondary)">Tổng cộng</label>
              <p style="font-size:24px;font-weight:700;color:var(--primary)">${fmt(inv.total_amount || 0)}₫</p>
            </div>
          </div>
          ${inv.error_message ? `<div style="margin-top:16px;padding:12px;background:#FEE2E2;border-radius:6px;color:var(--danger)"><strong>Lỗi:</strong> ${esc(inv.error_message)}</div>` : ''}
          ${inv.cancel_reason ? `<div style="margin-top:16px;padding:12px;background:#F3F4F6;border-radius:6px"><strong>Lý do hủy:</strong> ${esc(inv.cancel_reason)}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="btn btn-outline" onclick="navigate('invoices')">← Quay lại</button>
        ${inv.status === 'issued' ? `
          <button class="btn btn-outline" onclick="resendInvoiceEmail('${inv.id}')">📧 Gửi email</button>
          <button class="btn btn-danger" onclick="cancelInvoice('${inv.id}')">🗑️ Hủy hóa đơn</button>
        ` : ''}
        ${inv.status === 'failed' ? `<button class="btn btn-primary" onclick="retryInvoice('${inv.id}')">🔄 Thử lại</button>` : ''}
        ${inv.status === 'pending' ? `<button class="btn btn-primary" onclick="issueInvoiceFromDetail('${inv.order_id}')">📄 Xuất hóa đơn</button>` : ''}
      </div>
      <div class="card">
        <div class="card-header"><h3>Lịch sử thao tác</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Thao tác</th><th>Chi tiết</th><th>Thời gian</th></tr></thead>
            <tbody>
              ${(inv.audit_log || []).map((log) => `
                <tr>
                  <td>${auditActionLabel(log.action)}</td>
                  <td>${log.details ? JSON.stringify(log.details) : ''}</td>
                  <td>${formatDate(log.created_at)}</td>
                </tr>
              `).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-secondary)">Chưa có thao tác</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger)">Lỗi: ${e.message}</p>`;
  }
}

function auditActionLabel(a) {
  return { issued:'📄 Xuất hóa đơn', retry:'🔄 Thử lại', cancelled:'🗑️ Hủy', resend_email:'📧 Gửi lại email' }[a] || a;
}

async function issueInvoiceFromDetail(orderId) {
  if (!confirm('Xác nhận xuất hóa đơn?')) return;
  try {
    await api('POST', `/admin/invoice/issue/${orderId}`);
    toast('Hóa đơn đã được xuất thành công');
    navigate('invoice-detail', { id: state.params?.id });
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ─── INBOX (CHAT) ───
let inboxState = { conversations: [], activeConv: null, messages: [], loadingList: false, loadingMsgs: false };
let inboxPollTimer = null;
let inboxMsgPollTimer = null;

async function renderInbox(el) {
  inboxState = { conversations: [], activeConv: null, messages: [], loadingList: false, loadingMsgs: false };
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:340px 1fr;gap:16px;min-height:calc(100vh - 160px)" class="inbox-layout">
      <div class="card" style="margin:0;display:flex;flex-direction:column">
        <div class="card-header"><h3>Hội thoại</h3></div>
        <div style="padding:8px">
          <input id="inbox-search" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;outline:none" placeholder="🔍 Tìm theo SĐT, tên...">
        </div>
        <div id="inbox-list" style="flex:1;overflow-y:auto;padding:4px"></div>
      </div>
      <div class="card" style="margin:0;display:flex;flex-direction:column">
        <div id="inbox-detail" style="flex:1;display:flex;flex-direction:column">
          <div style="padding:32px;text-align:center;color:var(--text-secondary);margin:auto">
            <p style="font-size:48px">💬</p>
            <p>Chọn một hội thoại để xem tin nhắn</p>
          </div>
        </div>
      </div>
    </div>
  `;
  await loadConversations();
  startInboxPolling();

  $('inbox-search')?.addEventListener('input', debounce(() => {
    loadConversations($('inbox-search')?.value || '');
  }, 300));
}

function startInboxPolling() {
  stopInboxPolling();
  inboxPollTimer = setInterval(() => {
    const search = $('inbox-search')?.value || '';
    loadConversations(search, true);
  }, 5000);
}

function stopInboxPolling() {
  if (inboxPollTimer) { clearInterval(inboxPollTimer); inboxPollTimer = null; }
  if (inboxMsgPollTimer) { clearInterval(inboxMsgPollTimer); inboxMsgPollTimer = null; }
}

function startMessagePolling(convId) {
  if (inboxMsgPollTimer) clearInterval(inboxMsgPollTimer);
  inboxMsgPollTimer = setInterval(() => {
    pollMessages(convId);
  }, 4000);
}

function stopMessagePolling() {
  if (inboxMsgPollTimer) { clearInterval(inboxMsgPollTimer); inboxMsgPollTimer = null; }
}

async function pollMessages(convId) {
  if (!convId || inboxState.loadingMsgs) return;
  try {
    const data = await api('GET', `/chat/admin/conversations/${convId}/messages`);
    const newMsgs = data.data || [];
    const oldLen = inboxState.messages.length;
    if (newMsgs.length > oldLen) {
      inboxState.messages = newMsgs;
      renderMessages($('inbox-detail'));
    } else if (newMsgs.length < oldLen) {
      inboxState.messages = newMsgs;
      renderMessages($('inbox-detail'));
    }
  } catch {}
}

async function loadConversations(search, silent) {
  inboxState.loadingList = true;
  const listEl = $('inbox-list');
  if (!listEl) return;
  if (!silent) listEl.innerHTML = '<p style="padding:16px;text-align:center;color:var(--text-secondary)">Đang tải...</p>';
  try {
    const params = new URLSearchParams({ limit: '50' });
    if (search) params.set('search', search);
    const data = await api('GET', `/chat/admin/conversations?${params}`);
    inboxState.conversations = data.data?.conversations || data.data || [];
    if (inboxState.conversations.length === 0) {
      listEl.innerHTML = '<p style="padding:24px;text-align:center;color:var(--text-secondary)">Chưa có hội thoại nào</p>';
      return;
    }
    listEl.innerHTML = inboxState.conversations.map(c => `
      <div class="conv-item ${inboxState.activeConv?.id === c.id ? 'conv-active' : ''}" onclick="selectConversation('${c.id}')" style="padding:12px 10px;border-bottom:1px solid var(--border);cursor:pointer;display:flex;gap:10px;align-items:center;transition:.15s;border-radius:6px">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${c.customer_name ? c.customer_name.charAt(0).toUpperCase() : '?'}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong style="font-size:13px">${esc(c.customer_name || c.customer_phone || 'Khách')}</strong>
            <span style="font-size:11px;color:var(--text-secondary)">${formatDate(c.last_message_at)}</span>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.last_preview || '')}</div>
          <div style="font-size:11px;color:var(--text-secondary)">${esc(c.customer_phone || '')}</div>
        </div>
        ${c.unread_count > 0 ? `<span style="background:var(--danger);color:white;font-size:11px;padding:1px 7px;border-radius:10px;font-weight:600">${c.unread_count}</span>` : ''}
      </div>
    `).join('');
  } catch (e) {
    if (!silent) listEl.innerHTML = `<p style="padding:16px;color:var(--danger)">Lỗi: ${e.message}</p>`;
  }
  inboxState.loadingList = false;
}

async function selectConversation(id) {
  const conv = inboxState.conversations.find(c => c.id === id);
  if (!conv) return;
  inboxState.activeConv = conv;
  // Re-render list to show active state
  const listEl = $('inbox-list');
  if (listEl) {
    listEl.querySelectorAll('.conv-item').forEach(el => el.classList.remove('conv-active'));
    const activeEl = listEl.querySelector(`[onclick*="'${id}'"]`);
    if (activeEl) activeEl.classList.add('conv-active');
  }
  await loadMessages(id);
  startMessagePolling(id);
}

async function loadMessages(convId) {
  inboxState.loadingMsgs = true;
  const detailEl = $('inbox-detail');
  if (!detailEl) return;
  detailEl.innerHTML = '<p style="padding:32px;text-align:center;color:var(--text-secondary)">Đang tải tin nhắn...</p>';
  try {
    const data = await api('GET', `/chat/admin/conversations/${convId}/messages`);
    inboxState.messages = data.data || [];
    renderMessages(detailEl);
  } catch (e) {
    detailEl.innerHTML = `<p style="padding:32px;color:var(--danger)">Lỗi: ${e.message}</p>`;
  }
  inboxState.loadingMsgs = false;
}

function renderMessages(el) {
  const conv = inboxState.activeConv;
  if (!conv) return;
  el.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div><strong>${esc(conv.customer_name || conv.customer_phone || 'Khách')}</strong> · ${esc(conv.customer_phone || '')}</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm btn-outline" onclick="loadMessages('${conv.id}')">🔄</button>
      </div>
    </div>
    <div id="inbox-msgs" style="flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:8px;min-height:300px;max-height:calc(100vh - 360px)"></div>
    <div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px">
      <textarea id="inbox-reply" style="flex:1;padding:8px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;outline:none;resize:none;min-height:40px;max-height:80px" placeholder="Nhập tin nhắn..." rows="1"></textarea>
      <button class="btn btn-primary" id="inbox-send-btn" style="align-self:flex-end">Gửi</button>
    </div>
  `;

  const msgsEl = $('inbox-msgs');
  if (msgsEl) {
    const msgs = inboxState.messages;
    if (msgs.length === 0) {
      msgsEl.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:32px">Chưa có tin nhắn. Hãy gửi lời chào đến khách hàng.</p>';
    } else {
      msgsEl.innerHTML = msgs.map(m => `
        <div style="display:flex;justify-content:${m.sender_type === 'admin' ? 'flex-end' : 'flex-start'}">
          <div style="max-width:80%;padding:8px 14px;border-radius:12px;${m.sender_type === 'admin' ? 'background:var(--primary);color:white;border-bottom-right-radius:4px' : 'background:#F0F2F5;border-bottom-left-radius:4px'}">
            <div style="font-size:13px;line-height:1.4">${esc(m.content)}</div>
            <div style="font-size:10px;margin-top:4px;${m.sender_type === 'admin' ? 'color:rgba(255,255,255,0.7)' : 'color:var(--text-secondary)'}">${formatDate(m.created_at)}</div>
          </div>
        </div>
      `).join('');
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }
  }

  $('inbox-send-btn')?.addEventListener('click', () => sendReply(conv.id));
  $('inbox-reply')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(conv.id); }
  });
}

async function sendReply(convId) {
  const input = $('inbox-reply');
  const content = input?.value?.trim();
  if (!content) return;
  input.value = '';
  try {
    await api('POST', `/chat/admin/conversations/${convId}/messages`, { content, sender_type: 'admin' });
    inboxState.messages.push({ content, sender_type: 'admin', created_at: new Date().toISOString() });
    const msgsEl = $('inbox-msgs');
    if (msgsEl) {
      msgsEl.innerHTML += `
        <div style="display:flex;justify-content:flex-end">
          <div style="max-width:80%;padding:8px 14px;border-radius:12px;background:var(--primary);color:white;border-bottom-right-radius:4px">
            <div style="font-size:13px;line-height:1.4">${esc(content)}</div>
            <div style="font-size:10px;margin-top:4px;color:rgba(255,255,255,0.7)">Vừa xong</div>
          </div>
        </div>
      `;
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }
    // Refresh conversations list
    loadConversations();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ─── VIDEOS ───
async function renderVideos(el) {
  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Video sản phẩm</h3>
        <button class="btn btn-sm btn-outline" onclick="loadAllProductsWithVideos()">📋 Tất cả sản phẩm có video</button>
      </div>
      <div style="padding:16px">
        <div style="display:flex;gap:12px;margin-bottom:16px">
          <input id="video-product-search" style="flex:1;padding:8px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;outline:none" placeholder="🔍 Tìm sản phẩm theo tên...">
          <button class="btn btn-primary" onclick="loadVideos()">Tìm</button>
        </div>
        <div id="video-list"><p style="color:var(--text-secondary)">🔍 Nhập tên sản phẩm để tìm, hoặc nhấn "Tất cả sản phẩm có video"</p></div>
      </div>
    </div>
  `;
  $('video-product-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadVideos();
  });
  // Auto-load first batch on page render
  loadAllProductsWithVideos();
}

async function loadAllProductsWithVideos() {
  const listEl = $('video-list');
  if (!listEl) return;
  listEl.innerHTML = '<p style="color:var(--text-secondary)">Đang tải tất cả sản phẩm...</p>';
  try {
    const data = await api('GET', '/admin/products?limit=50');
    const items = data.data || [];
    if (items.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-secondary)">Chưa có sản phẩm nào</p>';
      return;
    }
    listEl.innerHTML = items.map(p => `
      <div style="border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <strong>${esc(p.name)}</strong>
          <button class="btn btn-sm btn-primary" onclick="showAddVideoDialog('${p.id}','${esc(p.name)}')">+ Thêm video</button>
        </div>
        <div id="videos-${p.id}"><p style="color:var(--text-secondary);font-size:13px">Đang tải video...</p></div>
      </div>
    `).join('');
    items.forEach(p => loadProductVideos(p.id));
  } catch (e) {
    listEl.innerHTML = `<p style="color:var(--danger)">Lỗi: ${e.message}</p>`;
  }
}

async function loadVideos() {
  const search = $('video-product-search')?.value?.trim();
  const listEl = $('video-list');
  if (!listEl) return;
  if (!search) { listEl.innerHTML = '<p style="color:var(--text-secondary)">Nhập tên sản phẩm để tìm</p>'; return; }
  listEl.innerHTML = '<p style="color:var(--text-secondary)">Đang tải...</p>';
  try {
    const products = await api('GET', `/admin/products?search=${encodeURIComponent(search)}&limit=10`);
    const items = products.data || [];
    if (items.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-secondary)">Không tìm thấy sản phẩm</p>';
      return;
    }
    listEl.innerHTML = items.map(p => `
      <div style="border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <strong>${esc(p.name)}</strong>
          <button class="btn btn-sm btn-primary" onclick="showAddVideoDialog('${p.id}','${esc(p.name)}')">+ Thêm video</button>
        </div>
        <div id="videos-${p.id}"><p style="color:var(--text-secondary);font-size:13px">Đang tải video...</p></div>
      </div>
    `).join('');
    // Load videos for each product
    items.forEach(p => loadProductVideos(p.id));
  } catch (e) {
    listEl.innerHTML = `<p style="color:var(--danger)">Lỗi: ${e.message}</p>`;
  }
}

function validateVideoFile(f) {
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (!validTypes.includes(f.type)) { toast('Chỉ chấp nhận MP4, WebM, MOV', 'error'); return false; }
  if (f.size > 50 * 1024 * 1024) { toast('Kích thước tối đa 50MB', 'error'); return false; }
  return true;
}

function updateVideoFileInfo(f, overlay, prefix) {
  const el = overlay.querySelector(`#dlg-${prefix}-filename`);
  if (el) el.textContent = `📹 ${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`;
}

async function loadProductVideos(productId) {
  const el = $(`videos-${productId}`);
  if (!el) return;
  try {
    const data = await api('GET', `/admin/products/${productId}/videos`);
    const videos = data.data || [];
    if (videos.length === 0) {
      el.innerHTML = '<p style="color:var(--text-secondary);font-size:13px">Chưa có video</p>';
      return;
    }
    el.innerHTML = videos.map((v, i) => `
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--text-secondary);font-size:12px">#${i + 1}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600">${esc(v.title || 'Không có tên')}</div>
          ${v.description ? `<div style="font-size:12px;color:#555;margin:2px 0">${esc(v.description)}</div>` : ''}
          <div style="font-size:12px;color:var(--text-secondary)">${esc(v.video_category ? `📁 ${v.video_category}` : 'Chưa phân loại')} · Thứ tự: ${v.sort_order || 0}</div>
          <div style="font-size:11px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(v.url)}</div>
        </div>
        <button class="btn btn-sm btn-outline" onclick="window.open('${v.url}','_blank')" style="margin-right:4px">▶ Xem</button>
        <button class="btn btn-sm btn-outline" onclick="showEditVideoDialog('${v.id}','${productId}')" style="margin-right:4px">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteVideo('${v.id}','${productId}')">🗑️</button>
      </div>
    `).join('');
  } catch { el.innerHTML = '<p style="color:var(--danger);font-size:13px">Lỗi tải video</p>'; }
}

function showAddVideoDialog(productId, productName) {
  const overlay = document.createElement('div'); overlay.className = 'dialog-overlay';
  overlay.innerHTML = `
    <div class="dialog" style="width:440px">
      <h3 style="font-size:15px">Thêm video cho ${esc(productName)}</h3>
      <div style="display:flex;flex-direction:column;gap:8px;margin:12px 0">
        <div class="form-row" style="gap:8px">
          <div class="form-group" style="flex:2">
            <label style="font-size:12px">Tiêu đề <span style="color:var(--danger)">*</span></label>
            <input type="text" id="dlg-video-title" placeholder="VD: Giới thiệu tôm sú tươi" style="font-size:12px;padding:6px 10px">
          </div>
          <div class="form-group" style="flex:1">
            <label style="font-size:12px">Thứ tự</label>
            <input type="number" id="dlg-video-order" value="0" min="0" style="font-size:12px;padding:6px 10px">
          </div>
        </div>
        <div class="form-group">
          <label style="font-size:12px">Mô tả</label>
          <textarea id="dlg-video-desc" rows="1" placeholder="Mô tả nội dung video..." style="padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;outline:none;width:100%;resize:none;font-family:inherit"></textarea>
        </div>
        <div class="form-row" style="gap:8px">
          <div class="form-group" style="flex:2">
            <label style="font-size:12px">Video <span style="color:var(--danger)">*</span></label>
            <div style="border:2px dashed var(--border);border-radius:6px;padding:10px;text-align:center;cursor:pointer;background:#fafafa" id="dlg-video-dropzone">
              <div style="font-size:24px;margin-bottom:2px">🎬</div>
              <div style="font-size:11px;color:var(--text-secondary)">Kéo thả hoặc <strong style="color:var(--primary)">Chọn file</strong></div>
              <div style="font-size:10px;color:var(--text-secondary)">MP4, WebM, MOV • Tối đa 50MB</div>
              <input type="file" accept="video/mp4,video/webm,video/quicktime" id="dlg-video-file" style="display:none">
            </div>
            <div id="dlg-video-filename" style="font-size:11px;color:var(--text-secondary);margin-top:2px"></div>
          </div>
          <div class="form-group" style="flex:1">
            <label style="font-size:12px">Danh mục</label>
            <select id="dlg-video-category" style="font-size:12px;padding:6px 10px">
              <option value="">Chọn</option>
              <option value="intro">Giới thiệu</option>
              <option value="guide">Hướng dẫn</option>
              <option value="review">Review</option>
              <option value="fresh">Tươi sống</option>
              <option value="dry">Hải sản khô</option>
              <option value="featured">Nổi bật</option>
              <option value="other">Khác</option>
            </select>
          </div>
        </div>
        <div id="dlg-video-progress-wrap" style="display:none;margin-top:4px">
          <div style="background:var(--border);border-radius:4px;height:6px;overflow:hidden">
            <div id="dlg-video-progress-bar" style="width:0%;height:100%;background:var(--primary);border-radius:4px;transition:width .3s"></div>
          </div>
          <div id="dlg-video-progress-text" style="font-size:11px;color:var(--text-secondary);margin-top:2px">Đang tải lên...</div>
        </div>
      </div>
      <div class="dialog-actions" style="margin-top:8px">
        <button class="btn btn-cancel" id="dlg-cancel">Hủy</button>
        <button class="btn btn-primary" id="dlg-save">Lưu</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#dlg-cancel')?.addEventListener('click', () => overlay.remove());

  const dropzone = overlay.querySelector('#dlg-video-dropzone');
  const fileInput = overlay.querySelector('#dlg-video-file');
  dropzone?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--primary)'; });
  dropzone?.addEventListener('dragleave', () => { dropzone.style.borderColor = 'var(--border)'; });
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault(); dropzone.style.borderColor = 'var(--border)';
    const f = e.dataTransfer?.files?.[0];
    if (f && validateVideoFile(f)) { fileInput.files = e.dataTransfer.files; updateVideoFileInfo(f, overlay, 'video'); }
  });
  fileInput?.addEventListener('change', () => {
    const f = fileInput.files[0];
    if (f && validateVideoFile(f)) updateVideoFileInfo(f, overlay, 'video');
  });

  const addSaveBtn = overlay.querySelector('#dlg-save');
  const addCancelBtn = overlay.querySelector('#dlg-cancel');
  addSaveBtn?.addEventListener('click', async () => {
    const title = $('dlg-video-title')?.value?.trim();
    const file = $('dlg-video-file')?.files?.[0];
    const desc = $('dlg-video-desc')?.value?.trim();
    if (!title) { toast('Vui lòng nhập tiêu đề video', 'error'); return; }
    if (!file) { toast('Vui lòng tải lên file video', 'error'); return; }
    (addSaveBtn).disabled = true;
    (addSaveBtn).textContent = '⏳ Đang tải lên...';
    if (addCancelBtn) (addCancelBtn).disabled = true;
    const progressWrap = overlay.querySelector('#dlg-video-progress-wrap');
    const progressBar = overlay.querySelector('#dlg-video-progress-bar');
    const progressText = overlay.querySelector('#dlg-video-progress-text');
    progressWrap.style.display = 'block';
    try {
      const data = new FormData();
      data.append('title', title);
      if (desc) data.append('description', desc);
      data.append('video_category', $('dlg-video-category')?.value || '');
      data.append('sort_order', $('dlg-video-order')?.value || '0');
      data.append('video', file);
      await apiUpload('POST', `/admin/products/${productId}/videos/upload`, data, (pct) => {
        progressBar.style.width = pct + '%';
        progressText.textContent = `Đang tải lên... ${pct}%`;
      });
      progressBar.style.width = '100%';
      progressText.textContent = '✅ Tải lên hoàn tất';
      toast('Đã thêm video');
      setTimeout(() => { overlay.remove(); loadProductVideos(productId); }, 500);
    } catch (e) {
      (addSaveBtn).disabled = false;
      (addSaveBtn).textContent = 'Lưu';
      if (addCancelBtn) (addCancelBtn).disabled = false;
      progressWrap.style.display = 'none';
      toast(e.message, 'error');
    }
  });
}

async function deleteVideo(videoId, productId) {
  if (!confirm('Xóa video này?')) return;
  try {
    await api('DELETE', `/admin/products/videos/${videoId}`);
    toast('Đã xóa video');
    loadProductVideos(productId);
  } catch (e) {
    toast(e.message, 'error');
  }
}

function showEditVideoDialog(videoId, productId) {
  (async () => {
    try {
      const data = await api('GET', `/admin/products/${productId}/videos`);
      const video = (data.data || []).find(v => v.id === videoId);
      if (!video) { toast('Không tìm thấy video', 'error'); return; }

      const overlay = document.createElement('div'); overlay.className = 'dialog-overlay';
      overlay.innerHTML = `
        <div class="dialog" style="width:440px">
          <h3 style="font-size:15px">Sửa video</h3>
          <div style="display:flex;flex-direction:column;gap:8px;margin:12px 0">
            <div class="form-row" style="gap:8px">
              <div class="form-group" style="flex:2">
                <label style="font-size:12px">Tiêu đề <span style="color:var(--danger)">*</span></label>
                <input type="text" id="dlg-edit-title" value="${esc(video.title || '')}" style="font-size:12px;padding:6px 10px">
              </div>
              <div class="form-group" style="flex:1">
                <label style="font-size:12px">Thứ tự</label>
                <input type="number" id="dlg-edit-order" value="${video.sort_order || 0}" min="0" style="font-size:12px;padding:6px 10px">
              </div>
            </div>
            <div class="form-group">
              <label style="font-size:12px">Mô tả</label>
              <textarea id="dlg-edit-desc" rows="1" style="padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;outline:none;width:100%;resize:none;font-family:inherit">${esc(video.description || '')}</textarea>
            </div>
            <div class="form-group">
              <label style="font-size:12px">Tải lên video mới</label>
              <div style="border:2px dashed var(--border);border-radius:6px;padding:10px;text-align:center;cursor:pointer;background:#fafafa" id="dlg-edit-dropzone">
                <div style="font-size:24px;margin-bottom:2px">🎬</div>
                <div style="font-size:11px;color:var(--text-secondary)">Kéo thả hoặc <strong style="color:var(--primary)">Chọn file</strong> để thay thế</div>
                <div style="font-size:10px;color:var(--text-secondary)">MP4, WebM, MOV • Tối đa 50MB</div>
                <input type="file" accept="video/mp4,video/webm,video/quicktime" id="dlg-edit-file" style="display:none">
              </div>
              <div id="dlg-edit-filename" style="font-size:11px;color:var(--text-secondary);margin-top:2px"></div>
            </div>
            <div class="form-group" style="flex:1">
              <label style="font-size:12px">Danh mục</label>
              <select id="dlg-edit-category" style="font-size:12px;padding:6px 10px">
                <option value="">Chọn</option>
                <option value="intro" ${video.video_category === 'intro' ? 'selected':''}>Giới thiệu</option>
                <option value="guide" ${video.video_category === 'guide' ? 'selected':''}>Hướng dẫn</option>
                <option value="review" ${video.video_category === 'review' ? 'selected':''}>Review</option>
                <option value="fresh" ${video.video_category === 'fresh' ? 'selected':''}>Tươi sống</option>
                <option value="dry" ${video.video_category === 'dry' ? 'selected':''}>Hải sản khô</option>
                <option value="featured" ${video.video_category === 'featured' ? 'selected':''}>Nổi bật</option>
                <option value="other" ${video.video_category === 'other' ? 'selected':''}>Khác</option>
              </select>
            </div>
            <div id="dlg-edit-progress-wrap" style="display:none;margin-top:4px">
              <div style="background:var(--border);border-radius:4px;height:6px;overflow:hidden">
                <div id="dlg-edit-progress-bar" style="width:0%;height:100%;background:var(--primary);border-radius:4px;transition:width .3s"></div>
              </div>
              <div id="dlg-edit-progress-text" style="font-size:11px;color:var(--text-secondary);margin-top:2px">Đang tải lên...</div>
            </div>
          </div>
          <div class="dialog-actions" style="margin-top:8px">
            <button class="btn btn-cancel" id="dlg-cancel">Hủy</button>
            <button class="btn btn-primary" id="dlg-save">Lưu</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const dropzone = overlay.querySelector('#dlg-edit-dropzone');
      const fileInput = overlay.querySelector('#dlg-edit-file');
      let newFile = null;
      dropzone?.addEventListener('click', () => fileInput?.click());
      dropzone?.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--primary)'; });
      dropzone?.addEventListener('dragleave', () => { dropzone.style.borderColor = 'var(--border)'; });
      dropzone?.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation(); dropzone.style.borderColor = 'var(--border)';
        const f = e.dataTransfer?.files?.[0];
        if (f && validateVideoFile(f)) { newFile = f; updateVideoFileInfo(f, overlay, 'edit'); }
      });
      fileInput?.addEventListener('change', () => {
        const f = fileInput.files[0];
        if (f && validateVideoFile(f)) { newFile = f; updateVideoFileInfo(f, overlay, 'edit'); }
      });

      overlay.querySelector('#dlg-cancel')?.addEventListener('click', () => overlay.remove());
      const saveBtn = overlay.querySelector('#dlg-save');
      const cancelBtn = overlay.querySelector('#dlg-cancel');
      saveBtn?.addEventListener('click', async () => {
        const title = $('dlg-edit-title')?.value?.trim();
        if (!title) { toast('Vui lòng nhập tiêu đề', 'error'); return; }
        (saveBtn).disabled = true;
        (saveBtn).textContent = '⏳ Đang tải lên...';
        (cancelBtn).disabled = true;
        const progressWrap = overlay.querySelector('#dlg-edit-progress-wrap');
        const progressBar = overlay.querySelector('#dlg-edit-progress-bar');
        const progressText = overlay.querySelector('#dlg-edit-progress-text');
        try {
          const fd = new FormData();
          fd.append('title', title);
          fd.append('description', $('dlg-edit-desc')?.value?.trim() || '');
          fd.append('video_category', $('dlg-edit-category')?.value || '');
          fd.append('sort_order', $('dlg-edit-order')?.value || '0');
          if (newFile) {
            fd.append('video', newFile);
            progressWrap.style.display = 'block';
            await apiUpload('PUT', `/admin/products/videos/${videoId}/upload`, fd, (pct) => {
              progressBar.style.width = pct + '%';
              progressText.textContent = `Đang tải lên... ${pct}%`;
            });
            progressBar.style.width = '100%';
            progressText.textContent = '✅ Tải lên hoàn tất';
          } else {
            await api('PUT', `/admin/products/videos/${videoId}`, {
              title,
              description: $('dlg-edit-desc')?.value?.trim() || null,
              video_category: $('dlg-edit-category')?.value || null,
              sort_order: parseInt($('dlg-edit-order')?.value) || 0,
            });
          }
          toast('Đã cập nhật video');
          setTimeout(() => { overlay.remove(); loadProductVideos(productId); }, 500);
        } catch (e) {
          (saveBtn).disabled = false;
          (saveBtn).textContent = 'Lưu';
          (cancelBtn).disabled = false;
          toast(e.message, 'error');
        }
      });
    } catch (e) {
      toast(e.message, 'error');
    }
  })();
}

// ─── SHIPPING PARTNERS ───
async function renderShippingPartners(el) {
  el.innerHTML = '<p>Đang tải...</p>';
  try {
    const data = await api('GET', '/admin/shipping/partners');
    const partners = data.data || [];
    el.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Đối tác vận chuyển</h3>
          <button class="btn btn-sm btn-primary" onclick="showShippingPartnerDialog()">+ Thêm đối tác</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Tên</th>
              <th>Mô tả</th>
              <th>Phí giao hàng (₫)</th>
              <th>Thời gian giao</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr></thead>
            <tbody>
              ${partners.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-secondary)">Chưa có đối tác nào</td></tr>' :
                partners.map(p => `
              <tr>
                <td><strong>${esc(p.name)}</strong></td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.description || '')}</td>
                <td class="num">${fmt(p.fee)}</td>
                <td>${esc(p.estimated_days || '')} ngày</td>
                <td>${p.active ? '<span class="badge badge-green">Hoạt động</span>' : '<span class="badge badge-red">Tắt'}</td>
                <td>
                  <button class="btn btn-sm btn-outline" onclick="editShippingPartner('${p.id}')">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteShippingPartner('${p.id}')">🗑️</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger)">Lỗi: ${e.message}</p>`;
  }
}

function showShippingPartnerDialog(partner) {
  const p = partner || { name: '', description: '', logo: '🚚', api_endpoint: '', api_key: '', base_fee: 15000, fee_per_km: 5000, fee: 30000, estimated_days: 1, min_fee: 10000, max_fee: 50000, active: true, sort_order: 0 };
  const overlay = document.createElement('div'); overlay.className = 'dialog-overlay';
  overlay.innerHTML = `
    <div class="dialog" style="width:520px">
      <h3 style="font-size:15px">${partner ? 'Sửa đối tác' : 'Thêm đối tác'}</h3>
      <div style="display:flex;flex-direction:column;gap:8px;margin:12px 0">
        <div class="form-row" style="gap:8px">
          <div class="form-group" style="flex:3">
            <label style="font-size:12px">Tên đối tác <span style="color:var(--danger)">*</span></label>
            <input type="text" id="dlg-partner-name" value="${esc(p.name)}" placeholder="VD: GHN" style="font-size:12px;padding:6px 10px">
          </div>
          <div class="form-group" style="flex:1">
            <label style="font-size:12px">Logo</label>
            <input type="text" id="dlg-partner-logo" value="${esc(p.logo)}" placeholder="🚚" style="font-size:12px;padding:6px 10px;text-align:center">
          </div>
          <div class="form-group" style="flex:1">
            <label style="font-size:12px">Thứ tự</label>
            <input type="number" id="dlg-partner-order" value="${p.sort_order || 0}" min="0" style="font-size:12px;padding:6px 10px">
          </div>
        </div>
        <div class="form-group">
          <label style="font-size:12px">Mô tả</label>
          <textarea id="dlg-partner-desc" rows="1" placeholder="Mô tả ngắn..." style="font-size:12px;padding:6px 10px">${esc(p.description || '')}</textarea>
        </div>
        <details style="border:1px solid var(--border);border-radius:6px;padding:8px">
          <summary style="font-size:12px;font-weight:600;cursor:pointer;color:var(--primary)">⚙️ Cấu hình API carrier (nâng cao)</summary>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
            <div class="form-group">
              <label style="font-size:12px">API Endpoint</label>
              <input type="url" id="dlg-partner-api-url" value="${esc(p.api_endpoint || '')}" placeholder="https://api.carrier.vn" style="font-size:12px;padding:6px 10px">
            </div>
            <div class="form-group">
              <label style="font-size:12px">API Key / Token</label>
              <input type="password" id="dlg-partner-api-key" value="${esc(p.api_key || '')}" placeholder="Nhập API key" style="font-size:12px;padding:6px 10px">
            </div>
            <div class="form-row" style="gap:8px">
              <div class="form-group" style="flex:1">
                <label style="font-size:12px">Phí cơ bản (₫)</label>
                <input type="number" id="dlg-base-fee" value="${p.base_fee || 15000}" min="0" style="font-size:12px;padding:6px 10px">
              </div>
              <div class="form-group" style="flex:1">
                <label style="font-size:12px">Phí/km (₫)</label>
                <input type="number" id="dlg-fee-km" value="${p.fee_per_km || 5000}" min="0" style="font-size:12px;padding:6px 10px">
              </div>
            </div>
            <div class="form-row" style="gap:8px">
              <div class="form-group" style="flex:1">
                <label style="font-size:12px">Phí tối thiểu (₫)</label>
                <input type="number" id="dlg-min-fee" value="${p.min_fee || 10000}" min="0" style="font-size:12px;padding:6px 10px">
              </div>
              <div class="form-group" style="flex:1">
                <label style="font-size:12px">Phí tối đa (₫)</label>
                <input type="number" id="dlg-max-fee" value="${p.max_fee || 50000}" min="0" style="font-size:12px;padding:6px 10px">
              </div>
            </div>
          </div>
        </details>
        <div class="form-row" style="gap:8px">
          <div class="form-group" style="flex:1">
            <label style="font-size:12px">Phí cố định (₫) <span style="color:var(--danger)">*</span></label>
            <input type="number" id="dlg-partner-fee" value="${p.fee}" min="0" style="font-size:12px;padding:6px 10px">
          </div>
          <div class="form-group" style="flex:1">
            <label style="font-size:12px">Thời gian (ngày)</label>
            <input type="number" id="dlg-partner-days" value="${p.estimated_days || 1}" min="1" style="font-size:12px;padding:6px 10px">
          </div>
          <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:4px">
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
              <input type="checkbox" id="dlg-partner-active" ${p.active !== false ? 'checked':''}>
              <span>Kích hoạt</span>
            </label>
          </div>
        </div>
      </div>
      <div class="dialog-actions" style="margin-top:8px">
        <button class="btn btn-cancel" id="dlg-cancel">Hủy</button>
        <button class="btn btn-primary" id="dlg-save">${partner ? 'Cập nhật' : 'Thêm'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const spSaveBtn = overlay.querySelector('#dlg-save');
  const spCancelBtn = overlay.querySelector('#dlg-cancel');
  spCancelBtn?.addEventListener('click', () => overlay.remove());
  spSaveBtn?.addEventListener('click', async () => {
    const data = {
      name: $('dlg-partner-name')?.value?.trim(),
      description: $('dlg-partner-desc')?.value?.trim() || null,
      logo: $('dlg-partner-logo')?.value?.trim() || '🚚',
      api_endpoint: $('dlg-partner-api-url')?.value?.trim() || null,
      api_key: $('dlg-partner-api-key')?.value?.trim() || null,
      base_fee: parseInt($('dlg-base-fee')?.value) || 15000,
      fee_per_km: parseInt($('dlg-fee-km')?.value) || 5000,
      fee: parseInt($('dlg-partner-fee')?.value) || 30000,
      estimated_days: parseInt($('dlg-partner-days')?.value) || 1,
      min_fee: parseInt($('dlg-min-fee')?.value) || 10000,
      max_fee: parseInt($('dlg-max-fee')?.value) || 50000,
      sort_order: parseInt($('dlg-partner-order')?.value) || 0,
      active: $('dlg-partner-active')?.checked !== false,
    };
    if (!data.name) { toast('Vui lòng nhập tên đối tác', 'error'); return; }
    (spSaveBtn).disabled = true;
    (spSaveBtn).textContent = '⏳ Đang lưu...';
    if (spCancelBtn) (spCancelBtn).disabled = true;
    try {
      if (partner?.id) {
        await api('PUT', `/admin/shipping/partners/${partner.id}`, data);
        toast('Đã cập nhật đối tác');
      } else {
        await api('POST', '/admin/shipping/partners', data);
        toast('Đã thêm đối tác');
      }
      overlay.remove();
      navigate('shipping-partners');
    } catch (e) {
      (spSaveBtn).disabled = false;
      (spSaveBtn).textContent = partner ? 'Cập nhật' : 'Thêm';
      if (spCancelBtn) (spCancelBtn).disabled = false;
      toast(e.message, 'error');
    }
  });
}

async function editShippingPartner(id) {
  try {
    const data = await api('GET', '/admin/shipping/partners');
    const partner = (data.data || []).find(p => p.id === id);
    if (partner) showShippingPartnerDialog(partner);
    else toast('Không tìm thấy đối tác', 'error');
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteShippingPartner(id) {
  if (!confirm('Xóa đối tác vận chuyển này?')) return;
  try {
    await api('DELETE', `/admin/shipping/partners/${id}`);
    toast('Đã xóa đối tác');
    navigate('shipping-partners');
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ─── UTILS ───
function fmt(n) { if (!n && n !== 0) return '0'; return Number(n).toLocaleString('vi-VN'); }
function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' });
}
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ─── START ───
render();
