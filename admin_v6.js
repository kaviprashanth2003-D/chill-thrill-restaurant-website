/**
 * admin_v6.js - Core Admin Dashboard Logic
 * ==========================================================================
 * Handles the administrative backend logic, including dashboard analytics,
 * product management, order processing, live support, and user administration.
 */

console.log("CT_DEBUG: SCRIPT_START");
document.addEventListener('DOMContentLoaded', () => {
  console.log("CT_DEBUG: DOMContentLoaded Start");
  

/* 1. ADMIN LIVE CHAT SYSTEM 
   ========================================================================== */
/**
 * Handles real-time communication with customers.
 */
  window.currentChatSession = null;
  window.chatAdminInterval = null;
  let lastChatSessionsHtml = '';
  
  // Enforce global background polling for notifications
  setInterval(() => {
      if (typeof window.renderAdminChats === 'function') {
          window.renderAdminChats();
      }
  }, 4000);

  /**
   * Fetches and renders the list of active chat sessions.
   */
  window.renderAdminChats = function() {
      const list = document.getElementById('admin-chat-sessions');
      if(!list) return;

      fetch('api/chat_admin_sessions.php')
      .then(res => res.json())
      .then(sessions => {
          if(!sessions || sessions.length === 0) {
              const emptyHtml = '<div style="padding:20px; text-align:center; color:var(--text-muted);">No active chats in database.</div>';
              if (lastChatSessionsHtml !== emptyHtml) {
                  list.innerHTML = emptyHtml;
                  lastChatSessionsHtml = emptyHtml;
              }
              updateChatNotificationBadge(0);
              return;
          }
          
          let newHtml = '';
          let totalUnread = 0;
          
          sessions.forEach(s => {
              // Safely handle quotes in data
              const cid = (s.id || '').replace(/'/g, "\\'");
              const cname = (s.customer_name || 'Guest').replace(/'/g, "\\'");
              const isActive = s.id === window.currentChatSession;
              const time = s.last_active ? s.last_active.split(' ')[1] || s.last_active : '00:00';
              const unread = parseInt(s.unread_count || 0);
              totalUnread += unread;
              
              const unreadBadge = unread > 0 ? `<div style="background:var(--neon-blue); color:#000; font-size:0.7rem; font-weight:bold; border-radius:50%; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; margin-left:10px;">${unread}</div>` : '';
              const fontWeight = unread > 0 ? '900' : 'bold';
              const textColor = unread > 0 ? 'var(--neon-blue)' : 'white';
              
              newHtml += `
                <div class="chat-session-item" 
                     style="padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; background: ${isActive ? 'rgba(0,243,255,0.1)' : 'transparent'};"
                     onclick="window.openAdminChat('${cid}', '${cname}')">
                    <div style="font-weight:${fontWeight}; color:${textColor};">${s.customer_name || 'Guest'} ${unreadBadge} <span style="font-size:0.7rem; color:var(--text-muted); float:right; font-weight:normal;">${time}</span></div>
                    <div style="font-size:0.85rem; color:${unread > 0 ? 'white' : 'var(--text-muted)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; ${unread > 0 ? 'font-weight:600;' : ''}">${s.last_message || 'New Chat'}</div>
                </div>
              `;
          });
          
          updateChatNotificationBadge(totalUnread);
          
          // Only update DOM if HTML actually changed to prevent destroying click events
          if (list.innerHTML !== newHtml) {
              list.innerHTML = newHtml;
              lastChatSessionsHtml = newHtml;
          }
      })
      .catch(err => console.error("CT_DEBUG: Fetch error in renderAdminChats:", err));
  };

  function updateChatNotificationBadge(unreadCount) {
      const topBadge = document.getElementById('top-badge');
      const notifDropdown = document.getElementById('notification-dropdown');
      
      if(topBadge && unreadCount > 0) {
          topBadge.textContent = 3 + unreadCount;
          topBadge.style.display = 'flex';
      } else if (topBadge) {
          topBadge.textContent = '3';
          topBadge.style.display = 'flex';
      }
      
      if(notifDropdown) {
          let chatNotif = document.getElementById('chat-notif-item');
          if (!chatNotif) {
              chatNotif = document.createElement('p');
              chatNotif.id = 'chat-notif-item';
              chatNotif.style.cssText = 'font-size: 0.85rem; padding: 10px; cursor: pointer; border-radius: 5px; background: rgba(0,243,255,0.1); border: 1px solid var(--neon-blue); margin-bottom: 5px;';
              chatNotif.onclick = () => {
                  const dashSelect = document.getElementById('dashboard-select');
                  if (dashSelect) dashSelect.value = 'dashboard';
                  document.querySelector('.nav-item[data-target="livechat"]').click();
                  notifDropdown.style.display = 'none';
              };
              const header = notifDropdown.querySelector('h4');
              if (header) {
                  header.parentNode.insertBefore(chatNotif, header.nextSibling);
              }
          }
          
          if (unreadCount > 0) {
              chatNotif.innerHTML = `<i class="fas fa-comment-dots text-blue"></i> <span style="color:var(--neon-blue); font-weight:bold;">${unreadCount} unread chat message(s).</span>`;
              chatNotif.style.display = 'block';
          } else {
              chatNotif.style.display = 'none';
          }
      }
  }

  window.openAdminChat = function(id, name) {
      window.currentChatSession = id;
      document.getElementById('admin-chat-header-name').textContent = "Chatting with: " + name;
      
      // Force UI update to highlight selected chat session
      window.renderAdminChats(); 
      window.loadAdminMessages();
      
      if(window.chatAdminInterval) clearInterval(window.chatAdminInterval);
      window.chatAdminInterval = setInterval(window.loadAdminMessages, 3000);
      document.getElementById('admin-chat-input-area').style.display = 'flex';
  };

  window.loadAdminMessages = function() {
      if(!window.currentChatSession) return;
      fetch('api/chat_get.php?session_id=' + window.currentChatSession + '&role=admin')
      .then(r=>r.json())
      .then(msgs => {
          const msgContainer = document.getElementById('admin-chat-msg-container');
          if(!msgContainer) return;
          
          const isAtBottom = msgContainer.scrollHeight - msgContainer.clientHeight <= msgContainer.scrollTop + 10;
          
          const newMsgHtml = msgs.map(m => `
              <div class="chat-bubble ${m.sender_type === 'admin' ? 'msg-self' : 'msg-admin'}" style="margin-bottom: 15px; clear:both; max-width:80%; padding:10px 15px; border-radius:15px; ${m.sender_type === 'admin' ? 'align-self: flex-end; float:right; background: var(--primary); color:white; border-bottom-right-radius:5px;' : 'align-self: flex-start; float:left; background: rgba(255,255,255,0.1); color:white; border-bottom-left-radius:5px; border:1px solid rgba(255,255,255,0.05);'}">
                  ${m.message}
                  <div class="msg-time" style="font-size:0.7rem; opacity:0.6; margin-top:5px; text-align:right;">${m.created_at.split(' ')[1]}</div>
              </div>
              <div style="clear:both;"></div>
          `).join('');
          
          if (msgContainer.innerHTML !== newMsgHtml) {
              msgContainer.innerHTML = newMsgHtml;
              if (isAtBottom) {
                  msgContainer.scrollTop = msgContainer.scrollHeight;
              }
          }
      });
  };

  window.sendAdminChat = function() {
      const input = document.getElementById('admin-chat-input');
      const text = input.value.trim();
      if(!text || !window.currentChatSession) return;
      input.value = '';
      
      fetch('api/chat_send.php', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
              session_id: window.currentChatSession,
              sender_type: 'admin',
              message: text
          })
      }).then(() => {
          window.loadAdminMessages();
          const mc = document.getElementById('admin-chat-msg-container');
          setTimeout(() => { if(mc) mc.scrollTop = mc.scrollHeight; }, 300);
      });
  };
  

/* 2. AUTHORIZATION & NAVBAR UI 
   ========================================================================== */
  const session = JSON.parse(localStorage.getItem('chillSession') || sessionStorage.getItem('chillSession'));
  if (!session || session.role !== 'admin') {
    window.location.href = 'login.html';
    return;
  }

  // Update Username and Avatar in Navbar
  const profileName = document.querySelector('.profile-info .name');
  const topAvatar = document.getElementById('top-avatar');
  if (session && session.name) {
    if (profileName) profileName.textContent = session.name;
    if (topAvatar) topAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(session.name)}&background=random&color=fff`;
  }

  // Top Nav Profile & Notification Toggles
  const profileTrigger = document.getElementById('profile-trigger');
  const profileDropdown = document.getElementById('profile-dropdown');
  if (profileTrigger && profileDropdown) {
    profileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.style.display = profileDropdown.style.display === 'none' ? 'flex' : 'none';
      const notifDropdown = document.getElementById('notification-dropdown');
      if (notifDropdown) notifDropdown.style.display = 'none';
    });
  }

  const notifTrigger = document.getElementById('top-notification');
  const notifDropdown = document.getElementById('notification-dropdown');
  const topBadge = document.getElementById('top-badge');
  if (notifTrigger && notifDropdown) {
    notifTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.style.display = notifDropdown.style.display === 'none' ? 'flex' : 'none';
      if (profileDropdown) profileDropdown.style.display = 'none';
      if (topBadge) topBadge.style.display = 'none'; // Clear badge on view
    });
  }

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    if (profileDropdown) profileDropdown.style.display = 'none';
    if (notifDropdown) notifDropdown.style.display = 'none';
  });

  // Logout Logic
  const doLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('chillSession');
    sessionStorage.removeItem('chillSession');
    window.location.href = 'login.html';
  };
  
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
  
  const topLogoutBtn = document.querySelector('.top-logout-btn');
  if (topLogoutBtn) topLogoutBtn.addEventListener('click', doLogout);


/* 3. TOAST NOTIFICATION SYSTEM 
   ========================================================================== */
  window.showToast = function(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${msg}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('active'), 10);
    
    setTimeout(() => {
      toast.classList.remove('active');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };


/* 4. NAVIGATION & SIDEBAR LOGIC 
   ========================================================================== */
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarClose = document.getElementById('sidebar-close');

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.add('active');
    });
  }

  if (sidebarClose) {
    sidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('active');
    });
  }

  // Sidebar Navigation Logic
  const navItems = document.querySelectorAll('.nav-item[data-target]');
  const contentSections = document.querySelectorAll('.content-section');

  const dashSelect = document.getElementById('dashboard-select');
  if (dashSelect) {
    dashSelect.addEventListener('change', (e) => {
      const target = e.target.value;
      const navItem = document.querySelector(`.nav-item[data-target='${target}']`);
      if (navItem) navItem.click();
    });
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const target = item.getAttribute('data-target');
      
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      contentSections.forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
      });
      
      const targetSection = document.getElementById(`section-${target}`);
      if (targetSection) {
        targetSection.style.display = 'block';
        setTimeout(() => targetSection.classList.add('active'), 50);
        
        // Trigger data refresh based on section
        if (target === 'livechat') {
            if (typeof window.renderAdminChats === 'function') window.renderAdminChats();
        } else if (target === 'messages') {
            if (typeof window.renderAdminMessagesList === 'function') window.renderAdminMessagesList();
        } else if (target === 'users') {
            if (typeof window.renderCustomerUsers === 'function') window.renderCustomerUsers();
        } else if (target === 'products') {
            if (typeof window.renderAdminProducts === 'function') window.renderAdminProducts();
        } else if (target === 'orders') {
            if (typeof window.renderAllOrders === 'function') window.renderAllOrders();
        }
      }
      
      if (dashSelect && ["dashboard", "analytics", "sales"].includes(target)) {
        dashSelect.value = target;
      }
      
      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
      }
    });
  });


/* 5. DASHBOARD STATISTICS & POLLING 
   ========================================================================== */
  const updateStats = () => {
    fetch('api/get_orders.php').then(r=>r.json()).then(oData => {
        let orders = oData || [];
        
        let totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
        const statRev = document.getElementById('stat-revenue');
        if (statRev) statRev.textContent = totalRevenue >= 1000 ? 'Rs ' + (totalRevenue / 1000).toFixed(1) + 'k' : 'Rs ' + totalRevenue.toFixed(2);
        
        const statOrd = document.getElementById('stat-orders');
        if (statOrd) statOrd.textContent = orders.length;

        // Fetch user count for conversion
        fetch('api/get_users.php').then(r=>r.json()).then(uData => {
            let uCount = uData.length || 0;
            const statUsers = document.getElementById('stat-users');
            if (statUsers) statUsers.textContent = uCount;
            const statConv = document.getElementById('stat-conversion');
            if (statConv) statConv.textContent = (orders.length > 0 && uCount > 0 ? ((orders.length / uCount) * 100).toFixed(1) : '0.0') + '%';
        });

        const tbody = document.getElementById('table-body');
        if (tbody) {
          tbody.innerHTML = '';
          const recentOrders = [...orders].reverse().slice(0, 5);
          if (recentOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No recent orders.</td></tr>';
          } else {
            recentOrders.forEach(row => {
              const avatarUrl = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(row.customer) + '&background=random&color=fff';
              const tr = document.createElement('tr');
              tr.innerHTML = `<td>${row.orderId}</td><td><div style="display: flex; align-items: center; gap: 10px;"><img src="${avatarUrl}" style="width: 30px; height: 30px; border-radius: 50%;" alt=""><span>${row.customer}</span></div></td><td>${row.date.split(' ')[0]}</td><td><span class="status-badge ${row.status === 'Completed' ? 'status-completed' : 'status-pending'}">${row.status}</span></td><td>Rs. ${parseFloat(row.total).toFixed(2)}</td>`;
              tbody.appendChild(tr);
            });
          }
        }
        
        const completedForSales = orders.filter(o => o.status === 'Completed');
        const totalRevSales = completedForSales.reduce((sum, o) => sum + parseFloat(o.total), 0);
        const totalItems = completedForSales.reduce((sum, o) => sum + parseInt(o.qty || 1), 0);
        const avgOrder = completedForSales.length ? totalRevSales / completedForSales.length : 0;
        if(document.getElementById('sales-monthly-rev')) document.getElementById('sales-monthly-rev').textContent = 'Rs. ' + totalRevSales.toLocaleString();
        if(document.getElementById('sales-avg-order')) document.getElementById('sales-avg-order').textContent = 'Rs. ' + Math.round(avgOrder).toLocaleString();
        if(document.getElementById('sales-items-sold')) document.getElementById('sales-items-sold').textContent = totalItems.toLocaleString();
    });
  };
  updateStats();
  
  // Periodic Update Stats
  const runPeriodicStats = () => {
      fetch('api/get_orders.php').then(r=>r.json()).then(oData => {
          fetch('api/get_users.php').then(r=>r.json()).then(uData => {
              const orders = oData || [];
              const users = uData || [];
              
              const statRevenue = document.getElementById('stat-revenue');
              const statUsers = document.getElementById('stat-users');
              const statOrders = document.getElementById('stat-orders');
              const statConversion = document.getElementById('stat-conversion');
              
              let totalRev = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
              if (statRevenue) statRevenue.textContent = totalRev >= 1000 ? 'Rs ' + (totalRev / 1000).toFixed(1) + 'k' : 'Rs ' + totalRev.toFixed(0);
              if (statUsers) statUsers.textContent = users.length;
              if (statOrders) statOrders.textContent = orders.length;
              if (statConversion) {
                let conv = orders.length > 0 && users.length > 0 ? ((orders.length / users.length) * 100).toFixed(1) : '0.0';
                statConversion.textContent = conv + '%';
              }
          });
      });
  };
  runPeriodicStats();
  setInterval(runPeriodicStats, 30000); // Update every 30s

  // INITIALIZE ALL GLOBALS FIRST
  window.currentChatSession = null;
  window.chatAdminInterval = null;

  window.renderAdminChats = function() {
      console.log("CT_DEBUG: Starting renderAdminChats...");
      const list = document.getElementById('admin-chat-sessions');
      if(!list) return;

      fetch('api/chat_admin_sessions.php')
      .then(res => res.json())
      .then(sessions => {
          console.log("CT_DEBUG: Sessions found:", sessions ? sessions.length : 0);
          if(!sessions || sessions.length === 0) {
              list.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">No active chats.</div>';
              return;
          }
          let html = '';
          sessions.forEach(s => {
              const isActive = s.id === window.currentChatSession;
              const time = s.last_active ? s.last_active.split(' ')[1] || s.last_active : '00:00';
              html += `
                <div class="chat-session-item" 
                     style="padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; background: ${isActive ? 'rgba(0,243,255,0.1)' : 'transparent'};"
                     onclick="window.openAdminChat('${s.id}', '${s.customer_name}')">
                    <div style="font-weight:bold; color:white;">${s.customer_name || 'Guest'} <span style="font-size:0.7rem; color:var(--text-muted); float:right;">${time}</span></div>
                    <div style="font-size:0.85rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.last_message || 'New Chat'}</div>
                </div>
              `;
          });
          list.innerHTML = html;
      })
      .catch(err => console.error("CT_DEBUG: Fetch error:", err));
  };


/* 6. USER ACCOUNT MANAGEMENT 
   ========================================================================== */
  window.renderCustomerUsers = function() {
    fetch('api/get_users.php').then(r=>r.json()).then(users => {
      const usersTbody = document.getElementById('users-table-body');
      if (usersTbody) {
        usersTbody.innerHTML = '';
        if (!users || users.length === 0) {
          usersTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">No users found. Go to the Sign Up page to create a customer account.</td></tr>';
        } else {
          users.forEach(user => {
            const tr = document.createElement('tr');
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`;
            tr.innerHTML = `
              <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <img src="${avatarUrl}" style="width: 30px; height: 30px; border-radius: 50%;" alt="">
                  <span>${user.name}</span>
                </div>
              </td>
              <td>${user.email}</td>
              <td>${user.phone || 'N/A'}</td>
              <td>
                <button onclick="deleteCustomerUser(${user.id})" class="btn-glass" style="padding: 5px 10px; font-size: 0.8rem; border-color: #ff4d4d; color: #ff4d4d;"><i class="fas fa-trash"></i></button>
              </td>
            `;
            usersTbody.appendChild(tr);
          });
        }
      }
    });
  };
  
  window.renderCustomerUsers();

  window.deleteCustomerUser = function(id) {
    if (confirm('Are you sure you want to delete this customer account?')) {
      fetch('api/delete_user.php', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({id})
      }).then(() => {
          window.renderCustomerUsers();
          updateStats();
      });
    }
  };


