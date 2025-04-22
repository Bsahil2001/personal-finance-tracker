// Personal Finance Tracker v3 - Main JavaScript
console.log("Script.js loaded - v3 SQLite version");

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded");
    
    // Define categories
    const categories = {
        income: [
            'Salary',
            'Freelance',
            'Investment',
            'Gift',
            'Refund',
            'Other Income'
        ],
        expense: [
            'Food & Dining',
            'Housing',
            'Transportation',
            'Utilities',
            'Entertainment',
            'Shopping',
            'Healthcare',
            'Education',
            'Personal Care',
            'Travel',
            'Gifts & Donations',
            'Other Expense'
        ]
    };
    
    // Initialize date field with today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Set up category dropdown based on transaction type
    const transactionTypeSelect = document.getElementById('transaction-type');
    const categorySelect = document.getElementById('category');
    const filterCategorySelect = document.getElementById('filter-category');
    
    // Populate category dropdowns (both form and filters)
    function populateCategories(type, categoryElement) {
        // Clear existing options
        categoryElement.innerHTML = '';
        
        // Add new options based on type
        const categoryList = type === 'all' ? [...categories.income, ...categories.expense] : categories[type];
        
        categoryList.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryElement.appendChild(option);
        });
    }
    
    // Initialize form categories (default to income)
    populateCategories('income', categorySelect);
    
    // Initialize filter categories (include all categories)
    populateAllCategories();
    
    // Function to populate all categories in the filter dropdown
    function populateAllCategories() {
        // Add all categories to the filter dropdown
        const allCategories = [...new Set([...categories.income, ...categories.expense])];
        
        // Clear existing options except the "All" option
        while (filterCategorySelect.children.length > 1) {
            filterCategorySelect.removeChild(filterCategorySelect.lastChild);
        }
        
        // Add categories
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filterCategorySelect.appendChild(option);
        });
    }
    
    // Update categories when transaction type changes
    if (transactionTypeSelect) {
        transactionTypeSelect.addEventListener('change', function() {
            const type = this.value;
            populateCategories(type, categorySelect);
        });
    }
    
    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const chartContainers = document.querySelectorAll('.chart-container');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and containers
            tabButtons.forEach(btn => btn.classList.remove('active'));
            chartContainers.forEach(container => container.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding container
            const tabId = this.getAttribute('data-tab');
            document.getElementById(`${tabId}-chart-container`).classList.add('active');
        });
    });
    
    // Theme toggle functionality
    const themeToggleBtn = document.getElementById('toggle-theme-btn');
    const themeIcon = themeToggleBtn.querySelector('i');
    
    themeToggleBtn.addEventListener('click', function() {
        document.body.classList.toggle('dark-theme');
        
        if (document.body.classList.contains('dark-theme')) {
            themeIcon.textContent = 'light_mode';
            localStorage.setItem('dark-theme', 'true');
        } else {
            themeIcon.textContent = 'dark_mode';
            localStorage.setItem('dark-theme', 'false');
        }
    });
    
    // Check for saved theme preference
    if (localStorage.getItem('dark-theme') === 'true') {
        document.body.classList.add('dark-theme');
        themeIcon.textContent = 'light_mode';
    }
    
    // Load transactions when page loads
    loadTransactions();
    loadSummary();
    
    // Form submission handler
    const form = document.getElementById('transaction-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const title = document.getElementById('title').value;
            let amount = parseFloat(document.getElementById('amount').value);
            const transactionType = document.getElementById('transaction-type').value;
            const category = document.getElementById('category').value;
            const date = document.getElementById('date').value;
            
            // Validate inputs
            if (!title || isNaN(amount) || !date) {
                showFormStatus('Please fill in all required fields', 'error');
                return;
            }
            
            // Convert amount to positive or negative based on transaction type
            if (transactionType === 'expense') {
                amount = -Math.abs(amount); // Ensure it's negative for expenses
            } else {
                amount = Math.abs(amount); // Ensure it's positive for income
            }
            
            // Create transaction object
            const transaction = {
                title: title,
                amount: amount,
                type: transactionType,
                category: category,
                date: date
            };
            
            console.log("Saving transaction:", transaction);
            
            // Send to backend
            saveTransaction(transaction);
        });
    }
    
    // Set up filter application
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            const filters = getFilterParameters();
            console.log("Applying filters:", filters);
            loadTransactions(filters);
            loadSummary(filters);
        });
    }
    
    // Set up filter clearing
    const clearFiltersBtn = document.getElementById('clear-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            clearFilters();
            loadTransactions();
            loadSummary();
        });
    }
    
    // Setup Edit/Delete Modal functionality
    setupModalFunctionality();
    
    // Setup transaction action buttons (Edit/Delete)
    setupTransactionActions();
});

