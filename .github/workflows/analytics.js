// Get data from localStorage
let salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
let productMovements = JSON.parse(localStorage.getItem('productMovements')) || {};

// Get products from main script (we'll need to load it or define here)
// For now, we'll get it from localStorage or define a reference
let products = [];

// Load products from localStorage if available, otherwise use sample data
try {
    // Try to get from main page's script
    if (typeof window.products !== 'undefined') {
        products = window.products;
    } else {
        // Fallback: load from a shared source or use sample
        // For now, we'll reconstruct from sales history and movements
        products = JSON.parse(localStorage.getItem('products')) || [];
    }
} catch(e) {
    console.log('Products not found, will use sales data only');
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Analytics page loaded');
    
    // Small delay to ensure all DOM elements are ready
    setTimeout(function() {
        // Load products and sales data from localStorage (or use samples)
        loadProducts();
        refreshSalesData();
        
        console.log('Products loaded:', products.length);
        console.log('Sales history loaded:', salesHistory.length);
        
        displayAnalytics();
    }, 100);
    
    // Listen for sales updates to refresh analytics automatically
    window.addEventListener('salesUpdated', function() {
        console.log('Sales updated event received, refreshing analytics...');
        refreshSalesData();
        loadProducts();
        displayAnalytics();
    });
    
    // Also listen for storage changes (in case data is updated in another tab)
    window.addEventListener('storage', function(e) {
        if (e.key === 'salesHistory' || e.key === 'allProducts') {
            console.log('Storage updated, refreshing analytics...');
            refreshSalesData();
            loadProducts();
            displayAnalytics();
        }
    });
    
    // Refresh when page becomes visible (user navigates back to this tab)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('Page became visible, refreshing analytics...');
            refreshSalesData();
            loadProducts();
            displayAnalytics();
        }
    });
    
    // Also refresh on focus (when user clicks on the tab/window)
    window.addEventListener('focus', function() {
        console.log('Window focused, refreshing analytics...');
        refreshSalesData();
        loadProducts();
        displayAnalytics();
    });
});

// Sample sales data for demonstration
const sampleSalesHistory = [
    { date: new Date().toISOString(), productId: 1, productName: 'Honda CB150R Exhaust Pipe', quantity: 15, price: 3500, total: 52500 },
    { date: new Date().toISOString(), productId: 1, productName: 'Honda CB150R Exhaust Pipe', quantity: 8, price: 3500, total: 28000 },
    { date: new Date().toISOString(), productId: 2, productName: 'Yamaha R15 Brake Pad Set', quantity: 12, price: 1200, total: 14400 },
    { date: new Date().toISOString(), productId: 2, productName: 'Yamaha R15 Brake Pad Set', quantity: 10, price: 1200, total: 12000 },
    { date: new Date().toISOString(), productId: 2, productName: 'Yamaha R15 Brake Pad Set', quantity: 5, price: 1200, total: 6000 },
    { date: new Date().toISOString(), productId: 3, productName: 'Honda PCX160 Engine Oil Filter', quantity: 20, price: 450, total: 9000 },
    { date: new Date().toISOString(), productId: 3, productName: 'Honda PCX160 Engine Oil Filter', quantity: 15, price: 450, total: 6750 },
    { date: new Date().toISOString(), productId: 4, productName: 'Yamaha MT-15 LED Headlight', quantity: 3, price: 5500, total: 16500 },
    { date: new Date().toISOString(), productId: 5, productName: 'Honda Click 125i Air Filter', quantity: 25, price: 350, total: 8750 },
    { date: new Date().toISOString(), productId: 5, productName: 'Honda Click 125i Air Filter', quantity: 18, price: 350, total: 6300 },
    { date: new Date().toISOString(), productId: 6, productName: 'Yamaha NMAX Suspension Kit', quantity: 2, price: 8500, total: 17000 },
    { date: new Date().toISOString(), productId: 7, productName: 'Honda Grom Handlebar Grips', quantity: 1, price: 800, total: 800 }
];

