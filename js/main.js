/* ==========================================================
   main.js — Strict Cross-Browser Safe Logic
   ========================================================== */

(function () {
    'use strict';

    document.documentElement.classList.add('js');

    const $ = (selector, context = document) => context.querySelector(selector);     const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

    // Safe Storage Fallback (Handles Firefox / Zen strict privacy mode & safari private windows)
    const memoryStore = {};
    const safeStorage = {
        get: (key) => {
            try { return localStorage.getItem(key); }
            catch (e) { return memoryStore[key] || null; }
        },
        set: (key, val) => {
            try { localStorage.setItem(key, val); }
            catch (e) { memoryStore[key] = val; }
        }
    };

    /* ---------- 1. HEADER SCROLL ---------- */
    const header = $('#header');
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                if (header) header.classList.toggle('is-scrolled', window.scrollY > 4);
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    /* ---------- 2. MOBILE MENU ---------- */
    const menuBtn = $('#menuBtn');
    const nav = $('#nav');

    if (menuBtn && nav) {
        const setMenu = (open) => {
            nav.classList.toggle('is-open', open);
            menuBtn.setAttribute('aria-expanded', String(open));
            menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        };

        menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
        nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    }

    /* ---------- 3. DARK MODE CONTROLLER ---------- */
    const themeToggle = $('#themeToggle');     const prefersDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false };      const applyTheme = (theme) => {         document.documentElement.setAttribute('data-theme', theme);         if (themeToggle) {             themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');         }     };      const initialTheme = safeStorage.get('theme') \vert{}\vert{} (prefersDark.matches ? 'dark' : 'light');     applyTheme(initialTheme);      document.addEventListener('click', (e) => {         if (e.target.closest('#themeToggle')) {             const current = document.documentElement.getAttribute('data-theme') \vert{}\vert{} 'light';             const next = current === 'dark' ? 'light' : 'dark';             applyTheme(next);             safeStorage.set('theme', next);         }     });      /* ---------- 4. SCROLL REVEAL (WITH OBSERVER FALLBACK) ---------- */     const revealItems = $$('.reveal');
    if (revealItems.length > 0 && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.15 });

        revealItems.forEach((el, index) => {
            el.style.transitionDelay = `${(index % 3) * 70}ms`;
            revealObserver.observe(el);
        });
    } else {
        revealItems.forEach(el => el.classList.add('is-visible'));
    }

    /* ---------- 5. TOAST & FORM VALIDATION ---------- */
    const toast = $('#toast');
    let toastTimer = null;

    const showToast = (message) => {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('is-show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('is-show'), 3500);
    };

    const form = $('#form');     if (form) {         form.addEventListener('submit', (e) => {             e.preventDefault();             const fields = $$('input, textarea', form);
            let hasError = false;

            fields.forEach(f => f.classList.remove('is-invalid'));
            fields.forEach(f => {
                if (!f.checkValidity() || !f.value.trim()) {
                    hasError = true;
                    f.classList.add('is-invalid');
                }
            });

            if (hasError) {
                form.classList.remove('shake');
                void form.offsetWidth;
                form.classList.add('shake');
                showToast('Please fill out all required fields.');
                return;
            }

            form.reset();
            showToast('Message sent successfully! We will get back to you soon.');
        });
    }

    /* ---------- 6. SHOPPING CART & CHECKOUT ---------- */
    let cart = [];
    try {
        cart = JSON.parse(safeStorage.get('dr_plant_cart')) || [];
    } catch (err) {
        cart = [];
    }

    const cartBtn = $('#cartBtn');
    const cartBadge = $('#cartBadge');
    const cartDrawer = $('#cartDrawer');
    const drawerOverlay = $('#drawerOverlay');
    const closeCartBtn = $('#closeCartBtn');
    const cartItemsContainer = $('#cartItemsContainer');
    const cartSubtotal = $('#cartSubtotal');
    const proceedCheckoutBtn = $('#proceedCheckoutBtn');

    const checkoutModal = $('#checkoutModal');
    const closeCheckoutBtn = $('#closeCheckoutBtn');
    const checkoutSummaryList = $('#checkoutSummaryList');
    const checkoutTotal = $('#checkoutTotal');
    const checkoutForm = $('#checkoutForm');

    const saveCart = () => {
        safeStorage.set('dr_plant_cart', JSON.stringify(cart));
        renderCart();
    };

    const calculateTotals = () => cart.reduce((acc, item) => {
        acc.count += item.qty;
        acc.subtotal += item.price * item.qty;
        return acc;
    }, { count: 0, subtotal: 0 });

    const renderCart = () => {
        const { count, subtotal } = calculateTotals();

        if (cartBadge) cartBadge.textContent = count;
        if (cartSubtotal) cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        if (proceedCheckoutBtn) proceedCheckoutBtn.disabled = cart.length === 0;

        if (!cartItemsContainer) return;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Your cart is currently empty.</p>';
            return;
        }

        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <span>$${item.price.toFixed(2)} × ${item.qty}</span>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" type="button" data-action="dec" data-id="${item.id}">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" type="button" data-action="inc" data-id="${item.id}">+</button>
                </div>
            </div>
        `).join('');
    };

    const openCart = () => {
        cartDrawer?.classList.add('is-active');
        drawerOverlay?.classList.add('is-active');
    };

    const closeCart = () => {
        cartDrawer?.classList.remove('is-active');
        drawerOverlay?.classList.remove('is-active');
    };

    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.add-to-cart-btn');
        if (addBtn) {
            const id = addBtn.dataset.id;
            const name = addBtn.dataset.name;
            const price = parseFloat(addBtn.dataset.price);

            const existing = cart.find(i => i.id === id);
            if (existing) existing.qty += 1;
            else cart.push({ id, name, price, qty: 1 });

            saveCart();
            openCart();
            showToast(`Added ${name} to cart.`);
        }

        const qtyBtn = e.target.closest('.qty-btn');
        if (qtyBtn) {
            const id = qtyBtn.dataset.id;
            const action = qtyBtn.dataset.action;
            const item = cart.find(i => i.id === id);

            if (item) {
                if (action === 'inc') item.qty += 1;
                if (action === 'dec') item.qty -= 1;
                cart = cart.filter(i => i.qty > 0);
                saveCart();
            }
        }
    });

    cartBtn?.addEventListener('click', openCart);
    closeCartBtn?.addEventListener('click', closeCart);
    drawerOverlay?.addEventListener('click', closeCart);

    proceedCheckoutBtn?.addEventListener('click', () => {
        closeCart();
        const { subtotal } = calculateTotals();

        if (checkoutSummaryList) {
            checkoutSummaryList.innerHTML = cart.map(i => `
                <div class="summary-line" style="margin-bottom:8px; font-size:14px;">
                    <span>${i.name} (x${i.qty})</span>
                    <span>$${(i.price * i.qty).toFixed(2)}</span>
                </div>
            `).join('');
        }

        if (checkoutTotal) checkoutTotal.textContent = `$${subtotal.toFixed(2)}`;
        checkoutModal?.classList.add('is-active');
    });

    const closeCheckout = () => checkoutModal?.classList.remove('is-active');
    closeCheckoutBtn?.addEventListener('click', closeCheckout);

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            cart = [];
            saveCart();
            closeCheckout();
            checkoutForm.reset();
            showToast('Order placed successfully! Thank you for your purchase.');
        });
    }

    renderCart();
})();