// Function to show form status messages
function showFormStatus(message, type) {
    const formStatus = document.getElementById('form-status');
    formStatus.textContent = message;
    formStatus.className = 'form-status ' + type;
    formStatus.classList.remove('hidden');
    
    // Hide message after 3 seconds
    setTimeout(() => {
        formStatus.classList.add('hidden');
    }, 3000);
}

// Function to save transaction
function saveTransaction(transaction) {
    fetch('/transactions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Save transaction response:", data);
        
        // Show success message or error
        if (data.success) {
            // Reset form
            document.getElementById('title').value = '';
            document.getElementById('amount').value = '';
            
            // Show success message
            showFormStatus('Transaction added successfully!', 'success');
            
            // Reload transactions and summary
            loadTransactions();
            loadSummary();
            
            // Update charts
            updateCharts();
        } else {
            showFormStatus('Error saving transaction: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showFormStatus('Error saving transaction. Please try again.', 'error');
    });
}

// Function to update transaction
function updateTransaction(transactionId, updatedTransaction) {
    // Ensure transactionId is an integer
    transactionId = parseInt(transactionId, 10);
    
    console.log("Updating transaction ID:", transactionId);
    console.log("With data:", updatedTransaction);
    
    fetch(`/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTransaction)
    })
    .then(response => {
        console.log("Update response status:", response.status);
        return response.json();
    })
    .then(data => {
        console.log("Update response data:", data);
        
        if (data.success) {
            // Close the modal
            document.getElementById('edit-modal').style.display = 'none';
            
            // Show success message
            showFormStatus('Transaction updated successfully!', 'success');
            
            // Reload transactions and summary
            loadTransactions();
            loadSummary();
            
            // Update charts
            updateCharts();
        } else {
            showFormStatus('Error updating transaction: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showFormStatus('Error updating transaction. Please try again.', 'error');
    });
}

// Function to delete transaction - FIXED VERSION
function deleteTransaction(transactionId) {
    // Ensure transactionId is an integer
    transactionId = parseInt(transactionId, 10);
    
    console.log("Deleting transaction ID:", transactionId);
    
    fetch(`/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        console.log("Delete response status:", response.status);
        
        // Check if the response is OK
        if (response.ok) {
            // Try to parse the JSON, but don't fail if it's not valid
            return response.text().then(text => {
                try {
                    // If it's parseable JSON, parse it
                    if (text) {
                        return JSON.parse(text);
                    }
                    // Return success for empty responses
                    return { success: true };
                } catch (e) {
                    // If not valid JSON, still consider it a success
                    console.log("Response not valid JSON, but deletion successful");
                    return { success: true };
                }
            });
        } else {
            // For error responses, try to parse as JSON
            return response.json();
        }
    })
    .then(data => {
        console.log("Delete response data:", data);
        
        // Assume success if not explicitly failure
        if (!data || data.success !== false) {
            // Close the modal
            document.getElementById('delete-modal').style.display = 'none';
            
            // Show success message
            showFormStatus('Transaction deleted successfully!', 'success');
            
            // Reload transactions and summary
            loadTransactions();
            loadSummary();
            
            // Update charts
            updateCharts();
        } else {
            showFormStatus('Error deleting transaction: ' + (data.message || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        
        // Check if transaction was actually deleted
        if (!document.body.contains(document.querySelector(`[data-id="${transactionId}"]`))) {
            console.log("Transaction appears to be deleted successfully despite error");
            
            // Close the modal
            document.getElementById('delete-modal').style.display = 'none';
            
            // Show success message
            showFormStatus('Transaction deleted successfully!', 'success');
            
            // Reload data
            loadTransactions();
            loadSummary();
            updateCharts();
            
            return;
        }
        
        showFormStatus('Error deleting transaction. Please try again.', 'error');
    });
}

// Function to load transactions with optional filters
function loadTransactions(filters = {}) {
    console.log("Loading transactions with filters:", filters);
    
    // Build query string from filters
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        if (value) {
            queryParams.append(key, value);
        }
    }
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    fetch(`/transactions${queryString}`)
    .then(response => response.json())
    .then(data => {
        console.log("Loaded transactions:", data);
        displayTransactions(data);
    })
    .catch(error => {
        console.error('Error:', error);
        showFormStatus('Error loading transactions. Please refresh the page.', 'error');
    });
}

// Function to load summary data
function loadSummary(filters = {}) {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        if (value) {
            queryParams.append(key, value);
        }
    }
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    fetch(`/summary${queryString}`)
    .then(response => response.json())
    .then(data => {
        console.log("Summary data:", data);
        updateSummary(data);
        
        // Update charts with the new data
        updateCharts(data);
    })
    .catch(error => {
        console.error('Error:', error);
        showFormStatus('Error loading summary data. Please refresh the page.', 'error');
    });
}

// Function to display transactions in the table
function displayTransactions(transactions) {
    const transactionsList = document.getElementById('transactions-list');
    const noTransactionsMsg = document.getElementById('no-transactions');
    const transactionsTable = document.getElementById('transactions-table');
    
    if (!transactionsList) {
        console.error("Transactions list element not found");
        return;
    }
    
    // Clear existing transactions
    transactionsList.innerHTML = '';
    
    if (transactions.length === 0) {
        if (noTransactionsMsg) {
            noTransactionsMsg.style.display = 'block';
        }
        if (transactionsTable) {
            transactionsTable.style.display = 'none';
        }
        return;
    }
    
    if (noTransactionsMsg) {
        noTransactionsMsg.style.display = 'none';
    }
    if (transactionsTable) {
        transactionsTable.style.display = 'table';
    }
    
    // Sort transactions by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Add each transaction to the table
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        // Determine transaction type
        const type = transaction.type || (transaction.amount >= 0 ? 'income' : 'expense');
        row.classList.add(`transaction-type-${type}`);
        
        // Format the date
        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Determine styling for amount
        const amountClass = type === 'income' ? 'income-amount' : 'expense-amount';
        const formattedAmount = formatCurrency(transaction.amount);
        
        // Create cells with data attributes for easy extraction when editing
        const dateCell = document.createElement('td');
        dateCell.textContent = formattedDate;
        dateCell.setAttribute('data-field', 'date');
        dateCell.setAttribute('data-isodate', transaction.date);
        
        const titleCell = document.createElement('td');
        titleCell.textContent = transaction.title;
        titleCell.setAttribute('data-field', 'title');
        
        const categoryCell = document.createElement('td');
        categoryCell.textContent = transaction.category || (type === 'income' ? 'Other Income' : 'Other Expense');
        categoryCell.setAttribute('data-field', 'category');
        
        const amountCell = document.createElement('td');
        amountCell.textContent = formattedAmount;
        amountCell.className = amountClass;
        amountCell.setAttribute('data-field', 'amount');
        
        // Action buttons cell
        const actionsCell = document.createElement('td');
        
        // Create edit button
        const editButton = document.createElement('i');
        editButton.className = 'material-icons action-button edit-button';
        editButton.textContent = 'edit';
        editButton.setAttribute('data-id', transaction.id);
        
        // Create delete button
        const deleteButton = document.createElement('i');
        deleteButton.className = 'material-icons action-button delete-button';
        deleteButton.textContent = 'delete';
        deleteButton.setAttribute('data-id', transaction.id);
        
        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);
        
        // Append cells to row
        row.appendChild(dateCell);
        row.appendChild(titleCell);
        row.appendChild(categoryCell);
        row.appendChild(amountCell);
        row.appendChild(actionsCell);
        
        // Add the transaction ID as a data attribute for future reference
        row.setAttribute('data-id', transaction.id);
        
        transactionsList.appendChild(row);
    });
}