/* 7. PRODUCT & MENU MANAGEMENT 
   ========================================================================== */
  window.renderAdminProducts = function() {
    fetch('api/get_products.php').then(r=>r.json()).then(products => {
      const productsTbody = document.getElementById('products-table-body');
      if (productsTbody) {
        productsTbody.innerHTML = '';
        if (!products || products.length === 0) {
          productsTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No products found.</td></tr>';
        } else {
          products.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>
                <img src="${item.image}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover; display: inline-block; background-color: var(--glass-border);" alt="Product Image" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random&color=fff&size=128'">
              </td>
              <td style="font-weight: 500;">${item.name}</td>
              <td>${item.category}</td>
              <td>Rs. ${parseFloat(item.price).toFixed(2)}</td>
              <td>
                <button onclick="editProduct(${item.id})" class="btn-glass" style="padding: 5px 10px; font-size: 0.8rem; margin-right: 5px; border-color: var(--neon-purple); color: var(--neon-purple);"><i class="fas fa-edit"></i></button>
                <button onclick="deleteProduct(${item.id})" class="btn-glass" style="padding: 5px 10px; font-size: 0.8rem; border-color: #ff4d4d; color: #ff4d4d;"><i class="fas fa-trash"></i></button>
              </td>
            `;
            productsTbody.appendChild(tr);
          });
        }
      }
    });
  };
  
  window.renderAdminProducts();
  
  // Product Modal Functions
  window.openProductModal = function(id = null) {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('modal-product-title');
    modal.style.display = 'flex';
    
    if (id) {
      title.textContent = 'Edit Product';
      fetch('api/get_products.php').then(r=>r.json()).then(items => {
        const item = items.find(i => parseInt(i.id) === id);
        if (item) {
          document.getElementById('prod-id').value = item.id;
          document.getElementById('prod-name').value = item.name;
          document.getElementById('prod-category').value = item.category;
          document.getElementById('prod-price').value = item.price;
          document.getElementById('prod-image').value = item.image || '';
          document.getElementById('prod-desc').value = item.description || '';
        }
      });
    } else {
      title.textContent = 'Add Product';
      form.reset();
      document.getElementById('prod-id').value = '';
    }
  };

  window.uploadProductImage = function(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('image', file);

    const btn = input.nextElementSibling;
    const oldText = btn.textContent;
    btn.textContent = 'Uploading...';
    btn.disabled = true;

    fetch('api/upload_image.php', {
        method: 'POST',
        body: formData
    }).then(r => r.json()).then(data => {
        btn.textContent = oldText;
        btn.disabled = false;
        if (data.success) {
            document.getElementById('prod-image').value = data.url;
            document.getElementById('prod-image-preview').src = data.url;
        } else {
            alert('Image Upload Failed: ' + data.message);
        }
    }).catch(err => {
        btn.textContent = oldText;
        btn.disabled = false;
        alert('Network error during upload.');
    });
  };

  window.closeProductModal = function() {
    document.getElementById('product-modal').style.display = 'none';
  };

  window.saveProduct = function(e) {
    e.preventDefault();
    const payload = {
      id: document.getElementById('prod-id').value,
      name: document.getElementById('prod-name').value,
      category: document.getElementById('prod-category').value,
      price: parseFloat(document.getElementById('prod-price').value),
      image: document.getElementById('prod-image').value || 'https://ui-avatars.com/api/?name=Product&background=random&color=fff&size=128',
      description: document.getElementById('prod-desc').value
    };

    fetch('api/save_product.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    }).then(() => {
        window.closeProductModal();
        window.renderAdminProducts();
    });
  };

  window.deleteProduct = function(id) {
    if (confirm('Are you sure you want to delete this product?')) {
      fetch('api/delete_product.php', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({id})
      }).then(() => {
          window.renderAdminProducts();
      });
    }
  };
  window.editProduct = window.openProductModal;


/* 8. ORDER MANAGEMENT (Pending & Completed) 
   ========================================================================== */
  window.renderAllOrders = function() {
    fetch('api/get_orders.php').then(r=>r.json()).then(orders => {
      const pendingTbody = document.getElementById('pending-orders-tbody');
      const completedTbody = document.getElementById('completed-orders-tbody');
      
      if (pendingTbody && completedTbody) {
        pendingTbody.innerHTML = '';
        completedTbody.innerHTML = '';
        
        const pendingOrders = orders.filter(o => o.status !== 'Completed');
        const completedOrders = orders.filter(o => o.status === 'Completed');
        
        if (pendingOrders.length === 0) {
          pendingTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No pending orders found.</td></tr>';
        } else {
          pendingOrders.forEach(order => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td style="color: var(--neon-pink); font-weight: 600;">${order.orderId}</td>
              <td>
                <div style="font-weight: 500;">${order.customer}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${order.phone}</div>
              </td>
              <td>
                <div style="font-size: 0.85rem;">Drop: <span style="color: var(--neon-cyan);">${order.time || 'ASAP'}</span></div>
                <div style="font-size: 0.8rem; color: var(--text-muted); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${order.address}">${order.address}</div>
              </td>
              <td>
                <div>${order.productName} <span style="color: var(--text-muted);">x${order.qty}</span></div>
              </td>
              <td><span class="status-badge status-pending">${order.status || 'Pending'}</span></td>
              <td style="font-weight: bold;">Rs. ${parseFloat(order.total).toFixed(2)}</td>
              <td>
                <button onclick="window.adminCompleteOrder('${order.orderId}')" class="btn-glass" style="padding: 5px 10px; font-size: 0.8rem; margin-right: 5px; border-color: var(--neon-cyan); color: var(--neon-cyan);" title="Mark Complete"><i class="fas fa-check"></i></button>
                <button onclick="window.adminDeleteOrder('${order.orderId}')" class="btn-glass" style="padding: 5px 10px; font-size: 0.8rem; border-color: #ff4d4d; color: #ff4d4d;" title="Cancel Order"><i class="fas fa-times"></i></button>
              </td>
            `;
            pendingTbody.appendChild(tr);
          });
        }

        if (completedOrders.length === 0) {
          completedTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No completed orders found.</td></tr>';
        } else {
          completedOrders.forEach(order => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td style="color: var(--neon-blue); font-weight: 600;">${order.orderId}</td>
              <td>${order.customer}</td>
              <td style="font-size: 0.85rem;">${order.date}</td>
              <td>${order.productName} <span style="color: var(--text-muted);">x${order.qty}</span></td>
              <td><span class="status-badge status-completed">${order.status}</span></td>
              <td style="font-weight: bold;">Rs. ${parseFloat(order.total).toFixed(2)}</td>
              <td>
                <button onclick="window.adminDeleteOrder('${order.orderId}')" class="btn-glass" style="padding: 5px 10px; font-size: 0.8rem; border-color: #ff4d4d; color: #ff4d4d;" title="Delete Record"><i class="fas fa-trash"></i></button>
              </td>
            `;
            completedTbody.appendChild(tr);
          });
        }
      }
    });
  };
  
  window.renderAllOrders();

  window.adminCompleteOrder = function(orderId) {
    console.log("CT_DEBUG: adminCompleteOrder triggered for", orderId);
    if (confirm("Mark this order as completed?")) {
      fetch('api/update_order.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'Completed' })
      })
      .then(res => res.json())
      .then(data => {
        window.showToast("Order #" + orderId + " marked as completed!", "success");
        window.renderAllOrders();
        updateStats();
      })
      .catch(err => {
        window.showToast("Failed to update order", "error");
        console.error(err);
      });
    }
  };

  window.adminDeleteOrder = function(orderId) {
    console.log("CT_DEBUG: adminDeleteOrder triggered for", orderId);
    if (confirm("Are you sure you want to delete this order?")) {
      fetch('api/delete_order.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })
      .then(res => res.json())
      .then(data => {
        window.showToast("Order #" + orderId + " deleted successfully", "success");
        window.renderAllOrders();
        updateStats();
      })
      .catch(err => {
        window.showToast("Failed to delete order", "error");
        console.error(err);
      });
    }
  };


/* 9. ADMIN USER ADMINISTRATION 
   ========================================================================== */
  window.renderAdminUsersList = function() {
    fetch('api/get_admins.php').then(r=>r.json()).then(admins => {
      const adminsTbody = document.getElementById('admins-table-body');
      if (adminsTbody) {
        adminsTbody.innerHTML = '';
        if (!admins || admins.length === 0) {
          adminsTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">No admins found.</td></tr>';
        } else {
          admins.forEach(admin => {
            const tr = document.createElement('tr');
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.name)}&background=random&color=fff`;
            tr.innerHTML = `
              <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <img src="${avatarUrl}" style="width: 30px; height: 30px; border-radius: 50%;" alt="">
                  <span>${admin.name}</span>
                </div>
              </td>
              <td>${admin.email}</td>
              <td>
                <button onclick="deleteAdmin(${admin.id}, '${admin.email}')" class="btn-glass" style="padding: 5px 10px; font-size: 0.8rem; border-color: #ff4d4d; color: #ff4d4d;"><i class="fas fa-trash"></i></button>
              </td>
            `;
            adminsTbody.appendChild(tr);
          });
        }
      }
    });
  };

  window.renderAdminUsersList();

  window.saveAdmin = function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    if(btn) { btn.disabled = true; btn.textContent = "Saving..."; }
    
    const payload = {
      name: document.getElementById('admin-name').value,
      email: document.getElementById('admin-email').value.trim(),
      password: document.getElementById('admin-pass').value
    };

    fetch('api/admin_register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if(btn) { btn.disabled = false; btn.textContent = "Create Admin"; }
        if(data.success) {
            document.getElementById('admin-form').reset();
            window.renderAdminUsersList();
            alert("Admin added successfully to the database!");
        } else {
            alert(data.message);
        }
    })
    .catch(err => {
        if(btn) { btn.disabled = false; btn.textContent = "Create Admin"; }
        alert("Failed to create admin");
    });
  };

  window.deleteAdmin = function(id, email) {
    const session = JSON.parse(localStorage.getItem('chillSession') || sessionStorage.getItem('chillSession'));
    if(session && session.email === email) {
      alert("You cannot delete your own admin account while logged in!");
      return;
    }
    if (confirm('Are you sure you want to delete this admin?')) {
      fetch('api/delete_admin.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
      }).then(() => window.renderAdminUsersList());
    }
  };


