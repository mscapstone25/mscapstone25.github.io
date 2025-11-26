// State variables
let products = [];
let filteredProducts = [];
let selectedProducts = new Set();
let searchTerm = "";
let isStaffLoggedIn = false;
let isAdminLoggedIn = false;
let currentUser = null;
let userRole = null;
let editingProductId = null;
let salesHistory = [];
let productMovements = {};
let productAnalytics = {};

// Load products
async function loadProducts() {
    try {
        products = await API.getProducts();
        filteredProducts = [...products];
        localStorage.setItem('motorShopProducts_v1', JSON.stringify(products));
        salesHistory = await API.getSalesHistory();
        productMovements = await API.getProductMovements();

        try {
            const savedAnalytics = localStorage.getItem('productAnalytics');
            if (savedAnalytics) productAnalytics = JSON.parse(savedAnalytics);
        } catch (error) {
            console.error('Error loading analytics:', error);
        }

        updateBrandDropdowns();
        updateCategoryDropdowns();
        renderProducts(filteredProducts);
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('productsGrid').innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #e63946;">Error loading products.</p>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async function () {
    const savedLoginState = localStorage.getItem('loginState');
    if (savedLoginState) {
        const loginData = JSON.parse(savedLoginState);
        isStaffLoggedIn = loginData.isStaffLoggedIn || false;
        isAdminLoggedIn = loginData.isAdminLoggedIn || false;
        currentUser = loginData.currentUser || null;
        userRole = loginData.userRole || null;
        if (isStaffLoggedIn || isAdminLoggedIn) updateStaffUI();
    }

    await loadProducts();

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') performSearch();
        });
    }

    const navSearchInput = document.getElementById('navSearchInput');
    if (navSearchInput) {
        navSearchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleNavSearch();
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'true' || window.location.hash === '#login') {
        openLoginModal();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// Render products
function renderProducts(productsToRender) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    if (productsToRender.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #666;">No products found.</p>';
        return;
    }

    productsToRender.forEach(product => {
        const card = createProductCard(product);
        grid.appendChild(card);
    });
}

// Create product card with BETTER INVENTORY DESIGN
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    trackProductAnalytics(product.id, 'view');

    card.addEventListener('click', function (e) {
        if (!e.target.closest('button') && !e.target.closest('input') && !e.target.closest('.inventory-controls')) {
            trackProductAnalytics(product.id, 'click');
        }
    });

    const isSelected = selectedProducts.has(product.id);
    const analytics = getProductAnalytics(product.id);

    // BETTER INVENTORY CONTROLS - Stock at top, larger colorful buttons
    let inventoryControls = '';
    if (isStaffLoggedIn || isAdminLoggedIn) {
        inventoryControls = `
            <div class="inventory-controls">
                <div class="stock-display">
                    <span class="stock-label">Stock:</span>
                    <span class="stock-value">${product.quantity}</span>
                </div>
                <div class="inventory-buttons">
                    <button onclick="updateInventory(${product.id}, -1)" class="btn-subtract" title="Sell">➖</button>
                    <input type="number" id="qtyInput_${product.id}" value="1" min="1" class="qty-input">
                    <button onclick="updateInventory(${product.id}, 1)" class="btn-add" title="Add Stock">➕</button>
                    <button onclick="bulkUpdateInventory(${product.id})" class="btn-set-stock" title="Set Stock">⚙️</button>
                </div>
            </div>
        `;
    }

    let adminActions = '';
    if (isAdminLoggedIn) {
        adminActions = `
            <div class="admin-actions">
                <button onclick="openEditProductModal(${product.id}, event)" class="btn-edit">✏️ Edit</button>
                <button onclick="confirmDeleteProduct(${product.id}, event)" class="btn-delete">🗑️ Delete</button>
            </div>
        `;
    }

    card.innerHTML = `
        <input type="checkbox" class="compare-checkbox" ${isSelected ? 'checked' : ''} onchange="toggleCompare(${product.id})">
        <div class="product-image">
            <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);color:#666;font-size:14px;text-align:center;padding:10px;\\'>${product.name}<br/><small>Image not available</small></div>'">
        </div>
        <h3 class="product-title">${product.name}</h3>
        <p class="product-brand">${product.brand}</p>
        <p class="product-category">${product.category}</p>
        <p class="product-description">${product.description || 'No description'}</p>
        <div class="product-specs">
            ${Object.entries(product.specs || {}).map(([key, value]) => {
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
        return `<div><strong>${formattedKey}:</strong> ${value}</div>`;
    }).join('')}
        </div>
        <div class="product-price">₱${product.price.toLocaleString()}</div>
        ${inventoryControls}
        ${adminActions}
        ${isAdminLoggedIn ? `<div style="font-size: 10px; color: #999; margin-top: 5px;">Views: ${analytics.views} | Clicks: ${analytics.clicks}</div>` : ''}
    `;

    return card;
}