// Function to update summary cards
function updateSummary(data) {
    document.getElementById('total-income').textContent = formatCurrency(data.total_income);
    document.getElementById('total-expenses').textContent = formatCurrency(data.total_expenses);
    document.getElementById('total-balance').textContent = formatCurrency(data.balance);
}

// Function to format currency (pounds)
function formatCurrency(amount) {
    return '£' + Math.abs(Number(amount)).toFixed(2);
}

// Function to get current filter parameters
function getFilterParameters() {
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;
    const type = document.getElementById('filter-type').value;
    const category = document.getElementById('filter-category').value;
    
    return {
        start_date: startDate,
        end_date: endDate,
        type: type === 'all' ? '' : type,
        category: category === 'all' ? '' : category
    };
}

// Function to clear filters
function clearFilters() {
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    document.getElementById('filter-type').value = 'all';
    document.getElementById('filter-category').value = 'all';
}

// Function to setup transaction action buttons (edit/delete)
function setupTransactionActions() {
    // Use event delegation for action buttons
    document.addEventListener('click', function(event) {
        // Handle edit button clicks
        if (event.target.classList.contains('edit-button')) {
            const transactionId = event.target.getAttribute('data-id');
            const row = event.target.closest('tr');
            
            if (row && transactionId) {
                console.log("Edit clicked for transaction ID:", transactionId);
                openEditModal(transactionId, row);
            }
        }
        
        // Handle delete button clicks
        if (event.target.classList.contains('delete-button')) {
            const transactionId = event.target.getAttribute('data-id');
            
            if (transactionId) {
                console.log("Delete clicked for transaction ID:", transactionId);
                openDeleteModal(transactionId);
            }
        }
    });
}

