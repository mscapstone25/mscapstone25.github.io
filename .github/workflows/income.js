// Get sales history from localStorage
let salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
let currentPeriod = 'day';
let incomeChart = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    switchPeriod('day');
    
    // Listen for storage changes to update data when sales are recorded from other tabs/pages
    window.addEventListener('storage', function(e) {
        if (e.key === 'salesHistory') {
            updateIncomeData();
        }
    });
    
    // Listen for custom salesUpdated event (from same tab)
    window.addEventListener('salesUpdated', function() {
        updateIncomeData();
    });
    
    // Also reload data when page becomes visible (user switches back to this tab)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            updateIncomeData();
        }
    });
});

// Switch between time periods
function switchPeriod(period) {
    currentPeriod = period;
    
    // Update active button
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(period + 'Btn').classList.add('active');
    
    // Update data
    updateIncomeData();
}

// Update income data based on current period
function updateIncomeData() {
    // Reload sales history from localStorage to get latest data
    salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    
    const now = new Date();
    let startDate;
    
    switch(currentPeriod) {
        case 'day':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            const dayOfWeek = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
    }
    
    // Filter sales by period
    const filteredSales = salesHistory.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate;
    });
    
    // Calculate totals
    const totalIncome = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const avgSale = filteredSales.length > 0 ? totalIncome / filteredSales.length : 0;
    
    // Update summary cards
    document.getElementById('totalIncome').textContent = `₱${totalIncome.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('totalSales').textContent = totalSales;
    document.getElementById('avgSale').textContent = `₱${avgSale.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    // Update chart
    updateChart(filteredSales, startDate, now);
    
    // Update sales table
    updateSalesTable(filteredSales);
}

// Update chart
function updateChart(sales, startDate, endDate) {
    const ctx = document.getElementById('incomeChart').getContext('2d');
    
    // Prepare data based on period
    let labels = [];
    let data = [];
    
    if (currentPeriod === 'day') {
        // Hourly data for today
        for (let i = 0; i < 24; i++) {
            labels.push(`${i}:00`);
            const hourStart = new Date(startDate);
            hourStart.setHours(i, 0, 0, 0);
            const hourEnd = new Date(hourStart);
            hourEnd.setHours(i + 1, 0, 0, 0);
            
            const hourSales = sales.filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate >= hourStart && saleDate < hourEnd;
            });
            data.push(hourSales.reduce((sum, s) => sum + s.total, 0));
        }
    } else if (currentPeriod === 'week') {
        // Daily data for week
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(startDate);
            dayDate.setDate(startDate.getDate() + i);
            labels.push(days[dayDate.getDay()]);
            
            const dayStart = new Date(dayDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayDate);
            dayEnd.setHours(23, 59, 59, 999);
            
            const daySales = sales.filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate >= dayStart && saleDate <= dayEnd;
            });
            data.push(daySales.reduce((sum, s) => sum + s.total, 0));
        }
    } else if (currentPeriod === 'month') {
        // Daily data for month
        const daysInMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            labels.push(i.toString());
            const dayStart = new Date(startDate.getFullYear(), startDate.getMonth(), i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);
            
            const daySales = sales.filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate >= dayStart && saleDate <= dayEnd;
            });
            data.push(daySales.reduce((sum, s) => sum + s.total, 0));
        }
    }
    
    // Destroy existing chart if it exists
    if (incomeChart) {
        incomeChart.destroy();
    }
    
    // Create new chart
    incomeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Income (₱)',
                data: data,
                borderColor: '#457b9d',
                backgroundColor: 'rgba(69, 123, 157, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: `Income Over ${currentPeriod === 'day' ? 'Today' : currentPeriod === 'week' ? 'This Week' : 'This Month'}`,
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
                    callback: function(value) {
                        return '₱' + value.toLocaleString();
                    }
                    }
                }
            }
        }
    });
}

// Update sales table
function updateSalesTable(sales) {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';
    
    // Sort by date (newest first)
    const sortedSales = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (sortedSales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No sales data available</td></tr>';
        return;
    }
    
    sortedSales.forEach(sale => {
        const row = document.createElement('tr');
        const date = new Date(sale.date);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        row.innerHTML = `
            <td>${dateStr}</td>
            <td>${sale.productName}</td>
            <td>${sale.quantity}</td>
            <td>₱${sale.price.toLocaleString()}</td>
            <td><strong>₱${sale.total.toLocaleString()}</strong></td>
        `;
        tbody.appendChild(row);
    });
}

