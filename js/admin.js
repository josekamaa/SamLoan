// js/admin.js
let currentTab = 'pending';

document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAuth();
    await loadAdminStats();
    await loadPendingLoans();
});

async function checkAdminAuth() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    // Check if user is admin
    const { data: userData, error } = await supabaseClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (error || userData?.role !== 'admin') {
        showToast('Access denied. Admin only.', 'error');
        window.location.href = 'dashboard.html';
        return;
    }
}

async function loadAdminStats() {
    try {
        // Get pending count
        const { count: pendingCount } = await supabaseClient
            .from('loans')
            .select('*', { count: 'exact' })
            .eq('status', 'pending');
        
        // Get total users
        const { count: userCount } = await supabaseClient
            .from('users')
            .select('*', { count: 'exact' });
        
        // Get total disbursed
        const { data: disbursedLoans } = await supabaseClient
            .from('loans')
            .select('amount')
            .eq('status', 'disbursed');
        
        const totalDisbursed = disbursedLoans?.reduce((sum, loan) => sum + loan.amount, 0) || 0;
        
        document.getElementById('pendingCount').textContent = pendingCount || 0;
        document.getElementById('totalUsers').textContent = userCount || 0;
        document.getElementById('totalDisbursed').textContent = `₦${totalDisbursed.toLocaleString()}`;
        
    } catch (error) {
        console.error('Error loading admin stats:', error);
        showToast('Error loading stats', 'error');
    }
}

