/**
 * script.js - Core Frontend Logic
 * ==========================================================================
 * This file handles global UI interactions, authentication, menu rendering,
 * order processing, and live chat functionality.
 */

/* 1. INITIALIZATION & CORE UI 
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const loader = document.querySelector(".loader");
    if(loader) setTimeout(() => loader.classList.add("hidden"), 800);

    const hamburger = document.querySelector(".hamburger");
    const navLinks = document.querySelector(".nav-links");
    if(hamburger) {
        hamburger.addEventListener("click", () => {
            navLinks.classList.toggle("active");
            hamburger.querySelector("i").classList.toggle("fa-times");
            hamburger.querySelector("i").classList.toggle("fa-bars");
        });
    }

    const themeBtn = document.getElementById("theme-toggle");
    const savedTheme = localStorage.getItem("chillTheme") || "dark";
    
    // Initial theme application
    if (savedTheme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
    } else {
        document.documentElement.removeAttribute("data-theme");
    }

    const updateThemeIcon = (theme) => {
        if(!themeBtn) return;
        themeBtn.innerHTML = theme === "light" ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    };
    updateThemeIcon(savedTheme);

    if(themeBtn) {
        themeBtn.addEventListener("click", () => {
            const isLight = document.documentElement.getAttribute("data-theme") === "light";
            const newTheme = isLight ? "dark" : "light";
            
            if (newTheme === "light") {
                document.documentElement.setAttribute("data-theme", "light");
            } else {
                document.documentElement.removeAttribute("data-theme");
            }
            
            localStorage.setItem("chillTheme", newTheme);
            updateThemeIcon(newTheme);
        });
    }

    // Initialize Global State
    window.checkAuthSession();
    initMenu();

    if(document.getElementById("menu-grid")) {
        renderMenu();
        setupMenuFilters();
    }
    
    if(document.getElementById("admin-orders-list")) {
        renderOrders();
        window.renderAdminItems();
    }

    // Modal Global Event Listeners
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeOrderModal();
    });


/* 2. LIVE CHAT MODULE 
   ========================================================================== */
/**
 * Self-invoking function to initialize the live chat widget.
 * Handles session persistence, UI creation, and API polling.
 */
    (function() {
        let chatSessionId = localStorage.getItem('chillChatSession');
        if(!chatSessionId) {
            chatSessionId = 'ch_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chillChatSession', chatSessionId);
        }
        
        let chatOpen = false;
        let chatInterval = null;
        
        const chatWidget = document.createElement('div');
        chatWidget.className = 'chat-widget-container';
        chatWidget.innerHTML = `
            <div class="chat-widget-window" id="chat-widget-window">
                <div class="chat-header">
                    <h3><i class="fas fa-headset"></i> Live Chat</h3>
                    <button id="close-chat-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="chat-messages" id="chat-messages-container"></div>
                <div class="chat-input-area">
                    <input type="text" id="chat-msg-input" placeholder="Type a message...">
                    <button id="send-chat-btn"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
            <button class="chat-toggle-btn" id="chat-toggle-btn">
                <i class="fas fa-comment-dots"></i>
            </button>
        `;
        document.body.appendChild(chatWidget);

        const toggleBtn = document.getElementById('chat-toggle-btn');
        const closeBtn = document.getElementById('close-chat-btn');
        const windowEl = document.getElementById('chat-widget-window');
        const msgContainer = document.getElementById('chat-messages-container');
        const sendBtn = document.getElementById('send-chat-btn');
        const inputEl = document.getElementById('chat-msg-input');

        const toggleChat = () => {
            chatOpen = !chatOpen;
            windowEl.style.display = chatOpen ? 'flex' : 'none';
            
            if(chatOpen) {
                fetchMessages();
                chatInterval = setInterval(fetchMessages, 3000);
                setTimeout(() => { msgContainer.scrollTop = msgContainer.scrollHeight; }, 100);
            } else {
                clearInterval(chatInterval);
            }
        };

        const fetchMessages = () => {
            fetch('api/chat_get.php?session_id=' + chatSessionId)
            .then(r=>r.json()).then(msgs => {
                if(!Array.isArray(msgs)) return;
                msgContainer.innerHTML = msgs.map(m => `
                    <div class="chat-bubble ${m.sender_type === 'customer' ? 'msg-self' : 'msg-admin'}">
                        ${m.message}
                        <div class="msg-time">${m.created_at.split(' ')[1]}</div>
                    </div>
                `).join('');
            });
        };

        const sendMessage = () => {
            const text = inputEl.value.trim();
            if(!text) return;
            inputEl.value = '';
            
            let userJson = localStorage.getItem("chillSession") || sessionStorage.getItem("chillSession");
            let user = userJson ? JSON.parse(userJson) : null;
            let cname = user ? user.name : 'Guest';

            fetch('api/chat_send.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    session_id: chatSessionId,
                    sender_type: 'customer',
                    message: text,
                    customer_name: cname
                })
            }).then(() => {
                fetchMessages();
                setTimeout(() => { msgContainer.scrollTop = msgContainer.scrollHeight; }, 300);
            });
        };

        if(toggleBtn) toggleBtn.addEventListener('click', toggleChat);
        if(closeBtn) closeBtn.addEventListener('click', toggleChat);
        if(sendBtn) sendBtn.addEventListener('click', sendMessage);
        if(inputEl) inputEl.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') sendMessage();
        });
    })();

});


