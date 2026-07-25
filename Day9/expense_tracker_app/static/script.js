document.addEventListener('DOMContentLoaded', () => {
    const expenseForm = document.getElementById('expense-form');
    const expenseText = document.getElementById('expense-text');
    const expenseList = document.getElementById('expense-list');
    const emptyState = document.getElementById('empty-state');
    const totalAmountEl = document.getElementById('total-amount');
    const totalItemsEl = document.getElementById('total-items');
    const submitBtn = document.getElementById('submit-btn');

    // Helper to format values as currency
    function formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    }

    // Load expenses from database
    async function loadExpenses() {
        try {
            const response = await fetch('/view_expense');
            if (!response.ok) throw new Error('Failed to load expenses');

            const data = await response.json();
            const expenses = data.expenses || [];
            const totalSpending = data.total_spending || 0;

            // Update stats
            totalAmountEl.textContent = formatCurrency(totalSpending);
            totalItemsEl.textContent = expenses.length;

            // Clear old list
            expenseList.innerHTML = '';

            if (expenses.length === 0) {
                emptyState.style.display = 'flex';
                expenseList.style.display = 'none';
            } else {
                emptyState.style.display = 'none';
                expenseList.style.display = 'flex';

                expenses.forEach(item => {
                    const li = document.createElement('li');
                    li.classList.add('expense-item');
                    li.innerHTML = `
                        <div class="expense-details">
                            <span class="expense-category">${item.category || 'uncategorized'}</span>
                            <span class="expense-text-desc">Expense item</span>
                        </div>
                        <span class="expense-amount">${formatCurrency(item.amount)}</span>
                    `;
                    expenseList.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
        }
    }

    // Add new expense via POST
    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = expenseText.value.trim();
        if (!text) return;

        // Visual loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';

        try {
            const response = await fetch('/add_expense', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Server error');
            }

            // Success
            expenseText.value = '';
            await loadExpenses();

        } catch (error) {
            console.error('Error adding expense:', error);
            alert(`⚠️ Error processing expense: ${error.message}`);
        } finally {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Process with AI';
        }
    });

    // Initial load
    loadExpenses();
});
