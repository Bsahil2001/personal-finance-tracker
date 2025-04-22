// Personal Finance Tracker v2 - Charts
console.log("Charts.js loaded");

// Store chart instances globally
let incomeExpenseChart = null;
let expenseCategoriesChart = null;
let incomeCategoriesChart = null;
let trendsChart = null;

// Colors for charts
const chartColors = {
    income: 'rgba(0, 184, 148, 0.7)',
    expense: 'rgba(255, 71, 87, 0.7)',
    balance: 'rgba(108, 92, 231, 0.7)',
    categoryColors: [
        'rgba(108, 92, 231, 0.7)',   // Purple (Primary)
        'rgba(0, 206, 201, 0.7)',    // Teal
        'rgba(253, 121, 168, 0.7)',  // Pink
        'rgba(255, 159, 67, 0.7)',   // Orange
        'rgba(46, 204, 113, 0.7)',   // Green
        'rgba(52, 152, 219, 0.7)',   // Blue
        'rgba(155, 89, 182, 0.7)',   // Violet
        'rgba(233, 30, 99, 0.7)',    // Rose
        'rgba(241, 196, 15, 0.7)',   // Yellow
        'rgba(231, 76, 60, 0.7)',    // Red
        'rgba(26, 188, 156, 0.7)',   // Mint
        'rgba(41, 128, 185, 0.7)',   // Sky Blue
    ]
};

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded in charts.js");
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error("Chart.js is not loaded! Please check your script references.");
        return;
    }
    
    // Fetch initial data to populate charts
    fetch('/summary')
        .then(response => response.json())
        .then(data => {
            console.log("Initial chart data loaded:", data);
            initializeCharts(data);
        })
        .catch(error => {
            console.error("Error loading chart data:", error);
        });
});

// Function to initialize all charts
function initializeCharts(data) {
    console.log("Initializing charts with data:", data);
    
    // Create or update income vs expense chart
    createIncomeExpenseChart(data);
    
    // Create or update expense categories chart
    createExpenseCategoriesChart(data);
    
    // Create or update income categories chart
    createIncomeCategoriesChart(data);
    
    // Create or update trends chart
    createTrendsChart();
}