/* 3. AUTHENTICATION & SESSION MANAGEMENT 
   ========================================================================== */
/**
 * Checks for an active user session and updates the UI/Protection accordingly.
 */
window.checkAuthSession = function() {
    const userJson = localStorage.getItem("chillSession") || sessionStorage.getItem("chillSession");
    const user = userJson ? JSON.parse(userJson) : null;
    
    // Page Protection
    const currentPath = window.location.pathname;
    const isLogin = currentPath.includes("login.html") || currentPath.includes("signup.html");
    const isAdmin = currentPath.includes("admin.html");
    
    if (isAdmin && (!user || user.role !== "admin")) {
        window.location.href = "login.html";
        return;
    }
    
    if (isLogin && user) {
        window.location.href = "index.html";
        return;
    }
    
    // Navbar Update
    const authNav = document.getElementById("auth-nav");
    if(authNav) {
        if(user) {
            authNav.innerHTML = `
                <span class="animate-text" style="color:var(--text-main); font-weight:600; margin-right:15px; font-size: 0.95rem;">Hello, <span style="color:var(--primary)">${user.name.split(" ")[0]}</span></span>
                <button onclick="window.logoutUser()" class="btn btn-outline" style="padding: 5px 15px; border-color: rgba(255, 68, 68, 0.4); color: #ff4444; font-size: 0.85rem;"><i class="fas fa-sign-out-alt"></i></button>
            `;
            const adminLink = document.getElementById("nav-admin-link");
            if(adminLink) adminLink.style.display = user.role === "admin" ? "inline-block" : "none";
        } else {
            authNav.innerHTML = `<a href="login.html" class="btn btn-primary" style="padding: 7px 22px; font-size: 0.9rem; border-radius: 20px;">Login <i class="fas fa-user" style="margin-left: 4px;"></i></a>`;
            const adminLink = document.getElementById("nav-admin-link");
            if(adminLink) adminLink.style.display = "none";
        }
    }
}

window.togglePassword = function(id) {
    const input = document.getElementById(id);
    const icon = input.nextElementSibling.nextElementSibling;
    if(input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
        icon.style.color = "var(--primary)";
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
        icon.style.color = "";
    }
}

/**
 * Handles new user registration via the signup form.
 * @param {Event} e - Form submission event
 */
window.registerUser = function(e) {
    e.preventDefault();
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const pass = document.getElementById("reg-pass").value;
    const confirmPass = document.getElementById("reg-confirm-pass").value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email)) return window.showToast("Invalid email format!", "error");
    if(pass !== confirmPass) return window.showToast("Passwords do not match!", "error");

    const payload = { name, email, phone, password: pass };
    const btn = document.querySelector("#signup-form button[type='submit']");
    btn.innerHTML = 'Creating Account <i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    fetch('api/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(res => {
        btn.disabled = false;
        btn.innerHTML = 'Create Account <i class="fas fa-user-plus" style="margin-left: 8px;"></i>';
        if(res.status === 201) {
            window.showToast("Account created successfully. Please login!", "success");
            document.getElementById("signup-form").reset();
            setTimeout(() => window.location.href = "login.html", 2000);
        } else {
            window.showToast(res.body.message || "Registration failed.", "error");
        }
    })
    .catch(err => {
        btn.disabled = false;
        btn.innerHTML = 'Create Account <i class="fas fa-user-plus" style="margin-left: 8px;"></i>';
        console.error(err);
        window.showToast("Network error. Try again.", "error");
    });
}