// Sample products data for demonstration
const sampleProducts = [
    { id: 1, name: 'Honda CB150R Exhaust Pipe', brand: 'Honda', category: 'exhaust', price: 3500, quantity: 3 },
    { id: 2, name: 'Yamaha R15 Brake Pad Set', brand: 'Yamaha', category: 'brake', price: 1200, quantity: 45 },
    { id: 3, name: 'Honda PCX160 Engine Oil Filter', brand: 'Honda', category: 'engine', price: 450, quantity: 8 },
    { id: 4, name: 'Yamaha MT-15 LED Headlight', brand: 'Yamaha', category: 'accessories', price: 5500, quantity: 12 },
    { id: 5, name: 'Honda Click 125i Air Filter', brand: 'Honda', category: 'engine', price: 350, quantity: 52 },
    { id: 6, name: 'Yamaha NMAX Suspension Kit', brand: 'Yamaha', category: 'suspension', price: 8500, quantity: 15 },
    { id: 7, name: 'Honda Grom Handlebar Grips', brand: 'Honda', category: 'accessories', price: 800, quantity: 1 },
    { id: 8, name: 'Yamaha R3 Racing Chain', brand: 'Yamaha', category: 'engine', price: 3200, quantity: 5 },
    { id: 9, name: 'Honda CRF250L Tire Set', brand: 'Honda', category: 'tire', price: 6500, quantity: 22 },
    { id: 10, name: 'Yamaha XSR700 Seat Cover', brand: 'Yamaha', category: 'accessories', price: 2800, quantity: 18 }
];

// Refresh sales data from localStorage
function refreshSalesData() {
    try {
        const savedSales = localStorage.getItem('salesHistory');
        if (savedSales) {
            const parsed = JSON.parse(savedSales);
            if (parsed.length > 0) {
                salesHistory = parsed;
                console.log('Sales history loaded:', salesHistory.length, 'sales');
                return;
            }
        }
        // Use sample data if no real data exists
        salesHistory = sampleSalesHistory;
        console.log('Using sample sales data for demonstration');
    } catch (e) {
        console.error('Error loading sales history:', e);
        salesHistory = sampleSalesHistory;
    }
}

// Manual refresh function for the refresh button
function refreshAnalytics() {
    console.log('Manual refresh triggered');
    refreshSalesData();
    loadProducts();
    displayAnalytics();
    
    // Show a brief feedback
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '✓ Refreshed';
        refreshBtn.disabled = true;
        setTimeout(() => {
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        }, 1000);
    }
}

// Load products - try to get from main page
function loadProducts() {
    // Try to get products from localStorage
    const savedProducts = localStorage.getItem('allProducts');
    if (savedProducts) {
        try {
            const parsed = JSON.parse(savedProducts);
            if (parsed.length > 0) {
                products = parsed;
                console.log('Products loaded from localStorage:', products.length);
                return;
            }
        } catch (e) {
            console.error('Error parsing products:', e);
        }
    }
    
    // Use sample products if no real data exists
    products = sampleProducts;
    console.log('Using sample products for demonstration');
}

// Display all analytics
function displayAnalytics() {
    displayLowStockItems();
    displayFastMovingItems();
    displaySlowMovingItems();
    displaySalesChart();
}