/* 10. CHARTING & ANALYTICS (Chart.js) 
   ========================================================================== */
  const canvas = document.getElementById('activityChart');
  if (canvas && typeof Chart !== 'undefined') {
    const ctx = canvas.getContext('2d');
    
    // Custom Gradients
    const gradientBlue = ctx.createLinearGradient(0, 0, 0, 400);
    gradientBlue.addColorStop(0, 'rgba(0, 243, 255, 0.5)');
    gradientBlue.addColorStop(1, 'rgba(0, 243, 255, 0.0)');

    const gradientPurple = ctx.createLinearGradient(0, 0, 0, 400);
    gradientPurple.addColorStop(0, 'rgba(188, 19, 254, 0.5)');
    gradientPurple.addColorStop(1, 'rgba(188, 19, 254, 0.0)');

    Chart.defaults.color = '#8e8e9e';
    Chart.defaults.font.family = "'Poppins', sans-serif";

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
          {
            label: 'Revenue',
            data: [1200, 1900, 1500, 2200, 1800, 2800, 2400, 3200, 2900, 3800, 3100, 4200],
            borderColor: '#00f3ff',
            backgroundColor: gradientBlue,
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#07070b',
            pointBorderColor: '#00f3ff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#00f3ff'
          },
          {
            label: 'Users',
            data: [800, 1200, 1100, 1600, 1300, 2100, 1800, 2600, 2200, 3100, 2500, 3500],
            borderColor: '#bc13fe',
            backgroundColor: gradientPurple,
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#07070b',
            pointBorderColor: '#bc13fe',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#bc13fe'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              boxWidth: 12,
              usePointStyle: true,
            }
          },
          tooltip: {
            backgroundColor: 'rgba(10, 10, 15, 0.9)',
            titleColor: '#fff',
            bodyColor: '#ccc',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 15,
            boxPadding: 5,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  if (context.dataset.label === 'Revenue') {
                    label += 'Rs. ' + new Intl.NumberFormat('en-US').format(context.parsed.y);
                  } else {
                    label += new Intl.NumberFormat('en-US').format(context.parsed.y);
                  }
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false,
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false,
            },
            ticks: {
              color: '#8b8b93',
              callback: function(value) {
                if (value >= 1000) return 'Rs. ' + value / 1000 + 'k';
                return 'Rs. ' + value;
              }
            }
          }
        }
      }
    });
  }

  // ---------- Analytics Dashboard Charts ----------
  const analyticsTrafficCtx = document.getElementById('analyticsTrafficChart');
  if (analyticsTrafficCtx && typeof Chart !== 'undefined') {
    new Chart(analyticsTrafficCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: ['1AM', '4AM', '8AM', '12PM', '4PM', '8PM', '12AM'],
        datasets: [{
          label: 'Page Views',
          data: [120, 90, 450, 900, 1100, 1500, 800],
          borderColor: '#00f3ff',
          backgroundColor: 'rgba(0, 243, 255, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10, 10, 15, 0.9)', titleColor: '#fff', bodyColor: '#ccc', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1
          }
        }
      }
    });
  }

  const deviceCtx = document.getElementById('analyticsDeviceChart');
  if (deviceCtx && typeof Chart !== 'undefined') {
    new Chart(deviceCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Mobile', 'Desktop', 'Tablet'],
        datasets: [{
          data: [65, 25, 10],
          backgroundColor: ['#bc13fe', '#00f3ff', '#ff007f'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8b8b93', padding: 20 } },
          tooltip: {
            backgroundColor: 'rgba(10, 10, 15, 0.9)', titleColor: '#fff', bodyColor: '#ccc', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1
          }
        },
        cutout: '75%'
      }
    });
  }

  // ---------- Sales Dashboard ----------
  if(orders && orders.length > 0) {
     const completedForSales = orders.filter(o => o.status === 'Completed');
     const totalRevSales = completedForSales.reduce((sum, o) => sum + parseFloat(o.total), 0);
     const totalItems = completedForSales.reduce((sum, o) => sum + parseInt(o.qty || 1), 0);
     const avgOrder = completedForSales.length ? totalRevSales / completedForSales.length : 0;
     
     const revEl = document.getElementById('sales-monthly-rev');
     if(revEl) revEl.textContent = 'Rs. ' + totalRevSales.toLocaleString();
     const avgEl = document.getElementById('sales-avg-order');
     if(avgEl) avgEl.textContent = 'Rs. ' + Math.round(avgOrder).toLocaleString();
     const itemsEl = document.getElementById('sales-items-sold');
     if(itemsEl) itemsEl.textContent = totalItems.toLocaleString();
  }

  const salesBarCtx = document.getElementById('salesBarChart');
  if (salesBarCtx && typeof Chart !== 'undefined') {
    new Chart(salesBarCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Revenue',
          data: [12000, 19000, 15000, 22000, 18000, 31000],
          backgroundColor: '#00f3ff',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { callback: function(value) { return 'Rs. ' + (value >= 1000 ? (value / 1000) + 'k' : value); }} }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10, 10, 15, 0.9)', titleColor: '#fff', bodyColor: '#ccc', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
            callbacks: {
              label: function(context) { return 'Rs. ' + context.parsed.y.toLocaleString(); }
            }
          }
        }
      }
    });
  }