/**
 * Handles user login via the login form.
 * @param {Event} e - Form submission event
 */
window.loginUser = function(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const pass = document.getElementById("login-password").value;
    const remember = document.getElementById("remember-me").checked;

    const btn = document.querySelector("#login-form button[type='submit']");
    btn.innerHTML = 'Signing In <i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    fetch('api/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
    })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(res => {
        btn.disabled = false;
        btn.innerHTML = 'Sign In <i class="fas fa-sign-in-alt" style="margin-left: 8px;"></i>';
        
        if(res.status === 200 && res.body.success) {
            const user = { 
                id: res.body.user.id, 
                name: res.body.user.name, 
                email: res.body.user.email, 
                role: res.body.role 
            };
            remember ? localStorage.setItem("chillSession", JSON.stringify(user)) : sessionStorage.setItem("chillSession", JSON.stringify(user));
            
            window.showToast(`Welcome back, ${user.name.split(" ")[0]}!`, "success");
            setTimeout(() => {
                window.location.href = user.role === 'admin' ? "admin.html" : "index.html";
            }, 1000);
        } else {
            window.showToast(res.body.message || "Invalid credentials", "error");
        }
    })
    .catch(err => {
        btn.disabled = false;
        btn.innerHTML = 'Sign In <i class="fas fa-sign-in-alt" style="margin-left: 8px;"></i>';
        console.error(err);
        window.showToast("Network error. Try again.", "error");
    });
}

window.logoutUser = function() {
    localStorage.removeItem("chillSession");
    sessionStorage.removeItem("chillSession");
    window.location.href = "login.html";
}

/**
 * Handles the "Forgot Password" request by prompting for email
 * and calling the backend forgot_password endpoint.
 */
window.handleForgotPassword = function() {
    const email = prompt("Please enter your registered email address:");
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        window.showToast("Invalid email format!", "error");
        return;
    }

    window.showToast("Checking your account...", "info");

    fetch('api/forgot_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            window.showToast(data.message, "success");
        } else {
            window.showToast(data.message || "Failed to process request.", "error");
        }
    })
    .catch(err => {
        console.error(err);
        window.showToast("Network error. Try again.", "error");
    });
}

/**
 * Handles the final password reset submission.
 * @param {Event} e - Form submission event
 */
window.resetPassword = function(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    const pass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-new-password').value;

    if (pass !== confirmPass) {
        window.showToast("Passwords do not match!", "error");
        return;
    }

    const btn = document.querySelector("#reset-password-form button");
    btn.innerHTML = 'Updating Password <i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    fetch('api/reset_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
    })
    .then(res => res.json())
    .then(data => {
        btn.disabled = false;
        btn.innerHTML = 'Reset Password <i class="fas fa-key" style="margin-left: 8px;"></i>';
        if (data.success) {
            window.showToast(data.message, "success");
            setTimeout(() => window.location.href = "login.html", 2500);
        } else {
            window.showToast(data.message || "Reset failed.", "error");
        }
    })
    .catch(err => {
        btn.disabled = false;
        btn.innerHTML = 'Reset Password <i class="fas fa-key" style="margin-left: 8px;"></i>';
        console.error(err);
        window.showToast("Network error. Try again.", "error");
    });
}



/* 4. UI UTILITIES & NOTIFICATIONS 
   ========================================================================== */
/**
 * Displays a non-intrusive toast notification.
 * @param {string} message - The message to display
 * @param {string} type - Notification type: 'success', 'info', or 'error'
 */