// Function to create Income vs Expense chart
function createIncomeExpenseChart(data) {
    const ctx = document.getElementById('income-expense-chart');
    if (!ctx) {
        console.error("Income vs Expense chart canvas not found");
        return;
    }
    
    // Prepare data
    const chartData = {
        labels: ['Income', 'Expenses', 'Balance'],
        datasets: [{
            label: 'Amount (£)',  // Adding label to prevent "undefined" in legend
            data: [
                data.total_income || 0,
                data.total_expenses || 0,
                (data.total_income || 0) - (data.total_expenses || 0)
            ],
            backgroundColor: [
                chartColors.income,
                chartColors.expense,
                chartColors.balance
            ],
            borderColor: [
                chartColors.income.replace('0.7', '1'),
                chartColors.expense.replace('0.7', '1'),
                chartColors.balance.replace('0.7', '1')
            ],
            borderWidth: 1
        }]
    };
    
    // Chart options
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: {
                        family: "'Nunito', sans-serif",
                        size: 12
                    },
                    color: getTextColor()
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `£${context.raw.toFixed(2)}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: getGridColor()
                },
                ticks: {
                    color: getTextColor(),
                    callback: function(value) {
                        return '£' + value;
                    }
                }
            },
            x: {
                grid: {
                    color: getGridColor()
                },
                ticks: {
                    color: getTextColor()
                }
            }
        }
    };
    
    // Create or update chart
    if (incomeExpenseChart) {
        // Update existing chart
        incomeExpenseChart.data = chartData;
        incomeExpenseChart.options = options;
        incomeExpenseChart.update();
    } else {
        // Create new chart
        incomeExpenseChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: options
        });
    }
}

// Function to create Expense Categories chart
function createExpenseCategoriesChart(data) {
    const ctx = document.getElementById('expense-categories-chart');
    if (!ctx) {
        console.error("Expense Categories chart canvas not found");
        return;
    }
    
    // Get expense categories from the data
    const expenseBreakdown = data.expense_breakdown || [];
    
    // Sort by amount (descending)
    expenseBreakdown.sort((a, b) => b.amount - a.amount);
    
    const labels = expenseBreakdown.map(item => item.category);
    const values = expenseBreakdown.map(item => item.amount);
    
    // Generate background colors
    const backgroundColors = [];
    for (let i = 0; i < labels.length; i++) {
        backgroundColors.push(chartColors.categoryColors[i % chartColors.categoryColors.length]);
    }
    
    // Prepare data
    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Expense Categories', // Adding label to prevent "undefined" in legend
            data: values,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
            borderWidth: 1
        }]
    };
    
    // Chart options
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    font: {
                        family: "'Nunito', sans-serif",
                        size: 12
                    },
                    color: getTextColor()
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const value = context.raw;
                        const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `£${value.toFixed(2)} (${percentage}%)`;
                    }
                }
            }
        }
    };
    
    // Create or update chart
    if (expenseCategoriesChart) {
        // Update existing chart
        expenseCategoriesChart.data = chartData;
        expenseCategoriesChart.options = options;
        expenseCategoriesChart.update();
    } else {
        // Create new chart
        expenseCategoriesChart = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: options
        });
    }
}

// Function to create Income Categories chart
function createIncomeCategoriesChart(data) {
    const ctx = document.getElementById('income-categories-chart');
    if (!ctx) {
        console.error("Income Categories chart canvas not found");
        return;
    }
    
    // Get income categories from the data
    const incomeBreakdown = data.income_breakdown || [];
    
    // Sort by amount (descending)
    incomeBreakdown.sort((a, b) => b.amount - a.amount);
    
    const labels = incomeBreakdown.map(item => item.category);
    const values = incomeBreakdown.map(item => item.amount);
    
    // Generate background colors
    const backgroundColors = [];
    for (let i = 0; i < labels.length; i++) {
        backgroundColors.push(chartColors.categoryColors[i % chartColors.categoryColors.length]);
    }
    
    // Prepare data - FIXED HERE
    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Income Categories', // Adding label to prevent "undefined" in legend
            data: values,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
            borderWidth: 1
        }]
    };
    
    // Chart options
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    font: {
                        family: "'Nunito', sans-serif",
                        size: 12
                    },
                    color: getTextColor()
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const value = context.raw;
                        const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `£${value.toFixed(2)} (${percentage}%)`;
                    }
                }
            }
        }
    };
    
    // Create or update chart
    if (incomeCategoriesChart) {
        // Update existing chart
        incomeCategoriesChart.data = chartData;
        incomeCategoriesChart.options = options;
        incomeCategoriesChart.update();
    } else {
        // Create new chart
        incomeCategoriesChart = new Chart(ctx, {
            type: 'pie',
            data: chartData,
            options: options
        });
    }
}

// Function to create Trends chart
function createTrendsChart() {
    const ctx = document.getElementById('trends-chart');
    if (!ctx) {
        console.error("Trends chart canvas not found");
        return;
    }
    
    // Fetch transactions to create trends chart
    fetch('/transactions')
        .then(response => response.json())
        .then(transactions => {
            console.log("Loaded transactions for trends chart:", transactions);
            
            // Group transactions by month
            const monthlyData = groupTransactionsByMonth(transactions);
            
            // Prepare data
            const chartData = {
                labels: monthlyData.months,
                datasets: [
                    {
                        label: 'Income',
                        data: monthlyData.incomes,
                        borderColor: chartColors.income.replace('0.7', '1'),
                        backgroundColor: chartColors.income.replace('0.7', '0.2'),
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Expenses',
                        data: monthlyData.expenses,
                        borderColor: chartColors.expense.replace('0.7', '1'),
                        backgroundColor: chartColors.expense.replace('0.7', '0.2'),
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Balance',
                        data: monthlyData.balances,
                        borderColor: chartColors.balance.replace('0.7', '1'),
                        backgroundColor: chartColors.balance.replace('0.7', '0.2'),
                        fill: true,
                        tension: 0.4
                    }
                ]
            };
            
            // Chart options
            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true, // Set to false if you want to hide the legend completely
                        position: 'top',
                        labels: {
                            font: {
                                family: "'Nunito', sans-serif",
                                size: 12
                            },
                            color: getTextColor()
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: £${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        grid: {
                            color: getGridColor()
                        },
                        ticks: {
                            color: getTextColor(),
                            callback: function(value) {
                                return '£' + value;
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: getGridColor()
                        },
                        ticks: {
                            color: getTextColor()
                        }
                    }
                }
            };
            
            // Create or update chart
            if (trendsChart) {
                // Update existing chart
                trendsChart.data = chartData;
                trendsChart.options = options;
                trendsChart.update();
            } else {
                // Create new chart
                trendsChart = new Chart(ctx, {
                    type: 'line',
                    data: chartData,
                    options: options
                });
            }
        })
        .catch(error => {
            console.error("Error loading transactions for trends chart:", error);
        });
}

// Function to group transactions by month for trends chart
function groupTransactionsByMonth(transactions) {
    const monthlyData = {};
    
    // Process transactions
    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        const monthYear = `${month} ${year}`;
        
        // Initialize month data if it doesn't exist
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = {
                income: 0,
                expense: 0,
                balance: 0,
                date: date // Store date for sorting
            };
        }
        
        // Update monthly totals
        const amount = Number(transaction.amount);
        if (amount >= 0) {
            monthlyData[monthYear].income += amount;
        } else {
            monthlyData[monthYear].expense += Math.abs(amount);
        }
        
        // Update balance
        monthlyData[monthYear].balance = monthlyData[monthYear].income - monthlyData[monthYear].expense;
    });
    
    // Convert to arrays and sort by date
    const months = [];
    const incomes = [];
    const expenses = [];
    const balances = [];
    
    Object.entries(monthlyData)
        .sort((a, b) => a[1].date - b[1].date)
        .forEach(([month, data]) => {
            months.push(month);
            incomes.push(data.income);
            expenses.push(data.expense);
            balances.push(data.balance);
        });
    
    return { months, incomes, expenses, balances };
}

// Helper function to get text color based on theme
function getTextColor() {
    return document.body.classList.contains('dark-theme') ? '#b2bec3' : '#2d3436';
}

// Helper function to get grid color based on theme
function getGridColor() {
    return document.body.classList.contains('dark-theme') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
}

// Make initializeCharts function available globally
window.initializeCharts = initializeCharts;