/* 11. MESSAGE MANAGEMENT 
   ========================================================================== */
  window.renderAdminMessagesList = function() {
    fetch('api/get_messages.php').then(r=>r.json()).then(messages => {
      const messagesTbody = document.getElementById('messages-table-body');
      if (messagesTbody) {
        messagesTbody.innerHTML = '';
        if (!messages || messages.length === 0) {
          messagesTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No messages found.</td></tr>';
        } else {
          messages.forEach(msg => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td style="font-size: 0.85rem; color: var(--text-muted);">${(msg.created_at || '').split(' ')[0]}</td>
              <td style="font-weight: 500;">${msg.name}</td>
              <td>${msg.email}</td>
              <td style="max-width: 250px; white-space: normal; line-height: 1.4; font-size: 0.9rem;">${msg.message}</td>
              <td>
                <button onclick="deleteMessage(${msg.id})" class="btn-glass" style="padding: 5px 10px; font-size: 0.8rem; border-color: #ff4d4d; color: #ff4d4d;" title="Delete Message"><i class="fas fa-trash"></i></button>
              </td>
            `;
            messagesTbody.appendChild(tr);
          });
        }
      }
    }).catch(e => console.error("Error fetching messages:", e));
  };
  
  // Also hook into sidebar navigation click dynamically just to be safe
  const messagesNav = document.querySelector('.nav-item[data-target="messages"]');
  if(messagesNav) {
      messagesNav.addEventListener('click', () => {
          window.renderAdminMessagesList();
      });
  }

  window.deleteMessage = function(id) {
    if (confirm('Are you sure you want to delete this message?')) {
      fetch('api/delete_message.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
      }).then(res => res.json()).then(data => {
          if(data.success) {
              window.renderAdminMessagesList();
          } else {
              alert("Failed to delete message: " + data.message);
          }
      });
    }
  };



  console.log("CT_DEBUG: DOMContentLoaded block finished.");
});