// Analytics
function trackProductAnalytics(productId, eventType = 'view') {
    if (!productAnalytics[productId]) {
        productAnalytics[productId] = { views: 0, clicks: 0, interactions: 0, lastViewed: null };
    }

    const analytics = productAnalytics[productId];

    switch (eventType) {
        case 'view': analytics.views++; analytics.lastViewed = new Date().toISOString(); break;
        case 'click': analytics.clicks++; break;
        case 'interaction': analytics.interactions++; break;
    }

    localStorage.setItem('productAnalytics', JSON.stringify(productAnalytics));

    if (typeof API !== 'undefined' && API.updateProductAnalytics) {
        API.updateProductAnalytics(productId, analytics).catch(err => console.error('Error updating analytics:', err));
    }
}

function getProductAnalytics(productId) {
    return productAnalytics[productId] || { views: 0, clicks: 0, interactions: 0, lastViewed: null };
}

function getProductSalesStats(productId) {
    const productSales = salesHistory.filter(sale => sale.productId === productId);
    const totalQuantitySold = productSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
    const totalRevenue = productSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const numberOfSales = productSales.length;
    const analytics = getProductAnalytics(productId);

    return { totalQuantitySold, totalRevenue, numberOfSales, views: analytics.views, clicks: analytics.clicks, interactions: analytics.interactions };
}

// Search and filters
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchTerm = searchInput.value.toLowerCase().trim();
    } else {
        searchTerm = '';
    }
    applyFilters();
}

function handleNavSearch() {
    const navInput = document.getElementById('navSearchInput');
    if (!navInput) return;
    const query = navInput.value.trim();
    const mainSearchInput = document.getElementById('searchInput');
    if (mainSearchInput) {
        mainSearchInput.value = query;
    }
    searchTerm = query.toLowerCase();
    applyFilters();
    const productsSection = document.querySelector('.products-section');
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function applyFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const priceFilter = document.getElementById('priceFilter');
    const brandFilter = document.getElementById('brandFilter');
    
    const navCategoryFilter = document.getElementById('navCategoryFilter');
    const navPriceFilter = document.getElementById('navPriceFilter');
    const navBrandFilter = document.getElementById('navBrandFilter');
    
    const category = (categoryFilter ? categoryFilter.value : '') || (navCategoryFilter ? navCategoryFilter.value : '');
    const priceRange = (priceFilter ? priceFilter.value : '') || (navPriceFilter ? navPriceFilter.value : '');
    const brand = (brandFilter ? brandFilter.value : '') || (navBrandFilter ? navBrandFilter.value : '');

    filteredProducts = products.filter(product => {
        const matchesSearch = !searchTerm || product.name.toLowerCase().includes(searchTerm) || product.brand.toLowerCase().includes(searchTerm) || product.category.toLowerCase().includes(searchTerm) || (product.description && product.description.toLowerCase().includes(searchTerm));
        const matchesCategory = !category || product.category === category;
        let matchesPrice = true;
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(v => v === '+' ? Infinity : parseInt(v));
            matchesPrice = product.price >= min && (max === undefined || product.price <= max);
        }
        const matchesBrand = !brand || product.brand === brand;
        return matchesSearch && matchesCategory && matchesPrice && matchesBrand;
    });

    syncNavFiltersFromMain();
    renderProducts(filteredProducts);
}

// Comparison
function toggleCompare(productId) {
    if (selectedProducts.has(productId)) {
        selectedProducts.delete(productId);
    } else {
        if (selectedProducts.size >= 4) {
            alert('You can compare up to 4 products at a time.');
            event.target.checked = false;
            return;
        }
        selectedProducts.add(productId);
    }
    updateCompareCount();
    renderProducts(filteredProducts);
}

function updateCompareCount() {
    document.getElementById('compareCount').textContent = selectedProducts.size;
}

function showComparison() {
    if (selectedProducts.size < 2) {
        alert('Please select at least 2 products to compare.');
        return;
    }
    const comparisonSection = document.getElementById('comparisonSection');
    comparisonSection.classList.remove('hidden');
    comparisonSection.scrollIntoView({ behavior: 'smooth' });
    renderComparison();
}

function hideComparison() {
    document.getElementById('comparisonSection').classList.add('hidden');
}

