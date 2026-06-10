(function () {
    const storage = {
        getNumber(key) {
            return Number(localStorage.getItem(key) || 0);
        },
        setNumber(key, value) {
            localStorage.setItem(key, String(value));
        },
        getList(key) {
            try {
                return JSON.parse(localStorage.getItem(key) || "[]");
            } catch {
                return [];
            }
        },
        setList(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    };

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);

    let toastTimer;
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("is-visible");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
    }

    function updateCounts() {
        document.querySelectorAll("[data-cart-count]").forEach((node) => {
            node.textContent = storage.getNumber("sbCartCount");
        });

        document.querySelectorAll("[data-wishlist-count]").forEach((node) => {
            node.textContent = storage.getList("sbWishlist").length;
        });
    }

    const menuToggle = document.querySelector("[data-menu-toggle]");
    const siteDrawer = document.querySelector("[data-site-drawer]");
    const menuCloseButtons = document.querySelectorAll("[data-menu-close]");
    const mobileMenuQuery = window.matchMedia("(max-width: 1000px)");
    let lastFocusedElement = null;

    function getDrawerFocusables() {
        if (!siteDrawer) return [];

        return Array.from(siteDrawer.querySelectorAll("a, button"))
            .filter((element) => !element.disabled && element.offsetParent !== null);
    }

    function syncDrawerAccessibility(isOpen = document.body.classList.contains("nav-open")) {
        if (!siteDrawer) return;

        siteDrawer.setAttribute("aria-hidden", String(mobileMenuQuery.matches && !isOpen));
    }

    function setMenuState(isOpen, restoreFocus = true) {
        if (!mobileMenuQuery.matches && isOpen) return;

        document.body.classList.toggle("nav-open", isOpen);
        menuToggle?.setAttribute("aria-expanded", String(isOpen));
        menuToggle?.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
        syncDrawerAccessibility(isOpen);

        if (isOpen) {
            lastFocusedElement = document.activeElement;
            getDrawerFocusables()[0]?.focus();
            return;
        }

        if (restoreFocus && lastFocusedElement instanceof HTMLElement) {
            lastFocusedElement.focus();
        }
    }

    if (menuToggle && siteDrawer) {
        syncDrawerAccessibility(false);

        menuToggle.addEventListener("click", () => {
            setMenuState(!document.body.classList.contains("nav-open"));
        });

        menuCloseButtons.forEach((button) => {
            button.addEventListener("click", () => setMenuState(false));
        });

        siteDrawer.addEventListener("click", (event) => {
            if (event.target.closest("a")) {
                setMenuState(false, false);
            }
        });

        siteDrawer.addEventListener("keydown", (event) => {
            if (event.key !== "Tab" || !document.body.classList.contains("nav-open")) return;

            const focusables = getDrawerFocusables();
            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (!first || !last) return;

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        document.addEventListener("click", (event) => {
            const clickedDrawer = event.target.closest("[data-site-drawer]");
            const clickedToggle = event.target.closest("[data-menu-toggle]");

            if (document.body.classList.contains("nav-open") && !clickedDrawer && !clickedToggle) {
                setMenuState(false);
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                setMenuState(false);
            }
        });

        mobileMenuQuery.addEventListener("change", () => {
            setMenuState(false, false);
            syncDrawerAccessibility(false);
        });
    }

    const productGrid = document.querySelector("[data-product-grid]");
    const productCards = Array.from(document.querySelectorAll("[data-product-card]"));
    const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
    const searchInput = document.querySelector("[data-product-search]");
    const sortSelect = document.querySelector("[data-product-sort]");
    const emptyState = document.querySelector("[data-empty-state]");

    function applyProductFilters() {
        if (!productGrid) return;

        const activeFilter = document.querySelector("[data-filter].is-active")?.dataset.filter || "all";
        const query = (searchInput?.value || "").trim().toLowerCase();
        let visibleCount = 0;

        productCards.forEach((card) => {
            const matchesCategory = activeFilter === "all" || card.dataset.category === activeFilter;
            const matchesSearch = !query || card.dataset.name.toLowerCase().includes(query);
            const isVisible = matchesCategory && matchesSearch;

            card.classList.toggle("is-hidden", !isVisible);
            if (isVisible) visibleCount += 1;
        });

        emptyState?.classList.toggle("is-visible", visibleCount === 0);
    }

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            filterButtons.forEach((item) => item.classList.remove("is-active"));
            button.classList.add("is-active");
            applyProductFilters();
        });
    });

    searchInput?.addEventListener("input", applyProductFilters);

    sortSelect?.addEventListener("change", () => {
        const sorted = [...productCards].sort((a, b) => {
            const priceA = Number(a.dataset.price);
            const priceB = Number(b.dataset.price);

            if (sortSelect.value === "high") return priceB - priceA;
            if (sortSelect.value === "low") return priceA - priceB;
            return Number(a.dataset.order) - Number(b.dataset.order);
        });

        sorted.forEach((card) => productGrid.appendChild(card));
        applyProductFilters();
    });

    document.querySelectorAll("[data-add-cart]").forEach((button) => {
        button.addEventListener("click", () => {
            const card = button.closest("[data-product-card]");
            const name = card?.dataset.name || "Item";
            const nextCount = storage.getNumber("sbCartCount") + 1;
            storage.setNumber("sbCartCount", nextCount);
            updateCounts();
            button.textContent = "Added";
            setTimeout(() => {
                button.textContent = "Add";
            }, 1400);
            showToast(`${name} added to cart`);
        });
    });

    document.querySelectorAll("[data-wishlist]").forEach((button) => {
        const card = button.closest("[data-product-card]");
        const name = card?.dataset.name || "Item";
        let wishlist = storage.getList("sbWishlist");
        button.classList.toggle("is-active", wishlist.includes(name));

        button.addEventListener("click", () => {
            wishlist = storage.getList("sbWishlist");
            const isSaved = wishlist.includes(name);
            const nextWishlist = isSaved
                ? wishlist.filter((item) => item !== name)
                : [...wishlist, name];

            storage.setList("sbWishlist", nextWishlist);
            button.classList.toggle("is-active", !isSaved);
            updateCounts();
            showToast(isSaved ? `${name} removed from wishlist` : `${name} saved to wishlist`);
        });
    });

    const contactForm = document.querySelector("[data-contact-form]");
    const contactMessage = document.querySelector("[data-contact-message]");

    contactForm?.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!contactForm.checkValidity()) {
            contactForm.reportValidity();
            return;
        }

        contactForm.reset();
        contactMessage?.classList.add("is-visible");
        showToast("Message ready. We will get back to you soon.");
    });

    const authCard = document.querySelector("[data-auth-card]");
    const authTitle = document.querySelector("[data-auth-title]");
    const authForm = document.querySelector("[data-auth-form]");
    const authSwitch = document.querySelector("[data-auth-switch]");
    const authMessage = document.querySelector("[data-auth-message]");

    function renderLogin() {
        if (!authForm || !authTitle || !authSwitch) return;

        authTitle.textContent = "Login";
        authForm.innerHTML = `
            <label for="email">Email</label>
            <input type="email" id="email" name="email" placeholder="Enter your email" required>

            <label for="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Enter your password" required>

            <button class="button" type="submit">Login</button>
        `;
        authSwitch.innerHTML = '<p>New here? <button class="text-button" type="button" data-mode="register">Create an account</button></p>';
        authMessage?.classList.remove("is-visible");
    }

    function renderRegister() {
        if (!authForm || !authTitle || !authSwitch) return;

        authTitle.textContent = "Create account";
        authForm.innerHTML = `
            <label for="name">Name</label>
            <input type="text" id="name" name="name" placeholder="Enter your name" required>

            <label for="email">Email</label>
            <input type="email" id="email" name="email" placeholder="Enter your email" required>

            <label for="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Create a password" required>

            <label for="confirm-password">Confirm Password</label>
            <input type="password" id="confirm-password" name="confirm-password" placeholder="Confirm your password" required>

            <button class="button" type="submit">Register</button>
        `;
        authSwitch.innerHTML = '<p>Already have an account? <button class="text-button" type="button" data-mode="login">Login</button></p>';
        authMessage?.classList.remove("is-visible");
    }

    authSwitch?.addEventListener("click", (event) => {
        const mode = event.target.dataset.mode;

        if (mode === "register") renderRegister();
        if (mode === "login") renderLogin();
    });

    authForm?.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!authForm.checkValidity()) {
            authForm.reportValidity();
            return;
        }

        authMessage.textContent = authTitle.textContent === "Login"
            ? "Login details checked for this demo."
            : "Account details checked for this demo.";
        authMessage.classList.add("is-visible");
    });

    if (authCard) {
        renderLogin();
        requestAnimationFrame(() => authCard.classList.add("show"));
    }

    updateCounts();
    applyProductFilters();
})();