// Display low stock items - automatically detected from product inventory
function displayLowStockItems() {
    const container = document.getElementById('lowStockItems');
    if (!container) return;
    
    const lowStockThreshold = 10; // Items with stock <= 10
    
    // Make sure products are loaded (use sample if needed)
    if (products.length === 0) {
        loadProducts();
    }
    
    // Use products array (which may contain sample data)
    if (products.length > 0) {
        const lowStock = products.filter(p => (p.quantity || 0) <= lowStockThreshold);
        
        if (lowStock.length === 0) {
            container.innerHTML = '<p class="no-data">No low stock items found. All products are well stocked!</p>';
            return;
        }
        
        // Sort by quantity (lowest first) to show most critical items
        lowStock.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
        
        container.innerHTML = lowStock.map(product => `
            <div class="item-card low-stock-card">
                <div class="item-info">
                    <h3>${product.name}</h3>
                    <p class="item-detail">Brand: ${product.brand || 'N/A'}</p>
                    <p class="item-detail">Current Stock: <strong>${product.quantity || 0}</strong> units</p>
                    <p class="item-detail">Price: ₱${(product.price || 0).toLocaleString()}</p>
                </div>
                <div class="item-action">
                    <span class="stock-badge low">${product.quantity || 0} left</span>
                </div>
            </div>
        `).join('');
        return;
    }
    
    // Fallback: Get products with low stock from available data
    const lowStockProducts = [];
    
    // Try to get product data from various sources
    Object.keys(productMovements).forEach(productId => {
        const movement = productMovements[productId];
        const sales = salesHistory.filter(s => s.productId == productId);
        
        if (sales.length > 0) {
            const lastSale = sales[sales.length - 1];
            lowStockProducts.push({
                id: productId,
                name: lastSale.productName,
                quantity: 0, // Would come from actual product data
                price: lastSale.price
            });
        }
    });
    
    // For demo, we'll show items that need attention
    if (lowStockProducts.length === 0) {
        container.innerHTML = '<p class="no-data">No low stock items found. All products are well stocked!</p>';
        return;
    }
    
    container.innerHTML = lowStockProducts.map(product => `
        <div class="item-card low-stock-card">
            <div class="item-info">
                <h3>${product.name}</h3>
                <p class="item-detail">Product ID: ${product.id}</p>
                <p class="item-detail">Price: $${product.price.toLocaleString()}</p>
            </div>
            <div class="item-action">
                <span class="stock-badge low">Low Stock</span>
            </div>
        </div>
    `).join('');
}

// Display fast moving items - automatically detected from sales/orders
function displayFastMovingItems() {
    const container = document.getElementById('fastMovingItems');
    if (!container) return;
    
    // Make sure sales history is loaded (use sample if needed)
    if (salesHistory.length === 0) {
        refreshSalesData();
    }
    
    console.log('Displaying fast moving items. Sales history:', salesHistory);
    
    // Calculate sales per product from order/sales data
    const productSales = {};
    
    salesHistory.forEach(sale => {
        const productId = sale.productId;
        if (!productSales[productId]) {
            productSales[productId] = {
                id: productId,
                name: sale.productName || 'Unknown Product',
                totalSold: 0,
                totalRevenue: 0,
                price: sale.price || 0
            };
        }
        productSales[productId].totalSold += sale.quantity || 0;
        productSales[productId].totalRevenue += sale.total || (sale.price || 0) * (sale.quantity || 0);
    });
    
    // Sort by total sold (descending) - products with highest sales volume
    const sortedProducts = Object.values(productSales)
        .filter(p => p.totalSold > 0) // Only show products that have been sold
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 5); // Top 5
    
    console.log('Fast moving products:', sortedProducts);
    
    if (sortedProducts.length === 0) {
        container.innerHTML = '<p class="no-data">No sales data available yet. Fast moving items will appear here once orders are made.</p>';
        return;
    }
    
    container.innerHTML = sortedProducts.map((product, index) => `
        <div class="item-card fast-moving-card">
            <div class="rank-badge">#${index + 1}</div>
            <div class="item-info">
                <h3>${product.name}</h3>
                <p class="item-detail">Total Sold: <strong>${product.totalSold}</strong> units</p>
                <p class="item-detail">Total Revenue: <strong>₱${product.totalRevenue.toLocaleString()}</strong></p>
            </div>
            <div class="item-action">
                <span class="stock-badge fast">Fast Moving</span>
            </div>
        </div>
    `).join('');
}

