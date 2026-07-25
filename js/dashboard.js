// js/dashboard.js
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    await checkUserAuth();
    await loadDashboardData();
    await loadLoanHistory();
});

async function checkUserAuth() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = user;
    document.getElementById('userGreeting').textContent = `Welcome, ${user.user_metadata?.full_name || 'User'}!`;
}

async function loadDashboardData() {
    if (!currentUser) return;
    
    try {
        // Get user's loans
        const { data: loans, error } = await supabaseClient
            .from('loans')
            .select('*')
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        // Calculate stats
        const activeLoans = loans.filter(l => l.status === 'approved' || l.status === 'disbursed');
        const totalBorrowed = loans.filter(l => l.status === 'disbursed').reduce((sum, l) => sum + l.amount, 0);
        const outstanding = loans.filter(l => l.status === 'approved' || l.status === 'disbursed').reduce((sum, l) => sum + l.amount, 0);
        
        document.getElementById('activeLoans').textContent = activeLoans.length;
        document.getElementById('totalBorrowed').textContent = `₦${totalBorrowed.toLocaleString()}`;
        document.getElementById('outstandingBalance').textContent = `₦${outstanding.toLocaleString()}`;
        
        // Calculate next payment (simplified - assuming monthly payments)
        if (activeLoans.length > 0) {
            const nextPayment = activeLoans[0].amount / activeLoans[0].tenure;
            document.getElementById('nextPayment').textContent = `₦${nextPayment.toFixed(2)}`;
        } else {
            document.getElementById('nextPayment').textContent = '₦0';
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

async function submitLoanApplication(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showToast('Please login first', 'error');
        return;
    }
    
    const amount = document.getElementById('loanAmount').value;
    const purpose = document.getElementById('loanPurpose').value;
    const tenure = parseInt(document.getElementById('loanTenure').value);
    const description = document.getElementById('loanDescription').value;
    
    // Validate
    if (amount < 50000) {
        showToast('Minimum loan amount is ₦50,000', 'error');
        return;
    }
    
    if (amount > 5000000) {
        showToast('Maximum loan amount is ₦5,000,000', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('loans')
            .insert([
                {
                    user_id: currentUser.id,
                    amount: parseFloat(amount),
                    purpose: purpose,
                    tenure: tenure,
                    application_date: new Date().toISOString(),
                    status: 'pending',
                    interest_rate: 5.0
                }
            ]);
        
        if (error) throw error;
        
        showToast('Loan application submitted successfully!', 'success');
        document.getElementById('loanApplicationForm').reset();
        await loadLoanHistory();
        await loadDashboardData();
    } catch (error) {
        console.error('Error submitting loan:', error);
        showToast('Error submitting loan application', 'error');
    }
}

async function loadLoanHistory() {
    if (!currentUser) return;
    
    try {
        const { data: loans, error } = await supabaseClient
            .from('loans')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('application_date', { ascending: false });
        
        if (error) throw error;
        
        const loanHistoryDiv = document.getElementById('loanHistory');
        
        if (!loans || loans.length === 0) {
            loanHistoryDiv.innerHTML = '<p>No loan applications yet.</p>';
            return;
        }
        
        loanHistoryDiv.innerHTML = loans.map(loan => `
            <div class="loan-item">
                <div>
                    <strong>₦${loan.amount.toLocaleString()}</strong>
                    <p>${loan.purpose} - ${loan.tenure} months</p>
                    <small>Applied: ${new Date(loan.application_date).toLocaleDateString()}</small>
                </div>
                <div>
                    <span class="status-badge status-${loan.status}">${loan.status.toUpperCase()}</span>
                    ${loan.status === 'approved' ? '<br><button class="btn btn-success" onclick="acceptLoan(\'' + loan.id + '\')">Accept Offer</button>' : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading loan history:', error);
        showToast('Error loading loan history', 'error');
    }
}

async function acceptLoan(loanId) {
    if (!confirm('Are you sure you want to accept this loan offer?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('loans')
            .update({ 
                status: 'disbursed',
                disbursement_date: new Date().toISOString()
            })
            .eq('id', loanId);
        
        if (error) throw error;
        
        showToast('Loan accepted! Funds will be disbursed shortly.', 'success');
        await loadLoanHistory();
        await loadDashboardData();
    } catch (error) {
        console.error('Error accepting loan:', error);
        showToast('Error accepting loan', 'error');
    }
}