// Function to open edit modal
function openEditModal(transactionId, row) {
    // Ensure transactionId is an integer
    transactionId = parseInt(transactionId, 10);
    
    // Get transaction data from the row
    const title = row.querySelector('[data-field="title"]').textContent;
    const amountText = row.querySelector('[data-field="amount"]').textContent;
    const amount = parseFloat(amountText.replace('£', ''));
    const category = row.querySelector('[data-field="category"]').textContent;
    const date = row.querySelector('[data-field="date"]').getAttribute('data-isodate');
    const type = row.classList.contains('transaction-type-income') ? 'income' : 'expense';
    
    console.log("Transaction data for edit:", {
        id: transactionId,
        title,
        amount,
        category,
        date,
        type
    });
    
    // Set values in the edit form
    document.getElementById('edit-transaction-id').value = transactionId;
    document.getElementById('edit-title').value = title;
    document.getElementById('edit-amount').value = Math.abs(amount);
    document.getElementById('edit-date').value = date;
    
    // Set transaction type radio
    document.querySelector(`input[name="edit-transaction-type"][value="${type}"]`).checked = true;
    
    // Populate category options based on type
    populateEditCategories(type);
    
    // Set selected category
    const editCategorySelect = document.getElementById('edit-category');
    
    // Wait for categories to be populated
    setTimeout(() => {
        for (let i = 0; i < editCategorySelect.options.length; i++) {
            if (editCategorySelect.options[i].value === category) {
                editCategorySelect.selectedIndex = i;
                break;
            }
        }
    }, 10);
    
    // Show the modal
    document.getElementById('edit-modal').style.display = 'block';
}

// Function to open delete modal
function openDeleteModal(transactionId) {
    // Ensure transactionId is an integer
    transactionId = parseInt(transactionId, 10);
    
    // Set the transaction ID in the delete modal
    document.getElementById('delete-transaction-id').value = transactionId;
    
    // Show the modal
    document.getElementById('delete-modal').style.display = 'block';
}

// Function to populate edit categories dropdown
function populateEditCategories(type) {
    const categories = {
        income: [
            'Salary',
            'Freelance',
            'Investment',
            'Gift',
            'Refund',
            'Other Income'
        ],
        expense: [
            'Food & Dining',
            'Housing',
            'Transportation',
            'Utilities',
            'Entertainment',
            'Shopping',
            'Healthcare',
            'Education',
            'Personal Care',
            'Travel',
            'Gifts & Donations',
            'Other Expense'
        ]
    };
    
    const categorySelect = document.getElementById('edit-category');
    
    // Clear current options
    categorySelect.innerHTML = '';
    
    // Add new options based on type
    categories[type].forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

// Function to setup modal functionality
function setupModalFunctionality() {
    // Close button functionality
    const closeButtons = document.querySelectorAll('.close-button');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Cancel button functionality
    const cancelButtons = document.querySelectorAll('.cancel-button');
    cancelButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Edit form submission
    const editForm = document.getElementById('edit-transaction-form');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const transactionId = document.getElementById('edit-transaction-id').value;
            const title = document.getElementById('edit-title').value;
            let amount = parseFloat(document.getElementById('edit-amount').value);
            const date = document.getElementById('edit-date').value;
            
            // Get transaction type from radio buttons
            let type = 'income'; // Default
            const typeRadios = document.getElementsByName('edit-transaction-type');
            for (let radio of typeRadios) {
                if (radio.checked) {
                    type = radio.value;
                    break;
                }
            }
            
            // Get category
            const category = document.getElementById('edit-category').value;
            
            // Validate inputs
            if (!title || isNaN(amount) || !date) {
                alert('Please fill in all required fields');
                return;
            }
            
            // Adjust amount based on type
            if (type === 'expense') {
                amount = -Math.abs(amount);
            } else {
                amount = Math.abs(amount);
            }
            
            // Create updated transaction object
            const updatedTransaction = {
                title: title,
                amount: amount,
                type: type,
                category: category,
                date: date
            };
            
            // Update transaction
            updateTransaction(transactionId, updatedTransaction);
        });
    }
    
    // Type change in edit form
    const typeRadios = document.getElementsByName('edit-transaction-type');
    typeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            populateEditCategories(this.value);
        });
    });
    
    // Delete confirmation
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            const transactionId = document.getElementById('delete-transaction-id').value;
            deleteTransaction(transactionId);
        });
    }
}

// Function to update all charts
function updateCharts(data) {
    // This function is implemented in charts.js
    if (typeof initializeCharts === 'function') {
        console.log("Updating charts with data:", data);
        initializeCharts(data);
    } else {
        console.log("Chart initialization function not found");
    }
}