// Display slow moving items
function displaySlowMovingItems() {
    const container = document.getElementById('slowMovingItems');
    if (!container) return;
    
    // Make sure sales history and products are loaded (use sample if needed)
    if (salesHistory.length === 0) {
        refreshSalesData();
    }
    if (products.length === 0) {
        loadProducts();
    }
    
    // Calculate sales per product from sales history
    const productSales = {};
    
    salesHistory.forEach(sale => {
        const productId = sale.productId;
        if (!productSales[productId]) {
            productSales[productId] = {
                id: productId,
                name: sale.productName || 'Unknown Product',
                totalSold: 0,
                totalRevenue: 0,
                price: sale.price || 0
            };
        }
        productSales[productId].totalSold += sale.quantity || 0;
        productSales[productId].totalRevenue += sale.total || (sale.price || 0) * (sale.quantity || 0);
    });
    
    // Include all products (even those with no sales) for slow moving detection
    if (products.length > 0) {
        products.forEach(product => {
            if (!productSales[product.id]) {
                productSales[product.id] = {
                    id: product.id,
                    name: product.name,
                    totalSold: 0,
                    totalRevenue: 0,
                    price: product.price || 0
                };
            }
        });
    }
    
    // Sort by total sold (ascending) - get items with lowest sales
    const sortedProducts = Object.values(productSales)
        .sort((a, b) => a.totalSold - b.totalSold)
        .slice(0, 5); // Bottom 5
    
    if (sortedProducts.length === 0) {
        container.innerHTML = '<p class="no-data">No products available for analysis.</p>';
        return;
    }
    
    container.innerHTML = sortedProducts.map((product, index) => `
        <div class="item-card slow-moving-card">
            <div class="rank-badge slow">#${index + 1}</div>
            <div class="item-info">
                <h3>${product.name}</h3>
                <p class="item-detail">Total Sold: <strong>${product.totalSold}</strong> units</p>
                <p class="item-detail">Total Revenue: <strong>₱${product.totalRevenue.toLocaleString()}</strong></p>
            </div>
            <div class="item-action">
                <span class="stock-badge slow">Slow Moving</span>
            </div>
        </div>
    `).join('');
}

// Display sales chart - automatically shows top selling products from orders
function displaySalesChart() {
    const chartContainer = document.getElementById('salesChart');
    if (!chartContainer) return;
    
    // Make sure sales history is loaded (use sample if needed)
    if (salesHistory.length === 0) {
        refreshSalesData();
    }
    
    // Calculate sales per product from order/sales data
    const productSales = {};
    
    salesHistory.forEach(sale => {
        const productId = sale.productId;
        if (!productSales[productId]) {
            productSales[productId] = {
                name: sale.productName || 'Unknown Product',
                totalSold: 0
            };
        }
        productSales[productId].totalSold += sale.quantity || 0;
    });
    
    // Get top 10 products (automatically detected from sales)
    const topProducts = Object.values(productSales)
        .filter(p => p.totalSold > 0) // Only products that have been sold
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 10);
    
    if (topProducts.length === 0) {
        chartContainer.parentElement.innerHTML = '<p class="no-data">No sales data available for chart. Top selling products will appear here once orders are made.</p>';
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.salesChartInstance) {
        window.salesChartInstance.destroy();
    }
    
    const ctx = chartContainer.getContext('2d');
    const labels = topProducts.map(p => p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name);
    const data = topProducts.map(p => p.totalSold);
    
    window.salesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Units Sold',
                data: data,
                backgroundColor: [
                    '#457b9d',
                    '#e63946',
                    '#f1faee',
                    '#a8dadc',
                    '#1d3557',
                    '#ffb703',
                    '#fb8500',
                    '#023047',
                    '#219ebc',
                    '#8ecae6'
                ],
                borderColor: '#1d3557',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Top 10 Selling Products (Auto-detected from Orders)',
                    font: {
                        size: 18,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Also check for low stock from actual product data
// This function would be called if we have access to the products array
function checkLowStockFromProducts() {
    if (products.length === 0) return;
    
    const lowStockThreshold = 10;
    const lowStock = products.filter(p => p.quantity <= lowStockThreshold);
    
    const container = document.getElementById('lowStockItems');
    
    if (lowStock.length === 0) {
        container.innerHTML = '<p class="no-data">No low stock items found. All products are well stocked!</p>';
        return;
    }
    
    container.innerHTML = lowStock.map(product => `
        <div class="item-card low-stock-card">
            <div class="item-info">
                <h3>${product.name}</h3>
                <p class="item-detail">Brand: ${product.brand}</p>
                <p class="item-detail">Current Stock: <strong>${product.quantity}</strong> units</p>
                <p class="item-detail">Price: $${product.price.toLocaleString()}</p>
            </div>
            <div class="item-action">
                <span class="stock-badge low">${product.quantity} left</span>
            </div>
        </div>
    `).join('');
}

// Try to load products from the main page's script
// This is a workaround since we can't directly access variables from another page
// In production, this data would come from a shared API/database
window.addEventListener('load', function() {
    console.log('Window load event - refreshing analytics');
    // Make sure we have data (use samples if needed)
    loadProducts();
    refreshSalesData();
    displayAnalytics();
});