window.showToast = function(message, type = "success") {
    let container = document.getElementById("toast-container");
    if(!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    let icon = "fa-info-circle";
    if(type === 'success') icon = "fa-check-circle";
    if(type === 'error') icon = "fa-times-circle";

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}


/* 5. MENU LOGIC & DATA FETCHING 
   ========================================================================== */
const defaultMenuItems = [
    { id: 1, name: "Neon Ribeye", price: 3500, category: "Main Course", image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=400&fit=crop", desc: "Premium grass-fed steak with neon glaze." },
    { id: 2, name: "Cyber Slice", price: 1850, category: "Main Course", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=400&fit=crop", desc: "Authentic wood-fired pizza with cyber-city toppings." },
    { id: 3, name: "Glitch Burger", price: 1500, category: "Main Course", image: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?q=80&w=400&fit=crop", desc: "Double smash patty with melting cheese." },
    { id: 4, name: "Quantum Mojito", price: 1200, category: "Drinks", image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=400&fit=crop", desc: "Refreshing mint and lime." },
    { id: 5, name: "Hologram Cake", price: 1400, category: "Desserts", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=400&fit=crop", desc: "Rich chocolate layers." },
    { id: 6, name: "Plasma Wings", price: 1000, category: "Starters", image: "https://images.unsplash.com/photo-1524114664604-cd8133cd67ad?q=80&w=400&fit=crop", desc: "Spicy buffalo wings." }
];

function initMenu() {
    if(!localStorage.getItem("chillMenuItems")) localStorage.setItem("chillMenuItems", JSON.stringify(defaultMenuItems));
    if(!localStorage.getItem("chillAdmins")) {
        localStorage.setItem("chillAdmins", JSON.stringify([{ id: 1, name: "Admin Manager", email: "admin@chillthrill.com", password: btoa("123456") }]));
    }
}
window.getMenuItems = async () => {
    const res = await fetch('api/get_products.php');
    return await res.json();
};

/**
 * Renders the menu grid based on category filters and search queries.
 * @param {string} filter - Category filter (e.g., 'All', 'Main Course')
 */
window.renderMenu = async function(filter = "All") {
    const grid = document.getElementById("menu-grid");
    if(!grid) return;
    
    const items = await getMenuItems();
    const searchEl = document.getElementById("menu-search");
    const searchQuery = searchEl ? searchEl.value.toLowerCase() : "";

    const filtered = items.filter(item => {
        const descMatch = item.description ? item.description.toLowerCase().includes(searchQuery) : false;
        return (filter === "All" || item.category === filter) && (item.name.toLowerCase().includes(searchQuery) || descMatch);
    });

    if(filtered.length === 0) {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 50px 0;'>No items found.</p>";
        return;
    }

    grid.innerHTML = filtered.map(item => `
        <div class="fav-card animate-text">
          <div class="fav-img-wrap"><img src="${item.image}" class="fav-img" alt="${item.name}" loading="lazy"></div>
          <h3 class="fav-title">${item.name}</h3>
          <p class="fav-desc">${item.description || ''}</p>
          <p class="fav-price">Rs. ${parseFloat(item.price).toFixed(2)}</p>
          <button class="btn btn-outline" style="width: 100%" onclick="openOrderModal(${item.id})">Order Now</button>
        </div>`).join("");
}

window.setupMenuFilters = function() {
    const buttons = document.querySelectorAll(".filter-btn");
    buttons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            buttons.forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            window.renderMenu(e.target.textContent);
        });
    });
    const searchInput = document.getElementById("menu-search");
    if(searchInput) searchInput.addEventListener("input", () => window.renderMenu(document.querySelector(".filter-btn.active")?.textContent || "All"));
}


/* 6. ORDERING SYSTEM (Modal & Submission) 
   ========================================================================== */
/**
 * Opens the order confirmation modal and populates item details.
 * @param {number} id - Product ID to order
 */
window.openOrderModal = async function(id) {
    
    // Auto populate Customer details if logged in
    const userJson = localStorage.getItem("chillSession") || sessionStorage.getItem("chillSession");
    const user = userJson ? JSON.parse(userJson) : null;
    let autoName = user ? user.name : "";

    const items = await window.getMenuItems();
    const item = items.find(i => parseInt(i.id) === parseInt(id));
    if(!item) return;

    window.showToast("Item selected! Please verify your order.", "info");

    setTimeout(() => {
        let modal = document.getElementById("order-modal");
        if(!modal) {
            modal = document.createElement("div");
            modal.id = "order-modal";
            modal.className = "modal-overlay";
            modal.innerHTML = `
                <div class="modal-content glowing-modal" onclick="event.stopPropagation()">
                    <button class="modal-close" onclick="window.closeOrderModal()"><i class="fas fa-times"></i></button>
                    
                    <div class="modal-header">
                        <h2 class="modal-title">Complete <span>Order</span></h2>
                        <p class="modal-subtitle">Secure & Swift Verification</p>
                    </div>
                    
                    <form id="order-form" onsubmit="window.submitOrder(event)">
                        <input type="hidden" id="order-item-id">
                        <input type="hidden" id="order-item-price">
                        <input type="hidden" id="order-product-name">
                        
                        <div class="modal-product animate-text">
                            <img id="order-item-img" src="" class="modal-product-img" alt="Product Image">
                            <div class="modal-product-info">
                                <div class="modal-product-name" id="order-item-name-display">Product Name</div>
                                <div class="modal-product-price" id="order-item-price-display">Rs. 0.00</div>
                            </div>
                            <div class="qty-control">
                                <button type="button" class="qty-btn" onclick="window.adjustQty(-1)"><i class="fas fa-minus"></i></button>
                                <input type="number" id="order-qty" class="qty-input" value="1" min="1" readonly>
                                <button type="button" class="qty-btn" onclick="window.adjustQty(1)"><i class="fas fa-plus"></i></button>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="input-container animate-text-delay">
                                <input type="text" id="order-customer" class="adv-input" required placeholder="Full Name" oninput="window.validateForm()">
                                <i class="fas fa-user input-icon"></i>
                            </div>
                            <div class="input-container animate-text-delay">
                                <input type="tel" id="order-phone" class="adv-input" required placeholder="Phone Number" oninput="window.validateForm()">
                                <i class="fas fa-phone input-icon"></i>
                            </div>
                        </div>
                        
                        <div class="input-container animate-text-delay-2">
                            <textarea id="order-address" class="adv-input adv-textarea" required placeholder="Delivery Location" oninput="window.validateForm()"></textarea>
                            <i class="fas fa-map-marker-alt input-icon text-area-icon"></i>
                        </div>
                        
                        <div class="form-row">
                            <div class="input-container animate-text-delay-2">
                                <input type="time" id="order-time" class="adv-input" required oninput="window.validateForm()">
                                <i class="fas fa-clock input-icon"></i>
                            </div>
                            <div class="input-container animate-text-delay-2">
                                <input type="text" id="order-notes" class="adv-input" placeholder="Any special requests?">
                                <i class="fas fa-sticky-note input-icon"></i>
                            </div>
                        </div>
                        
                        <div class="payment-section animate-text-delay-2" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0,0,0,0.1);">
                            <h4 style="margin-bottom: 10px; font-size: 0.95rem; color: var(--text-muted);"><i class="fas fa-credit-card"></i> Payment Details</h4>
                            <div class="input-container">
                                <input type="text" id="pay-card" class="adv-input" placeholder="Card Number (Mock)" maxlength="16" required oninput="window.validateForm()">
                                <i class="far fa-credit-card input-icon"></i>
                            </div>
                            <div class="form-row" style="margin-bottom: 5px;">
                                <div class="input-container">
                                    <input type="text" id="pay-exp" class="adv-input" placeholder="MM/YY" maxlength="5" required oninput="window.validateForm()">
                                    <i class="far fa-calendar-alt input-icon"></i>
                                </div>
                                <div class="input-container">
                                    <input type="password" id="pay-cvv" class="adv-input" placeholder="CVV" maxlength="3" required oninput="window.validateForm()">
                                    <i class="fas fa-lock input-icon"></i>
                                </div>
                            </div>
                        </div>

                        <div class="modal-total animate-text-delay">
                            <span>Total Payable</span>
                            <span class="total-amount">Rs. <span id="order-total-display">0.00</span></span>
                        </div>
                        <button type="submit" id="btn-submit-order" class="btn-place-order" disabled>
                            Pay & Place Order <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>
                        </button>
                    </form>
                </div>
            `;
            modal.addEventListener("click", window.closeOrderModal);
            document.body.appendChild(modal);
        }
        
        document.getElementById("order-form").reset();
        document.getElementById("order-item-id").value = item.id;
        document.getElementById("order-item-price").value = item.price;
        document.getElementById("order-qty").value = 1;
        
        document.getElementById("order-product-name").value = item.name;
        document.getElementById("order-item-img").src = item.image;
        document.getElementById("order-item-name-display").textContent = item.name;
        document.getElementById("order-item-price-display").textContent = `Rs. ${parseFloat(item.price).toFixed(2)}`;
        
        // Auto fill if session exists
        if(autoName) document.getElementById("order-customer").value = autoName;

        document.querySelectorAll("#order-form .adv-input").forEach(f => f.classList.remove("error-field"));
        document.getElementById("btn-submit-order").disabled = true;

        window.updateOrderTotal();
        window.validateForm();
        modal.classList.add("active");
        document.body.classList.add("no-scroll");
    }, 200);
}

window.adjustQty = function(change) {
    const input = document.getElementById("order-qty");
    let newVal = parseInt(input.value) + change;
    if(newVal >= 1) {
        input.value = newVal;
        updateOrderTotal();
    }
}

window.closeOrderModal = function() {
    const modal = document.getElementById("order-modal");
    if(modal) {
        modal.classList.remove("active");
        document.body.classList.remove("no-scroll");
    }
}

window.updateOrderTotal = function() {
    const price = parseFloat(document.getElementById("order-item-price").value) || 0;
    const qty = parseInt(document.getElementById("order-qty").value) || 1;
    const disp = document.getElementById("order-total-display");
    if(disp) disp.textContent = (price * qty).toFixed(2);
}

window.validateForm = function() {
    const fields = ["order-customer", "order-phone", "order-address", "order-time", "pay-card", "pay-exp", "pay-cvv"];
    let isValid = true;
    
    // Ignore validation if modal isn't open
    if(!document.getElementById("order-customer")) return;

    fields.forEach(id => {
        const field = document.getElementById(id);
        if(!field.value.trim()) {
            field.classList.add("error-field");
            isValid = false;
        } else {
            field.classList.remove("error-field");
        }
    });

    document.getElementById("btn-submit-order").disabled = !isValid;
    return isValid;
}

/**
 * Validates and submits an order to the backend.
 * @param {Event} event - Form submission event
 */
window.submitOrder = function(event) {
    event.preventDefault();
    if(!validateForm()) return;
    
    const productName = document.getElementById("order-product-name").value;
    const price = parseFloat(document.getElementById("order-item-price").value);
    const qty = parseInt(document.getElementById("order-qty").value);
    const customer = document.getElementById("order-customer").value;
    const phone = document.getElementById("order-phone").value;
    const address = document.getElementById("order-address").value;
    const time = document.getElementById("order-time").value;
    const notes = document.getElementById("order-notes").value;
    
    const total = price * qty;
    const orderId = "CT" + Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const dateStr = now.toLocaleDateString() + " " + now.toLocaleTimeString();
    
    const order = { orderId, customer, phone, address, productName, qty, total, date: dateStr, status: "Pending", notes, time };
    
    const btn = document.getElementById("btn-submit-order");
    btn.innerHTML = 'Processing Payment... <i class="fas fa-spinner fa-spin" style="margin-left: 8px;"></i>';
    btn.disabled = true;

    // Simulate Payment Gateway Delay
    setTimeout(() => {
        fetch('api/place_order.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        })
        .then(response => response.json())
        .then(data => {
            closeOrderModal();
            window.showToast("Payment Successful! Order placed.", "success");
            if(document.getElementById("admin-orders-list")) window.renderOrders();
        })
        .catch(error => {
            console.error('Error:', error);
            btn.innerHTML = 'Pay & Place Order <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>';
            btn.disabled = false;
            window.showToast("Failed to connect to server.", "error");
        });
    }, 1500); // 1.5s delay to mock payment gateway
}


/* 7. ADMIN MANAGEMENT LOGIC 
   ========================================================================== */
window.renderAdminItems = function() {
    const list = document.getElementById("admin-menu-list");
    if(!list) return;
    list.innerHTML = window.getMenuItems().map(item => `
        <div class="admin-item animate-text">
            <img src="${item.image}" alt="${item.name}" loading="lazy">
            <div class="admin-item-details">
                <h4>${item.name}</h4>
                <p>${item.category} • Rs. ${parseFloat(item.price).toFixed(2)}</p>
            </div>
            <button class="btn btn-outline" style="padding: 5px 15px; border-color: #ff4444; color: #ff4444;" onclick="deleteMenuItem(${item.id})">Delete</button>
        </div>`).join("");
}

window.addMenuItem = function(event) {
    event.preventDefault();
    let items = window.getMenuItems();
    items.push({
        id: items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1,
        name: document.getElementById("item-name").value,
        price: document.getElementById("item-price").value,
        category: document.getElementById("item-category").value,
        image: document.getElementById("item-image").value || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&fit=crop",
        desc: document.getElementById("item-desc").value
    });
    localStorage.setItem("chillMenuItems", JSON.stringify(items));
    document.getElementById("add-item-form").reset();
    window.renderAdminItems();
    window.showToast("Item added successfully!", "success");
}

window.deleteMenuItem = function(id) {
    if(!confirm("Delete this item?")) return;
    localStorage.setItem("chillMenuItems", JSON.stringify(window.getMenuItems().filter(i => i.id !== id)));
    window.renderAdminItems();
}

window.renderOrders = function() {
    const list = document.getElementById("admin-orders-list");
    if(!list) return;
    
    fetch('api/get_orders.php')
    .then(res => res.json())
    .then(orders => {
        if(orders.length === 0) {
            list.innerHTML = "<p style='text-align:center; padding: 20px; color: var(--text-muted);'>No orders placed yet.</p>";
            return;
        }
        
        list.innerHTML = `
        <div class="admin-table-wrapper">
          <table class="admin-table animate-text">
            <thead><tr><th>Order ID</th><th>Date & Time</th><th>Customer</th><th>Phone</th><th>Address / Time</th><th>Product</th><th>Qty</th><th>Total (Rs.)</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
        ` + orders.map(order => `
              <tr>
                <td style="font-weight: bold; color: var(--primary);">${order.orderId}</td>
                <td style="font-size: 0.85rem; color: var(--text-muted);">${order.date}</td>
                <td>${order.customer}</td>
                <td>${order.phone}</td>
                <td style="font-size: 0.85rem;">${order.address}<br><span style="color: var(--secondary)">Drop: ${order.time}</span></td>
                <td>${order.productName}</td>
                <td style="text-align: center;">${order.qty}</td>
                <td style="font-weight: bold;">${parseFloat(order.total).toFixed(2)}</td>
                <td><span class="status-badge ${order.status === 'Completed' ? 'status-completed' : 'status-pending'}">${order.status}</span></td>
                <td>
                    ${order.status !== 'Completed' ? `<button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.8rem; margin-bottom: 5px;" onclick="window.markOrderCompleted('${order.orderId}')">Complete</button>` : ''}
                    <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.8rem; border-color: #ff4444; color: #ff4444;" onclick="window.deleteOrder('${order.orderId}')">Delete</button>
                </td>
              </tr>`).join("") + `</tbody></table></div>`;
    })
    .catch(err => console.error(err));
}

window.markOrderCompleted = function(orderId) {
    if(!confirm("Mark this order as completed?")) return;
    fetch('api/update_order.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'Completed' })
    }).then(() => window.renderOrders());
}

window.deleteOrder = function(orderId) {
    if(!confirm("Delete this order?")) return;
    fetch('api/delete_order.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
    }).then(() => window.renderOrders());
}


/* 8. CONTACT FORM HANDLING 
   ========================================================================== */
/**
 * Submits contact inquiries to the server.
 * @param {Event} e - Form submission event
 */
window.submitContactForm = function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if(btn) { btn.disabled = true; btn.innerHTML = 'Sending... <i class="fas fa-spinner fa-spin"></i>'; }
    
    const payload = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        message: document.getElementById('message').value
    };

    fetch('api/submit_contact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if(btn) { btn.disabled = false; btn.innerHTML = 'Send Message'; }
        if(data.success) {
            window.showToast("Message Sent! We will get back to you soon.", "success");
            e.target.reset();
        } else {
            window.showToast(data.message || "Failed to send message.", "error");
        }
    })
    .catch(err => {
        if(btn) { btn.disabled = false; btn.innerHTML = 'Send Message'; }
        window.showToast("Network error. Try again.", "error");
    });
}