function calculateStandoutScore(product, salesStats, allProducts) {
    let score = 0;
    const maxQuantity = Math.max(...allProducts.map(p => getProductSalesStats(p.id).totalQuantitySold), 1);
    if (maxQuantity > 0) score += (salesStats.totalQuantitySold / maxQuantity) * 40;
    const maxRevenue = Math.max(...allProducts.map(p => getProductSalesStats(p.id).totalRevenue), 1);
    if (maxRevenue > 0) score += (salesStats.totalRevenue / maxRevenue) * 30;
    const maxStock = Math.max(...allProducts.map(p => p.quantity || 0), 1);
    if (maxStock > 0) score += ((product.quantity || 0) / maxStock) * 20;
    const prices = allProducts.map(p => p.price || 0).filter(p => p > 0);
    if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        if (maxPrice > minPrice && product.price) {
            score += ((maxPrice - product.price) / (maxPrice - minPrice)) * 10;
        } else {
            score += 5;
        }
    }
    return Math.round(Math.min(100, Math.max(0, score)));
}

function renderComparison() {
    const selectedProductsArray = Array.from(selectedProducts).map(id => products.find(p => p.id === id));
    const table = document.getElementById('comparisonTable');
    const productsWithStats = selectedProductsArray.map(product => {
        const stats = getProductSalesStats(product.id);
        const standoutScore = calculateStandoutScore(product, stats, selectedProductsArray);
        return { ...product, salesStats: stats, standoutScore: standoutScore };
    });

    const topSellingProduct = productsWithStats.reduce((max, p) => p.salesStats.totalQuantitySold > max.salesStats.totalQuantitySold ? p : max);
    const mostStandoutProduct = productsWithStats.reduce((max, p) => p.standoutScore > max.standoutScore ? p : max);
    const allSpecKeys = new Set();
    selectedProductsArray.forEach(product => { if (product.specs) Object.keys(product.specs).forEach(key => allSpecKeys.add(key)); });
    const specKeys = Array.from(allSpecKeys);

    let html = '<table><thead><tr><th>Specification</th>';
    productsWithStats.forEach(product => {
        const isTopSelling = product.id === topSellingProduct.id && product.salesStats.totalQuantitySold > 0;
        const isMostStandout = product.id === mostStandoutProduct.id;
        const badgeTopSelling = isTopSelling ? ' <span style="background: linear-gradient(135deg, #ffd700, #ffed4e); color: #000; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: bold; margin-left: 5px; box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);">🏆 TOP SELLING</span>' : '';
        const badgeMostPopular = isMostStandout ? ' <span style="background: linear-gradient(135deg, #00d1ff, #8a5cff); color: #fff; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: bold; margin-left: 5px; box-shadow: 0 4px 12px rgba(0, 209, 255, 0.4);">⭐ MOST POPULAR</span>' : '';
        const progressBarColor = product.standoutScore >= 70 ? 'linear-gradient(90deg, #00d1ff, #8a5cff)' : product.standoutScore >= 40 ? 'linear-gradient(90deg, #ff8c42, #ff4d00)' : 'rgba(160, 174, 192, 0.5)';
        html += `<th class="comparison-product-header"><div class="product-name">${product.name}${badgeTopSelling}${badgeMostPopular}</div><div class="product-brand">${product.brand}</div><div class="product-price">₱${product.price.toLocaleString()}</div><div style="margin: 8px 0; font-size: 12px; color: var(--muted-text);"><div>📦 Sold: ${product.salesStats.totalQuantitySold} units</div><div>💰 Revenue: ₱${product.salesStats.totalRevenue.toLocaleString()}</div></div><div style="margin: 10px 0;"><div style="font-size: 11px; color: var(--muted-text); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Popularity Score</div><div style="background: rgba(255, 255, 255, 0.05); border-radius: 10px; height: 22px; position: relative; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.1);"><div style="background: ${progressBarColor}; height: 100%; width: ${product.standoutScore}%; border-radius: 10px; transition: width 0.3s; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);">${product.standoutScore}%</div></div></div><button class="remove-product" onclick="removeFromComparison(${product.id})">Remove</button></th>`;
    });
    html += '</tr></thead><tbody><tr><td class="spec-label">Category</td>';
    selectedProductsArray.forEach(product => html += `<td>${product.category}</td>`);
    html += '</tr>';
    specKeys.forEach(specKey => {
        const formattedKey = specKey.charAt(0).toUpperCase() + specKey.slice(1).replace(/([A-Z])/g, ' $1');
        html += `<tr><td class="spec-label">${formattedKey}</td>`;
        selectedProductsArray.forEach(product => html += `<td>${product.specs[specKey] || 'N/A'}</td>`);
        html += '</tr>';
    });
    html += '</tbody></table>';
    table.innerHTML = html;
}

function removeFromComparison(productId) {
    selectedProducts.delete(productId);
    updateCompareCount();
    if (selectedProducts.size < 2) {
        hideComparison();
    } else {
        renderComparison();
        renderProducts(filteredProducts);
    }
}

