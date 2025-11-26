// API Configuration
const API_BASE_URL = 'api';

// API Helper Functions
const API = {
    // Get all products
    async getProducts() {
        // Try to get from localStorage first to preserve user edits
        const savedProducts = localStorage.getItem('allProducts');
        if (savedProducts) {
            const parsedProducts = JSON.parse(savedProducts);
            // Only return if we actually have products, otherwise try to load defaults
            if (parsedProducts.length > 0) {
                return parsedProducts;
            }
        }

        // If no local data, try to fetch from products.json (static data)
        try {
            const response = await fetch('products.json');
            const data = await response.json();
            if (data.success) {
                // Initialize localStorage
                localStorage.setItem('allProducts', JSON.stringify(data.products));
                return data.products;
            }
        } catch (error) {
            console.error('Error loading initial products:', error);
        }

        // Fallback to API if needed (though likely unused in static mode)
        try {
            const response = await fetch(`${API_BASE_URL}/products.json`);
            const data = await response.json();
            if (data.success) {
                return data.products;
            }
        } catch (error) {
            console.error('Error fetching products from API:', error);
        }

        return [];
    },

    // Add new product
    async addProduct(productData) {
        try {
            // Try API first
            const response = await fetch(`${API_BASE_URL}/products.json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            const data = await response.json();
            if (data.success) {
                return data;
            } else {
                throw new Error(data.error || 'Failed to add product');
            }
        } catch (error) {
            console.error('Error adding product:', error);

            // Fallback to localStorage
            try {
                const savedProducts = JSON.parse(localStorage.getItem('allProducts') || '[]');
                // Generate a new ID (max id + 1)
                const newId = savedProducts.reduce((max, p) => Math.max(max, p.id || 0), 0) + 1;
                const newProduct = { ...productData, id: newId };

                savedProducts.push(newProduct);
                localStorage.setItem('allProducts', JSON.stringify(savedProducts));

                console.log('Added product to localStorage as fallback');
                return { success: true, message: 'Product added locally (backend unavailable)', product: newProduct };
            } catch (fallbackError) {
                throw new Error('Failed to add product locally.');
            }
        }
    },

    // Update product (inventory)
    async updateProduct(productId, quantity) {
        try {
            const response = await fetch(`${API_BASE_URL}/products.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: productId, quantity: quantity })
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success) {
                return data;
            } else {
                throw new Error(data.error || 'Failed to update product');
            }
        } catch (error) {
            console.error('Error updating product:', error);

            // Fallback to localStorage
            try {
                const savedProducts = JSON.parse(localStorage.getItem('allProducts') || '[]');
                const productIndex = savedProducts.findIndex(p => p.id === productId);

                if (productIndex !== -1) {
                    savedProducts[productIndex].quantity = quantity;
                    localStorage.setItem('allProducts', JSON.stringify(savedProducts));
                    console.log('Updated product in localStorage as fallback');
                    return { success: true, message: 'Updated locally (backend unavailable)' };
                } else {
                    throw new Error('Product not found');
                }
            } catch (fallbackError) {
                throw new Error(error.message || 'Failed to update inventory.');
            }
        }
    },

    // Edit full product details (admin)
    async editProduct(productData) {
        try {
            const payload = { ...productData, fullUpdate: true };
            const response = await fetch(`${API_BASE_URL}/products.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success) {
                return data;
            } else {
                throw new Error(data.error || 'Failed to update product');
            }
        } catch (error) {
            console.error('Error editing product:', error);

            // Fallback to localStorage
            try {
                const savedProducts = JSON.parse(localStorage.getItem('allProducts') || '[]');
                const productIndex = savedProducts.findIndex(p => p.id === productData.id);

                if (productIndex !== -1) {
                    savedProducts[productIndex] = { ...savedProducts[productIndex], ...productData };
                    localStorage.setItem('allProducts', JSON.stringify(savedProducts));
                    return { success: true, message: 'Product updated locally' };
                } else {
                    throw new Error('Product not found locally');
                }
            } catch (fallbackError) {
                throw error;
            }
        }
    },

    // Delete product (admin)
    async deleteProduct(productId) {
        try {
            const response = await fetch(`${API_BASE_URL}/products.json`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: productId })
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success) {
                return data;
            } else {
                throw new Error(data.error || 'Failed to delete product');
            }
        } catch (error) {
            console.error('Error deleting product:', error);

            // Fallback to localStorage
            try {
                const savedProducts = JSON.parse(localStorage.getItem('allProducts') || '[]');
                const newProducts = savedProducts.filter(p => p.id !== productId);

                if (savedProducts.length === newProducts.length) {
                    throw new Error('Product not found locally');
                }

                localStorage.setItem('allProducts', JSON.stringify(newProducts));
                return { success: true, message: 'Product deleted locally' };
            } catch (fallbackError) {
                throw error;
            }
        }
    },

    // Get sales history
    async getSalesHistory() {
        try {
            const response = await fetch(`${API_BASE_URL}/sales.php`);
            const data = await response.json();
            if (data.success) {
                return data.sales;
            } else {
                throw new Error(data.error || 'Failed to fetch sales history');
            }
        } catch (error) {
            console.error('Error fetching sales history:', error);
            // Fallback to localStorage
            return JSON.parse(localStorage.getItem('salesHistory')) || [];
        }
    },

    // Get product movements
    async getProductMovements() {
        try {
            const response = await fetch(`${API_BASE_URL}/movements.php`);
            const data = await response.json();
            if (data.success) {
                return data.movements;
            } else {
                throw new Error(data.error || 'Failed to fetch product movements');
            }
        } catch (error) {
            console.error('Error fetching product movements:', error);
            // Fallback to localStorage
            return JSON.parse(localStorage.getItem('productMovements')) || {};
        }
    },

    // Record a sale
    async recordSale(saleData) {
        try {
            const response = await fetch(`${API_BASE_URL}/sales.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saleData)
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success) {
                // Also save to localStorage for consistency
                const salesHistory = JSON.parse(localStorage.getItem('salesHistory') || '[]');
                salesHistory.push(saleData);
                localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
                return data;
            } else {
                throw new Error(data.error || 'Failed to record sale');
            }
        } catch (error) {
            console.error('Error recording sale:', error);

            // Fallback to localStorage
            try {
                const salesHistory = JSON.parse(localStorage.getItem('salesHistory') || '[]');
                salesHistory.push(saleData);
                localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
                console.log('Recorded sale in localStorage as fallback');
                return { success: true, message: 'Sale recorded locally (backend unavailable)' };
            } catch (fallbackError) {
                throw new Error(error.message || 'Failed to record sale.');
            }
        }
    }
};