function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    const targetContent = document.getElementById(tab + 'Loans') || document.getElementById(tab + 'Tab');
    if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block';
    }
    
    // Load data based on tab
    switch(tab) {
        case 'pending':
            loadPendingLoans();
            break;
        case 'approved':
            loadApprovedLoans();
            break;
        case 'disbursed':
            loadDisbursedLoans();
            break;
        case 'rejected':
            loadRejectedLoans();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

async function loadPendingLoans() {
    try {
        const { data: loans, error } = await supabaseClient
            .from('loans')
            .select(`
                *,
                users (
                    full_name,
                    email,
                    phone
                )
            `)
            .eq('status', 'pending')
            .order('application_date', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('pendingLoansList');
        
        if (!loans || loans.length === 0) {
            container.innerHTML = '<p>No pending applications.</p>';
            return;
        }
        
        container.innerHTML = loans.map(loan => `
            <div class="loan-card">
                <div class="loan-card-header">
                    <h3>${loan.users?.full_name || 'Unknown User'}</h3>
                    <span class="status-badge status-pending">PENDING</span>
                </div>
                <div class="loan-card-details">
                    <p><strong>Amount</strong> ₦${loan.amount.toLocaleString()}</p>
                    <p><strong>Purpose</strong> ${loan.purpose}</p>
                    <p><strong>Tenure</strong> ${loan.tenure} months</p>
                    <p><strong>Applied</strong> ${new Date(loan.application_date).toLocaleDateString()}</p>
                    <p><strong>Email</strong> ${loan.users?.email || 'N/A'}</p>
                </div>
                <div class="loan-actions">
                    <button class="btn-approve" onclick="openActionModal('${loan.id}', 'approve')">Approve</button>
                    <button class="btn-reject" onclick="openActionModal('${loan.id}', 'reject')">Reject</button>
                    <button class="btn-view" onclick="viewLoanDetails('${loan.id}')">View Details</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading pending loans:', error);
        showToast('Error loading pending loans', 'error');
    }
}

async function loadApprovedLoans() {
    // Similar to loadPendingLoans but with status 'approved'
    await loadLoansByStatus('approved', 'approvedLoansList');
}

async function loadDisbursedLoans() {
    await loadLoansByStatus('disbursed', 'disbursedLoansList');
}

async function loadRejectedLoans() {
    await loadLoansByStatus('rejected', 'rejectedLoansList');
}

async function loadLoansByStatus(status, containerId) {
    try {
        const { data: loans, error } = await supabaseClient
            .from('loans')
            .select(`
                *,
                users (
                    full_name,
                    email,
                    phone
                )
            `)
            .eq('status', status)
            .order('application_date', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById(containerId);
        
        if (!loans || loans.length === 0) {
            container.innerHTML = `<p>No ${status} loans.</p>`;
            return;
        }
        
        container.innerHTML = loans.map(loan => `
            <div class="loan-card">
                <div class="loan-card-header">
                    <h3>${loan.users?.full_name || 'Unknown User'}</h3>
                    <span class="status-badge status-${status}">${status.toUpperCase()}</span>
                </div>
                <div class="loan-card-details">
                    <p><strong>Amount</strong> ₦${loan.amount.toLocaleString()}</p>
                    <p><strong>Purpose</strong> ${loan.purpose}</p>
                    <p><strong>Tenure</strong> ${loan.tenure} months</p>
                    <p><strong>Applied</strong> ${new Date(loan.application_date).toLocaleDateString()}</p>
                    ${loan.approval_date ? `<p><strong>Approved</strong> ${new Date(loan.approval_date).toLocaleDateString()}</p>` : ''}
                    ${loan.disbursement_date ? `<p><strong>Disbursed</strong> ${new Date(loan.disbursement_date).toLocaleDateString()}</p>` : ''}
                </div>
                <div class="loan-actions">
                    ${status === 'approved' ? `<button class="btn-disburse" onclick="openActionModal('${loan.id}', 'disburse')">Disburse</button>` : ''}
                    <button class="btn-view" onclick="viewLoanDetails('${loan.id}')">View Details</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error(`Error loading ${status} loans:`, error);
        showToast(`Error loading ${status} loans`, 'error');
    }
}

async function loadUsers() {
    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('usersList');
        
        if (!users || users.length === 0) {
            container.innerHTML = '<p>No users found.</p>';
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div class="user-item">
                <div>
                    <strong>${user.full_name}</strong>
                    <p>${user.email}</p>
                    ${user.phone ? `<p>${user.phone}</p>` : ''}
                </div>
                <div>
                    <span class="role-badge role-${user.role || 'user'}">${(user.role || 'user').toUpperCase()}</span>
                    <small>Joined: ${new Date(user.created_at).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error loading users', 'error');
    }
}

function openActionModal(loanId, action) {
    const modal = document.getElementById('actionModal');
    const title = document.getElementById('actionModalTitle');
    const fields = document.getElementById('actionFields');
    
    document.getElementById('actionLoanId').value = loanId;
    document.getElementById('actionType').value = action;
    
    switch(action) {
        case 'approve':
            title.textContent = 'Approve Loan';
            fields.innerHTML = `
                <div class="form-group">
                    <label for="interestRate">Interest Rate (%)</label>
                    <input type="number" id="interestRate" value="5.0" step="0.5" min="0" max="20">
                </div>
                <div class="form-group">
                    <label for="adminNotes">Notes</label>
                    <textarea id="adminNotes" placeholder="Add any notes about this approval..."></textarea>
                </div>
            `;
            break;
        case 'reject':
            title.textContent = 'Reject Loan';
            fields.innerHTML = `
                <div class="form-group">
                    <label for="rejectionReason">Reason for Rejection</label>
                    <textarea id="rejectionReason" placeholder="Provide reason for rejection..." required></textarea>
                </div>
            `;
            break;
        case 'disburse':
            title.textContent = 'Disburse Loan';
            fields.innerHTML = `
                <div class="form-group">
                    <label for="disbursementDate">Disbursement Date</label>
                    <input type="date" id="disbursementDate" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label for="repaymentDate">Expected Repayment Date</label>
                    <input type="date" id="repaymentDate" value="${new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]}">
                </div>
            `;
            break;
    }
    
    modal.style.display = 'flex';
}

function closeActionModal() {
    document.getElementById('actionModal').style.display = 'none';
}

async function handleLoanAction(event) {
    event.preventDefault();
    
    const loanId = document.getElementById('actionLoanId').value;
    const action = document.getElementById('actionType').value;
    
    try {
        let updateData = {};
        
        switch(action) {
            case 'approve':
                const interestRate = document.getElementById('interestRate').value;
                const notes = document.getElementById('adminNotes').value;
                updateData = {
                    status: 'approved',
                    approval_date: new Date().toISOString(),
                    interest_rate: parseFloat(interestRate),
                    admin_notes: notes
                };
                break;
            case 'reject':
                const reason = document.getElementById('rejectionReason').value;
                updateData = {
                    status: 'rejected',
                    admin_notes: reason
                };
                break;
            case 'disburse':
                const disbursementDate = document.getElementById('disbursementDate').value;
                const repaymentDate = document.getElementById('repaymentDate').value;
                updateData = {
                    status: 'disbursed',
                    disbursement_date: new Date(disbursementDate).toISOString(),
                    repayment_date: new Date(repaymentDate).toISOString()
                };
                break;
        }
        
        const { error } = await supabaseClient
            .from('loans')
            .update(updateData)
            .eq('id', loanId);
        
        if (error) throw error;
        
        showToast(`Loan ${action}ed successfully!`, 'success');
        closeActionModal();
        switchTab(currentTab);
        await loadAdminStats();
        
    } catch (error) {
        console.error('Error performing action:', error);
        showToast(`Error ${action}ing loan`, 'error');
    }
}

function viewLoanDetails(loanId) {
    // Implement loan details view or redirect to details page
    showToast('Loan details feature coming soon!', 'info');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('actionModal');
    if (event.target === modal) {
        closeActionModal();
    }
};