// Login/Logout
function openLoginModal() {
    document.getElementById('loginModal').classList.remove('hidden');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('loginForm').reset();
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Please fill in all fields.');
        return;
    }

    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const foundUser = registeredUsers.find(u => u.username === username && u.password === password);

    if (foundUser) {
        userRole = foundUser.role || null;
        currentUser = foundUser.username;
        if (userRole === 'admin') {
            isAdminLoggedIn = true;
            isStaffLoggedIn = true;
        } else if (userRole === 'staff') {
            isStaffLoggedIn = true;
            isAdminLoggedIn = false;
        } else {
            isStaffLoggedIn = false;
            isAdminLoggedIn = false;
        }
        localStorage.setItem('loginState', JSON.stringify({ isStaffLoggedIn, isAdminLoggedIn, currentUser, userRole }));
        updateStaffUI();
        const roleMessage = userRole ? ` (${userRole.charAt(0).toUpperCase() + userRole.slice(1)})` : '';
        alert(`Login successful!\nWelcome, ${username}${roleMessage}`);
        closeLoginModal();
        return;
    }

    const usernameLower = username.toLowerCase();
    const isAdmin = (usernameLower.includes('admin') && !usernameLower.includes('staff')) || usernameLower === 'admin';
    const isStaff = usernameLower.includes('staff') || usernameLower === 'staff';

    if (isAdmin) {
        isAdminLoggedIn = true;
        isStaffLoggedIn = true;
        currentUser = username;
        userRole = 'admin';
        localStorage.setItem('loginState', JSON.stringify({ isStaffLoggedIn, isAdminLoggedIn, currentUser, userRole }));
        updateStaffUI();
        alert(`Login successful!\nWelcome, ${username} (Admin)`);
    } else if (isStaff) {
        isStaffLoggedIn = true;
        isAdminLoggedIn = false;
        currentUser = username;
        userRole = 'staff';
        localStorage.setItem('loginState', JSON.stringify({ isStaffLoggedIn, isAdminLoggedIn, currentUser, userRole }));
        updateStaffUI();
        alert(`Login successful!\nWelcome, ${username} (Staff)`);
    } else {
        alert('Invalid username or password.');
        return;
    }
    closeLoginModal();
}

function updateStaffUI() {
    const userInfo = document.getElementById('userInfo');
    const loginButton = document.getElementById('loginButton');
    const staffSection = document.getElementById('staffInventorySection');
    const adminSection = document.getElementById('adminDashboardSection');
    const userName = document.getElementById('userName');

    if (isStaffLoggedIn || isAdminLoggedIn) {
        userInfo.classList.remove('hidden');
        if (loginButton) loginButton.classList.add('hidden');
        if (isAdminLoggedIn) {
            adminSection.classList.remove('hidden');
            staffSection.classList.add('hidden');
            userName.textContent = `👑 ${currentUser} (Admin)`;
        } else {
            staffSection.classList.remove('hidden');
            adminSection.classList.add('hidden');
            userName.textContent = `👤 ${currentUser} (Staff)`;
        }
    } else {
        userInfo.classList.add('hidden');
        if (loginButton) loginButton.classList.add('hidden');
        staffSection.classList.add('hidden');
        adminSection.classList.add('hidden');
    }
    renderProducts(filteredProducts);
}

// WORKING LOGOUT FUNCTION
function handleLogout() {
    console.log('Logout initiated');
    if (confirm('Are you sure you want to logout?')) {
        try {
            // Reset state
            isStaffLoggedIn = false;
            isAdminLoggedIn = false;
            currentUser = null;
            userRole = null;
            localStorage.removeItem('loginState');

            // Update UI manually to be safe
            const userInfo = document.getElementById('userInfo');
            const loginButton = document.getElementById('loginButton');
            const staffSection = document.getElementById('staffInventorySection');
            const adminSection = document.getElementById('adminDashboardSection');

            if (userInfo) userInfo.classList.add('hidden');
            if (loginButton) loginButton.classList.remove('hidden');
            if (staffSection) staffSection.classList.add('hidden');
            if (adminSection) adminSection.classList.add('hidden');

            // Also call the main update function
            updateStaffUI();

            alert('Logged out successfully.');
        } catch (e) {
            console.error('Logout error:', e);
            alert('Error logging out: ' + e.message);
        }
    }
}

