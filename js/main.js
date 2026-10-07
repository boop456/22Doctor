/* ==========================================================
   main.js — DR.Plant by 22Doctor
   ========================================================== */

(function () {
    'use strict';

    document.documentElement.classList.add('js');

    /* ---------- CONFIG ----------
       A static site cannot send email by itself. The forms below open the visitor's
       email app with a pre-filled message addressed to YOU. Put your real address here.
       (For real, automatic delivery use a form service such as Formspree/EmailJS,
       or a small backend.) */
    const CONFIG = {
        storeEmail: 'YOUR-EMAIL@example.com'
    };

    const $ = (selector, context = document) => context.querySelector(selector);
    const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

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

    const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    /* ---------- 1. HEADER SCROLL ---------- */
    const header = $('#header');
    let ticking = false;

    const updateHeader = () => {
        if (header) header.classList.toggle('is-scrolled', window.scrollY > 4);
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }, { passive: true });
    updateHeader();

    /* ---------- 2. MOBILE MENU ---------- */
    const menuBtn = $('#menuBtn');
    const nav = $('#nav');

    const setMenu = (open) => {
        if (!menuBtn || !nav) return;
        nav.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    if (menuBtn && nav) {
        menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
        nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
        document.addEventListener('click', (e) => {
            if (nav.classList.contains('is-open') && !e.target.closest('#nav') && !e.target.closest('#menuBtn')) {
                setMenu(false);
            }
        });
    }

    /* ---------- 3. ACTIVE NAV LINK (scroll spy) ---------- */
    const navLinks = $$('.nav a[href^="#"]');
    const spySections = navLinks
        .map((a) => $(a.getAttribute('href')))
        .filter(Boolean);

    if (spySections.length && 'IntersectionObserver' in window) {
        const spy = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                navLinks.forEach((a) => {
                    a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`);
                });
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        spySections.forEach((s) => spy.observe(s));
    }

    /* ---------- 4. DARK MODE ---------- */
    const themeToggle = $('#themeToggle');

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        if (themeToggle) {
            themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        }
    };

    // The inline <head> script already set the initial theme; just sync the button label.
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light');

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            safeStorage.set('theme', next);
        });
    }

    // Follow the OS setting live, unless the visitor picked a theme themselves
    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onSystemChange = (e) => { if (!safeStorage.get('theme')) applyTheme(e.matches ? 'dark' : 'light'); };
        if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
        else if (mq.addListener) mq.addListener(onSystemChange);
    }

    /* ---------- 5. SCROLL REVEAL ---------- */
    const revealItems = $$('.reveal');

    if (revealItems.length > 0 && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                el.classList.add('is-visible');
                observer.unobserve(el);
                // Clear the stagger delay afterwards so hover transitions aren't delayed
                setTimeout(() => { el.style.transitionDelay = ''; }, 900);
            });
        }, { threshold: 0.15 });

        revealItems.forEach((el, index) => {
            el.style.transitionDelay = `${(index % 3) * 70}ms`;
            revealObserver.observe(el);
        });
    } else {
        revealItems.forEach((el) => el.classList.add('is-visible'));
    }

    /* ---------- 6. TOAST ---------- */
    const toast = $('#toast');
    let toastTimer = null;

    const showToast = (message) => {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('is-show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('is-show'), 4500);
    };

    /* ---------- 7. DIALOG HELPERS (drawer + modal) ---------- */
    const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
    let lastFocused = null;

    const cartDrawer = $('#cartDrawer');
    const drawerOverlay = $('#drawerOverlay');
    const checkoutModal = $('#checkoutModal');

    const syncScrollLock = () => {
        const anyOpen = (cartDrawer && cartDrawer.classList.contains('is-active')) ||
                        (checkoutModal && checkoutModal.classList.contains('is-active'));
        document.body.classList.toggle('no-scroll', Boolean(anyOpen));
    };

    const openDialog = (dialog, overlay) => {
        if (!dialog) return;
        lastFocused = document.activeElement;
        dialog.classList.add('is-active');
        dialog.setAttribute('aria-hidden', 'false');
        if (overlay) overlay.classList.add('is-active');
        syncScrollLock();
        const first = $(FOCUSABLE, dialog);
        if (first) first.focus();
    };

    const closeDialog = (dialog, overlay, restoreFocus = true) => {
        if (!dialog || !dialog.classList.contains('is-active')) return;
        dialog.classList.remove('is-active');
        dialog.setAttribute('aria-hidden', 'true');
        if (overlay) overlay.classList.remove('is-active');
        syncScrollLock();
        if (restoreFocus && lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    };

    const openCart = () => openDialog(cartDrawer, drawerOverlay);
    const closeCart = (restoreFocus) => closeDialog(cartDrawer, drawerOverlay, restoreFocus);
    const openCheckout = () => openDialog(checkoutModal, null);
    const closeCheckout = (restoreFocus) => closeDialog(checkoutModal, null, restoreFocus);

    document.addEventListener('keydown', (e) => {
        const active = [checkoutModal, cartDrawer].find((d) => d && d.classList.contains('is-active'));

        if (e.key === 'Escape') {
            if (active === checkoutModal) closeCheckout();
            else if (active === cartDrawer) closeCart();
            else setMenu(false);
            return;
        }

        // Keep keyboard focus inside the open dialog
        if (e.key === 'Tab' && active) {
            const items = $$(FOCUSABLE, active).filter((el) => el.offsetParent !== null || el === document.activeElement);
            if (!items.length) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });

    checkoutModal?.addEventListener('click', (e) => { if (e.target === checkoutModal) closeCheckout(); });

    /* ---------- 8. FORM HELPERS ---------- */
    // Clear the red error state as soon as the visitor edits a field
    document.addEventListener('input', (e) => {
        if (e.target.classList && e.target.classList.contains('is-invalid')) {
            e.target.classList.remove('is-invalid');
        }
    });

    const buildMailto = (subject, body) =>
        `mailto:${CONFIG.storeEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    /* ---------- 9. CONTACT FORM ---------- */
    const form = $('#form');
    if (form) {
        form.addEventListener('animationend', () => form.classList.remove('shake'));

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = $('#name', form);
            const emailInput = $('#email', form);
            const messageInput = $('#message', form);

            const fields = [nameInput, emailInput, messageInput];
            let hasError = false;

            fields.forEach((f) => f.classList.remove('is-invalid'));
            fields.forEach((f) => {
                if (!f.checkValidity() || !f.value.trim()) {
                    hasError = true;
                    f.classList.add('is-invalid');
                }
            });

            if (hasError) {
                form.classList.remove('shake');
                void form.offsetWidth;
                form.classList.add('shake');
                showToast('Please fill out all fields with a valid email address.');
                const firstBad = $('.is-invalid', form);
                if (firstBad) firstBad.focus();
                return;
            }

            const userName = nameInput.value.trim();
            const userEmail = emailInput.value.trim();
            const userMsg = messageInput.value.trim();

            const subject = `DR.Plant contact message from ${userName}`;
            const body = `Name: ${userName}\nEmail: ${userEmail}\n\nMessage:\n${userMsg}`;

            window.location.href = buildMailto(subject, body);

            form.reset();
            showToast('Your email app should open. Press send there to deliver your message.');
        });
    }

    /* ---------- 10. SHOPPING CART ---------- */
    const CART_KEY = 'dr_plant_cart';
    const MAX_QTY = 99;

    // Product catalog comes from the page itself, so price/name can't be tampered with in storage
    const catalog = {};
    $$('.add-to-cart-btn').forEach((btn) => {
        const price = parseFloat(btn.dataset.price);
        if (btn.dataset.id && btn.dataset.name && Number.isFinite(price)) {
            catalog[btn.dataset.id] = { id: btn.dataset.id, name: btn.dataset.name, price };
        }
    });

    // Cart is stored as [{ id, qty }]
    const loadCart = () => {
        try {
            const raw = JSON.parse(safeStorage.get(CART_KEY));
            if (!Array.isArray(raw)) return [];
            return raw
                .filter((i) => i && catalog[i.id] && Number.isInteger(i.qty) && i.qty > 0)
                .map((i) => ({ id: i.id, qty: Math.min(i.qty, MAX_QTY) }));
        } catch (err) {
            return [];
        }
    };

    let cart = loadCart();

    const cartBtn = $('#cartBtn');
    const cartBadge = $('#cartBadge');
    const closeCartBtn = $('#closeCartBtn');
    const cartItemsContainer = $('#cartItemsContainer');
    const cartSubtotal = $('#cartSubtotal');
    const proceedCheckoutBtn = $('#proceedCheckoutBtn');

    const closeCheckoutBtn = $('#closeCheckoutBtn');
    const checkoutSummaryList = $('#checkoutSummaryList');
    const checkoutTotal = $('#checkoutTotal');
    const checkoutForm = $('#checkoutForm');

    const formatRupiah = (amount) => `Rp ${Math.round(amount).toLocaleString('id-ID')}`;

    const calculateTotals = () => cart.reduce((acc, item) => {
        const product = catalog[item.id];
        acc.count += item.qty;
        acc.subtotal += product.price * item.qty;
        return acc;
    }, { count: 0, subtotal: 0 });

    const renderCart = () => {
        const { count, subtotal } = calculateTotals();

        if (cartBadge) cartBadge.textContent = count;
        if (cartBtn) {
            cartBtn.setAttribute('aria-label', count > 0
                ? `Open shopping cart, ${count} item${count === 1 ? '' : 's'}`
                : 'Open shopping cart');
        }
        if (cartSubtotal) cartSubtotal.textContent = formatRupiah(subtotal);
        if (proceedCheckoutBtn) proceedCheckoutBtn.disabled = cart.length === 0;

        if (!cartItemsContainer) return;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Your cart is currently empty.</p>';
            return;
        }

        cartItemsContainer.innerHTML = cart.map((item) => {
            const p = catalog[item.id];
            const name = escapeHtml(p.name);
            return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${name}</h4>
                    <span>${formatRupiah(p.price)} × ${item.qty}</span>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" type="button" data-action="dec" data-id="${escapeHtml(item.id)}" aria-label="Decrease quantity of ${name}">−</button>
                    <span aria-live="polite">${item.qty}</span>
                    <button class="qty-btn" type="button" data-action="inc" data-id="${escapeHtml(item.id)}" aria-label="Increase quantity of ${name}">+</button>
                </div>
            </div>`;
        }).join('');
    };

    const saveCart = () => {
        safeStorage.set(CART_KEY, JSON.stringify(cart));
        renderCart();
    };

    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.add-to-cart-btn');
        if (addBtn) {
            const product = catalog[addBtn.dataset.id];
            if (!product) return;

            const existing = cart.find((i) => i.id === product.id);
            if (existing) existing.qty = Math.min(existing.qty + 1, MAX_QTY);
            else cart.push({ id: product.id, qty: 1 });

            saveCart();
            openCart();
            showToast(`Added ${product.name} to cart.`);
            return;
        }

        const qtyBtn = e.target.closest('.qty-btn');
        if (qtyBtn) {
            const item = cart.find((i) => i.id === qtyBtn.dataset.id);
            if (!item) return;

            if (qtyBtn.dataset.action === 'inc') item.qty = Math.min(item.qty + 1, MAX_QTY);
            if (qtyBtn.dataset.action === 'dec') item.qty -= 1;
            cart = cart.filter((i) => i.qty > 0);
            saveCart();

            // The re-render replaced the clicked button; put focus back on a matching control
            const sameBtn = $(`.qty-btn[data-action="${qtyBtn.dataset.action}"][data-id="${qtyBtn.dataset.id}"]`, cartItemsContainer);
            if (sameBtn) sameBtn.focus();
            else if (closeCartBtn) closeCartBtn.focus();
        }
    });

    cartBtn?.addEventListener('click', openCart);
    closeCartBtn?.addEventListener('click', () => closeCart());
    drawerOverlay?.addEventListener('click', () => closeCart());

    /* ---------- 11. CHECKOUT ---------- */
    proceedCheckoutBtn?.addEventListener('click', () => {
        if (cart.length === 0) return;
        const { subtotal } = calculateTotals();

        if (checkoutSummaryList) {
            checkoutSummaryList.innerHTML = cart.map((i) => {
                const p = catalog[i.id];
                return `
                <div class="summary-line">
                    <span>${escapeHtml(p.name)} (×${i.qty})</span>
                    <span>${formatRupiah(p.price * i.qty)}</span>
                </div>`;
            }).join('');
        }

        if (checkoutTotal) checkoutTotal.textContent = formatRupiah(subtotal);

        // Switch dialogs without restoring focus to the (now hidden) cart button in between
        closeCart(false);
        openCheckout();
    });

    closeCheckoutBtn?.addEventListener('click', () => closeCheckout());

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (cart.length === 0) return;

            const coName = $('#co-name').value.trim();
            const coEmail = $('#co-email').value.trim();
            const coAddress = $('#co-address').value.trim();
            const coPayment = $('#co-payment').value;

            if (!coName || !coEmail || !coAddress) {
                showToast('Please complete all required fields.');
                return;
            }

            const { subtotal } = calculateTotals();
            const itemsList = cart.map((i) => {
                const p = catalog[i.id];
                return `- ${p.name} (x${i.qty}) - ${formatRupiah(p.price * i.qty)}`;
            }).join('\n');

            const subject = `DR.Plant order from ${coName}`;
            const body =
                `New order from ${coName}\n` +
                `Email: ${coEmail}\n\n` +
                `Items:\n${itemsList}\n\n` +
                `Total due: ${formatRupiah(subtotal)}\n` +
                `Payment method: ${coPayment}\n` +
                `Shipping address: ${coAddress}`;

            window.location.href = buildMailto(subject, body);

            cart = [];
            saveCart();
            closeCheckout(false);
            checkoutForm.reset();
            showToast('Your email app should open with the order. Press send there to place it.');
        });
    }

    renderCart();
})();