function navigateToPage(page) {
    window.location.href = page;
}
// Inventory management
async function updateInventory(productId, change) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const qtyInput = document.getElementById(`qtyInput_${productId}`);
    const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    const actualChange = change * quantity;
    const newQuantity = product.quantity + actualChange;

    if (newQuantity < 0) {
        alert('Cannot reduce stock below 0.');
        return;
    }

    try {
        await API.updateProduct(productId, newQuantity);
        product.quantity = newQuantity;

        if (actualChange < 0) {
            const quantitySold = Math.abs(actualChange);
            const saleData = {
                date: new Date().toISOString(),
                productId: productId,
                productName: product.name,
                quantity: quantitySold,
                price: product.price,
                total: product.price * quantitySold
            };
            try {
                await API.recordSale(saleData);
                salesHistory.push(saleData);
                localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
                window.dispatchEvent(new CustomEvent('salesUpdated'));
            } catch (saleError) {
                console.error('Error recording sale:', saleError);
            }
        }

        await loadProducts();
        const message = actualChange > 0 ? `Added ${Math.abs(actualChange)} unit(s). New stock: ${newQuantity}` : `Sold ${Math.abs(actualChange)} unit(s). New stock: ${newQuantity}`;
        alert(message);
    } catch (error) {
        const errorMessage = error.message || 'Unknown error';
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('backend unavailable')) {
            product.quantity = newQuantity;
            const savedProducts = JSON.parse(localStorage.getItem('motorShopProducts_v1') || '[]');
            const productIndex = savedProducts.findIndex(p => p.id === productId);
            if (productIndex !== -1) {
                savedProducts[productIndex].quantity = newQuantity;
                localStorage.setItem('motorShopProducts_v1', JSON.stringify(savedProducts));
            }
            if (actualChange < 0) {
                const quantitySold = Math.abs(actualChange);
                const saleData = { date: new Date().toISOString(), productId, productName: product.name, quantity: quantitySold, price: product.price, total: product.price * quantitySold };
                const localSalesHistory = JSON.parse(localStorage.getItem('salesHistory') || '[]');
                localSalesHistory.push(saleData);
                localStorage.setItem('salesHistory', JSON.stringify(localSalesHistory));
                salesHistory = localSalesHistory;
                window.dispatchEvent(new CustomEvent('salesUpdated'));
            }
            renderProducts(filteredProducts);
            alert(`Inventory updated locally. New stock: ${newQuantity}\n\nNote: Backend unavailable. Changes saved locally.`);
        } else {
            alert('Error updating inventory: ' + errorMessage);
            console.error('Error updating inventory:', error);
        }
    }
}

async function bulkUpdateInventory(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const quantity = prompt(`Enter new stock quantity for "${product.name}":`, product.quantity);
    if (quantity === null) return;

    const newQuantity = parseInt(quantity);
    if (isNaN(newQuantity) || newQuantity < 0) {
        alert('Please enter a valid number (0 or greater).');
        return;
    }

    try {
        await API.updateProduct(productId, newQuantity);
        product.quantity = newQuantity;
        await loadProducts();
        alert(`Stock updated to ${newQuantity} units.`);
    } catch (error) {
        const errorMessage = error.message || 'Unknown error';
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('backend unavailable')) {
            product.quantity = newQuantity;
            const savedProducts = JSON.parse(localStorage.getItem('motorShopProducts_v1') || '[]');
            const productIndex = savedProducts.findIndex(p => p.id === productId);
            if (productIndex !== -1) {
                savedProducts[productIndex].quantity = newQuantity;
                localStorage.setItem('motorShopProducts_v1', JSON.stringify(savedProducts));
            }
            renderProducts(filteredProducts);
            alert(`Stock updated locally to ${newQuantity} units.\n\nNote: Backend unavailable.`);
        } else {
            alert('Error updating inventory: ' + errorMessage);
            console.error('Error updating inventory:', error);
        }
    }
}

// Product modals (simplified for space - full implementation continues below)
function openAddProductModal() {
    if (!isAdminLoggedIn) { alert('Only administrators can add products.'); return; }
    updateBrandDropdowns();
    updateCategoryDropdowns();
    document.getElementById('addProductModal').classList.remove('hidden');
}

function closeAddProductModal() {
    document.getElementById('addProductModal').classList.add('hidden');
    const form = document.getElementById('addProductForm');
    if (form) form.reset();
}

function handleBrandSelection() {
    const brandSelect = document.getElementById('productBrand');
    const customBrandInput = document.getElementById('customBrandInput');
    if (brandSelect.value === 'Other') {
        customBrandInput.classList.remove('hidden');
        customBrandInput.required = true;
        customBrandInput.focus();
    } else {
        customBrandInput.classList.add('hidden');
        customBrandInput.required = false;
        customBrandInput.value = '';
    }
}

function handleCategorySelection() {
    const categorySelect = document.getElementById('productCategory');
    const customCategoryInput = document.getElementById('customCategoryInput');
    if (categorySelect.value === 'Other') {
        customCategoryInput.classList.remove('hidden');
        customCategoryInput.required = true;
        customCategoryInput.focus();
    } else {
        customCategoryInput.classList.add('hidden');
        customCategoryInput.required = false;
        customCategoryInput.value = '';
    }
}

let customSpecCounter = 0;
function addCustomSpecification() {
    const container = document.getElementById('customSpecsContainer');
    if (!container) return;
    const specId = `customSpec_${customSpecCounter++}`;
    const specRow = document.createElement('div');
    specRow.className = 'form-row';
    specRow.id = specId;
    specRow.style.marginTop = '10px';
    specRow.innerHTML = `<div class="form-group" style="flex: 1;"><label>Specification Name</label><input type="text" class="custom-spec-name" placeholder="e.g., Color" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></div><div class="form-group" style="flex: 1;"><label>Value</label><input type="text" class="custom-spec-value" placeholder="e.g., Red" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></div><div class="form-group" style="flex: 0 0 auto; display: flex; align-items: flex-end; padding-bottom: 0;"><button type="button" onclick="removeCustomSpecification('${specId}')" style="padding: 8px 12px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 8px;">✕ Remove</button></div>`;
    container.appendChild(specRow);
}

function removeCustomSpecification(specId) {
    const specRow = document.getElementById(specId);
    if (specRow) specRow.remove();
}

async function handleAddProduct(event) {
    event.preventDefault();
    if (!isAdminLoggedIn) { alert('Only administrators can add products.'); return; }

    const name = document.getElementById('productName').value.trim();
    let brand = document.getElementById('productBrand').value;
    if (brand === 'Other') {
        const customBrand = document.getElementById('customBrandInput').value.trim();
        if (!customBrand) { alert('Please enter a brand name.'); return; }
        brand = customBrand;
    }

    let category = document.getElementById('productCategory').value;
    if (category === 'Other') {
        const customCategory = document.getElementById('customCategoryInput').value.trim();
        if (!customCategory) { alert('Please enter a category name.'); return; }
        category = customCategory;
    }

    const price = parseFloat(document.getElementById('productPrice').value);
    const quantity = parseInt(document.getElementById('productQuantity').value);
    const image = document.getElementById('productImage').value.trim() || 'https://via.placeholder.com/300x200?text=No+Image';
    const description = document.getElementById('productDescription').value.trim();

    const specs = {
        material: document.getElementById('specMaterial').value.trim(),
        weight: document.getElementById('specWeight').value.trim(),
        compatibility: document.getElementById('specCompatibility').value.trim(),
        warranty: document.getElementById('specWarranty').value.trim()
    };

    const customSpecsContainer = document.getElementById('customSpecsContainer');
    if (customSpecsContainer) {
        const customSpecRows = customSpecsContainer.querySelectorAll('.form-row');
        customSpecRows.forEach(row => {
            const nameInput = row.querySelector('.custom-spec-name');
            const valueInput = row.querySelector('.custom-spec-value');
            if (nameInput && valueInput && nameInput.value.trim() && valueInput.value.trim()) {
                const specKey = nameInput.value.trim().toLowerCase().replace(/\s+/g, '');
                specs[specKey] = valueInput.value.trim();
            }
        });
    }

    Object.keys(specs).forEach(key => { if (!specs[key]) delete specs[key]; });

    const productData = { name, brand, category, price, quantity, image, description, specs };

    try {
        await API.addProduct(productData);
        await loadProducts();
        updateBrandDropdowns();
        updateCategoryDropdowns();
        closeAddProductModal();
        alert(`Product "${name}" has been successfully added!`);
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    } catch (error) {
        alert('Error adding product: ' + error.message);
        console.error('Error adding product:', error);
    }
}

function openEditProductModal(productId, evt = null) {
    if (evt) evt.stopPropagation();
    if (!isAdminLoggedIn) { alert('Only administrators can edit products.'); return; }

    const product = products.find(p => p.id === productId);
    if (!product) { alert('Product not found.'); return; }

    editingProductId = productId;
    updateBrandDropdowns();
    updateCategoryDropdowns();

    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductQuantity').value = product.quantity;
    document.getElementById('editProductImage').value = product.image || '';
    document.getElementById('editProductDescription').value = product.description || '';
    document.getElementById('editSpecMaterial').value = (product.specs && product.specs.material) || '';
    document.getElementById('editSpecWeight').value = (product.specs && product.specs.weight) || '';
    document.getElementById('editSpecCompatibility').value = (product.specs && product.specs.compatibility) || '';
    document.getElementById('editSpecWarranty').value = (product.specs && product.specs.warranty) || '';

    setSelectValueForEdit('editProductBrand', 'editCustomBrandInput', product.brand);
    setSelectValueForEdit('editProductCategory', 'editCustomCategoryInput', product.category);

    document.getElementById('editProductModal').classList.remove('hidden');
}

function closeEditProductModal() {
    document.getElementById('editProductModal').classList.add('hidden');
    const form = document.getElementById('editProductForm');
    if (form) form.reset();
    editingProductId = null;
}

function setSelectValueForEdit(selectId, customInputId, value) {
    const select = document.getElementById(selectId);
    const customInput = document.getElementById(customInputId);
    if (!select) return;
    const optionExists = Array.from(select.options).some(option => option.value === value);
    if (optionExists) {
        select.value = value;
        if (customInput) {
            customInput.classList.add('hidden');
            customInput.required = false;
            customInput.value = '';
        }
    } else {
        select.value = 'Other';
        if (customInput) {
            customInput.classList.remove('hidden');
            customInput.required = true;
            customInput.value = value || '';
        }
    }
}

function handleEditBrandSelection() {
    const brandSelect = document.getElementById('editProductBrand');
    const customBrandInput = document.getElementById('editCustomBrandInput');
    if (brandSelect.value === 'Other') {
        customBrandInput.classList.remove('hidden');
        customBrandInput.required = true;
        customBrandInput.focus();
    } else {
        customBrandInput.classList.add('hidden');
        customBrandInput.required = false;
        customBrandInput.value = '';
    }
}

function handleEditCategorySelection() {
    const categorySelect = document.getElementById('editProductCategory');
    const customCategoryInput = document.getElementById('editCustomCategoryInput');
    if (categorySelect.value === 'Other') {
        customCategoryInput.classList.remove('hidden');
        customCategoryInput.required = true;
        customCategoryInput.focus();
    } else {
        customCategoryInput.classList.add('hidden');
        customCategoryInput.required = false;
        customCategoryInput.value = '';
    }
}

async function handleEditProduct(event) {
    event.preventDefault();
    if (!isAdminLoggedIn) { alert('Only administrators can edit products.'); return; }
    if (!editingProductId) { alert('No product selected for editing.'); return; }

    const name = document.getElementById('editProductName').value.trim();
    let brand = document.getElementById('editProductBrand').value;
    if (brand === 'Other') {
        const customBrand = document.getElementById('editCustomBrandInput').value.trim();
        if (!customBrand) { alert('Please enter a brand name.'); return; }
        brand = customBrand;
    }

    let category = document.getElementById('editProductCategory').value;
    if (category === 'Other') {
        const customCategory = document.getElementById('editCustomCategoryInput').value.trim();
        if (!customCategory) { alert('Please enter a category name.'); return; }
        category = customCategory;
    }

    const price = parseFloat(document.getElementById('editProductPrice').value);
    const quantity = parseInt(document.getElementById('editProductQuantity').value);
    const image = document.getElementById('editProductImage').value.trim();
    const description = document.getElementById('editProductDescription').value.trim();

    const specs = {
        material: document.getElementById('editSpecMaterial').value.trim(),
        weight: document.getElementById('editSpecWeight').value.trim(),
        compatibility: document.getElementById('editSpecCompatibility').value.trim(),
        warranty: document.getElementById('editSpecWarranty').value.trim()
    };

    Object.keys(specs).forEach(key => { if (!specs[key]) delete specs[key]; });

    const productData = { id: editingProductId, name, brand, category, price, quantity, image, description, specs };

    try {
        await API.editProduct(productData);
        await loadProducts();
        updateBrandDropdowns();
        updateCategoryDropdowns();
        closeEditProductModal();
        alert(`Product "${name}" has been successfully updated!`);
    } catch (error) {
        alert('Error updating product: ' + error.message);
        console.error('Error updating product:', error);
    }
}

async function confirmDeleteProduct(productId, evt = null) {
    if (evt) evt.stopPropagation();
    if (!isAdminLoggedIn) { alert('Only administrators can delete products.'); return; }

    const product = products.find(p => p.id === productId);
    if (!product) { alert('Product not found.'); return; }

    const confirmed = confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
        await API.deleteProduct(productId);
        await loadProducts();
        alert(`Product "${product.name}" has been deleted.`);
    } catch (error) {
        alert('Error deleting product: ' + (error.message || 'Unknown error'));
        console.error('Error deleting product:', error);
    }
}

function getUniqueBrands() {
    const brands = new Set();
    products.forEach(product => { if (product.brand) brands.add(product.brand); });
    return Array.from(brands).sort();
}

function getUniqueCategories() {
    const categories = new Set();
    products.forEach(product => { if (product.category) categories.add(product.category); });
    return Array.from(categories).sort();
}

function formatCategoryName(category) {
    const categoryMap = { 'engine': 'Engine Parts', 'brake': 'Brake Systems', 'tire': 'Tires', 'exhaust': 'Exhaust Systems', 'suspension': 'Suspension', 'accessories': 'Accessories' };
    if (categoryMap[category]) return categoryMap[category];
    return category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
}

function updateBrandDropdowns() {
    const uniqueBrands = getUniqueBrands();
    const defaultBrands = ['Honda', 'Yamaha'];
    const allBrands = new Set([...defaultBrands, ...uniqueBrands]);
    const sortedBrands = Array.from(allBrands).sort();

    ['productBrand', 'editProductBrand', 'brandFilter', 'navBrandFilter'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentValue = select.value;
        const isFilter = id === 'brandFilter' || id === 'navBrandFilter';
        select.innerHTML = isFilter ? '<option value="">All Brands</option>' : '<option value="">Select Brand</option>';
        sortedBrands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            select.appendChild(option);
        });
        if (!isFilter) {
            const otherOption = document.createElement('option');
            otherOption.value = 'Other';
            otherOption.textContent = 'Other';
            select.appendChild(otherOption);
        }
        if (currentValue && sortedBrands.includes(currentValue)) select.value = currentValue;
    });
}

function updateCategoryDropdowns() {
    const uniqueCategories = getUniqueCategories();
    const defaultCategories = ['engine', 'brake', 'tire', 'exhaust', 'suspension', 'accessories'];
    const allCategories = new Set([...defaultCategories, ...uniqueCategories]);
    const sortedCategories = Array.from(allCategories).sort();

    ['productCategory', 'editProductCategory', 'categoryFilter', 'navCategoryFilter'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentValue = select.value;
        const isFilter = id === 'categoryFilter' || id === 'navCategoryFilter';
        select.innerHTML = isFilter ? '<option value="">All Categories</option>' : '<option value="">Select Category</option>';
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = formatCategoryName(category);
            select.appendChild(option);
        });
        if (!isFilter) {
            const otherOption = document.createElement('option');
            otherOption.value = 'Other';
            otherOption.textContent = 'Other';
            select.appendChild(otherOption);
        }
        if (currentValue && sortedCategories.includes(currentValue)) select.value = currentValue;
    });
}

function handleNavFilterChange(filterType) {
    const filterMap = {
        category: { main: 'categoryFilter', nav: 'navCategoryFilter' },
        price: { main: 'priceFilter', nav: 'navPriceFilter' },
        brand: { main: 'brandFilter', nav: 'navBrandFilter' }
    };

    const mapping = filterMap[filterType];
    if (!mapping) return;

    const navSelect = document.getElementById(mapping.nav);
    const mainSelect = document.getElementById(mapping.main);

    if (navSelect) {
        if (mainSelect) {
            mainSelect.value = navSelect.value;
        }
        applyFilters();
    }
}

function syncNavFiltersFromMain() {
    const filters = [
        { main: 'categoryFilter', nav: 'navCategoryFilter' },
        { main: 'priceFilter', nav: 'navPriceFilter' },
        { main: 'brandFilter', nav: 'navBrandFilter' }
    ];

    filters.forEach(({ main, nav }) => {
        const mainSelect = document.getElementById(main);
        const navSelect = document.getElementById(nav);
        if (mainSelect && navSelect) {
            navSelect.value = mainSelect.value;
        }
    });
}

function goToLandingPage() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const navSearchInput = document.getElementById('navSearchInput');
    if (navSearchInput) navSearchInput.value = '';
    searchTerm = '';
    const categoryFilter = document.getElementById('categoryFilter');
    const priceFilter = document.getElementById('priceFilter');
    const brandFilter = document.getElementById('brandFilter');
    if (categoryFilter) categoryFilter.value = '';
    if (priceFilter) priceFilter.value = '';
    if (brandFilter) brandFilter.value = '';
    const navCategoryFilter = document.getElementById('navCategoryFilter');
    const navPriceFilter = document.getElementById('navPriceFilter');
    const navBrandFilter = document.getElementById('navBrandFilter');
    if (navCategoryFilter) navCategoryFilter.value = '';
    if (navPriceFilter) navPriceFilter.value = '';
    if (navBrandFilter) navBrandFilter.value = '';
    selectedProducts.clear();
    updateCompareCount();
    hideComparison();
    filteredProducts = [...products];
    renderProducts(products);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToProducts() {
    const section = document.querySelector('.products-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}


async function resetData() {
    if (confirm('Are you sure you want to reset all data? This will delete all current products, sales history, and analytics, and restore the default data. This action cannot be undone.')) {
        localStorage.removeItem('motorShopProducts_v1');
        localStorage.removeItem('salesHistory');
        localStorage.removeItem('productMovements');
        localStorage.removeItem('productAnalytics');
        alert('Data has been reset to defaults. The page will now reload.');
        window.location.reload();
    }
}

window.onclick = function (event) {
    const loginModal = document.getElementById('loginModal');
    const addProductModal = document.getElementById('addProductModal');
    const editProductModal = document.getElementById('editProductModal');
    if (event.target === loginModal) closeLoginModal();
    if (event.target === addProductModal) closeAddProductModal();
    if (event.target === editProductModal) closeEditProductModal();
}
