import { useState, useEffect } from "react";
import axios from "axios";
import "./UserAccess.css";

// --- Tab 1: User DataGrid ---
function UserGrid({ users, onEditUser }: { users: any[], onEditUser: (u: any) => void }) {
    return (
        <div className="tab-section">
            <h3 className="section-title">Users List</h3>
            <table className="user-table">
                <thead>
                    <tr>
                        <th>UserName</th>
                        <th>Email</th>
                        <th>Credit Limit Auth</th>
                        <th>Modify Credit Limit</th>
                        <th>Modify Disc</th>
                        <th>Role</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id}>
                            <td>{u.username}</td>
                            <td>{u.email || 'null'}</td>
                            <td>{u.credit_limit_auth ? 'Yes' : 'No'}</td>
                            <td>{u.credit_limit_modify ? 'Yes' : 'No'}</td>
                            <td>{u.max_disc_modify ? 'Yes' : 'No'}</td>
                            <td>{u.role_name}</td>
                            <td>
                                <button className="btn-edit" onClick={() => onEditUser(u)}>Edit</button>
                                <button className="btn-reset">Reset Password</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// --- Tab 2: New / Edit User Form (Basic Details) ---
function UserRegistration({ roles, selectedUser, onSave, onCancel }: { roles: any[], selectedUser: any, onSave: (data: any) => void, onCancel: () => void }) {
    const [formData, setFormData] = useState({
        full_name: "", mobile: "", email: "", role_id: "", username: "",
        password: "", confirmPassword: "", login_time: "09:00 AM", logout_time: "05:30 PM",
        company_name: "Head Office"
    });

    useEffect(() => {
        if (selectedUser) {
            setFormData({ ...formData, ...selectedUser, password: "", confirmPassword: "" });
        }
    }, [selectedUser]);

    return (
        <div className="tab-section">
            <h3 className="section-title">User Details</h3>
            <div className="form-grid">
                <div className="form-group">
                    <label>Name</label>
                    <input type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="Full name" />
                </div>
                <div className="form-group">
                    <label>Mobile</label>
                    <input type="text" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} placeholder="Mobile" />
                </div>
                <div className="form-group">
                    <label>Email</label>
                    <input type="text" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Email" />
                </div>
                <div className="form-group">
                    <label>Role</label>
                    <select value={formData.role_id} onChange={e => setFormData({ ...formData, role_id: e.target.value })}>
                        <option value="">Select Role...</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>Username</label>
                    <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="Username" />
                </div>
                <div className="form-group">
                    <label>Password</label>
                    <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={selectedUser ? "Leave blank to keep current" : "Password"} />
                </div>
                <div className="form-group">
                    <label>Login Time</label>
                    <input type="text" value={formData.login_time} onChange={e => setFormData({ ...formData, login_time: e.target.value })} />
                </div>
                <div className="form-group">
                    <label>Logout Time</label>
                    <input type="text" value={formData.logout_time} onChange={e => setFormData({ ...formData, logout_time: e.target.value })} />
                </div>
            </div>
            <div className="form-actions">
                <button className="btn-save" onClick={() => onSave(formData)}>Save User</button>
                <button className="btn-cancel" onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
}

// --- Tab 3: Deep Privileges (User Access) ---
const PRIVILEGE_CATEGORIES = {
    "Products": [
        { id: "new-item", name: "New Item" },
        { id: "item-inquiry", name: "Item Inquiry" },
        { id: "open-stock", name: "Open Stock" },
        { id: "OEM", name: "OEM" }
    ],
    "Sales": [
        { id: "invoice", name: "Sales Invoice" },
        { id: "sales-management", name: "Sales Management" },
        { id: "cashbill", name: "Sales Cancel" },
        { id: "customerbill", name: "Sales Return" },
        { id: "payment", name: "Sales Return Settle" },
        { id: "cash-refund", name: "Cash Refund" },
        { id: "payment-report", name: "Sales Report" }
    ],
    "Customers": [
        { id: "new-customer", name: "New Customer" },
        { id: "customer-inquiry", name: "Customer Inquiry" },
        { id: "customer-payment", name: "Customer Payment" },
        { id: "cheque-status", name: "Cheque Status" },
        { id: "customer-report", name: "Customer Report" }
    ],
    "Purchase": [
        { id: "new-supplier", name: "New Supplier" },
        { id: "supplier-inquiry", name: "Supplier Inquiry" },
        { id: "supplier-payment", name: "Supplier Payment" },
        { id: "purchase-invoice", name: "Purchase Invoice" },
        { id: "purchase-return", name: "Purchase Invoice Return" },
        { id: "purchase-return-settle", name: "Supplier Return Settle" },
        { id: "supplier-cheque-status", name: "Supplier Cheque Clearance" },
        { id: "purchase-management", name: "Purchase Invoice Management" }
    ],
    "Users": [
        { id: "new-user", name: "New User" },
        { id: "user-access", name: "User Access" }
    ]
};

function UserPrivileges({ selectedUser, onSave, onCancel }: { selectedUser: any, onSave: (data: any) => void, onCancel: () => void }) {
    const [access, setAccess] = useState<any>({
        credit_limit_auth: false, credit_limit_modify: false, max_disc_modify: false,
        all_location_access: false, authority: false, cost_price_access: false,
        profit_margin_access: false, price_modify: false, privileges: []
    });
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (selectedUser) {
            setAccess({
                credit_limit_auth: selectedUser.credit_limit_auth,
                credit_limit_modify: selectedUser.credit_limit_modify,
                max_disc_modify: selectedUser.max_disc_modify,
                all_location_access: selectedUser.all_location_access,
                authority: selectedUser.authority,
                cost_price_access: selectedUser.cost_price_access,
                profit_margin_access: selectedUser.profit_margin_access,
                price_modify: selectedUser.price_modify,
                privileges: selectedUser.privileges || []
            });
        }
    }, [selectedUser]);

    const togglePriv = (pageId: string) => {
        if (access.privileges.includes(pageId)) {
            setAccess({ ...access, privileges: access.privileges.filter((p: string) => p !== pageId) });
        } else {
            setAccess({ ...access, privileges: [...access.privileges, pageId] });
        }
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    if (!selectedUser) {
        return <div className="tab-section"><p>Please select a user from the Users List tab to modify privileges.</p></div>;
    }

    return (
        <div className="tab-section">
            <h3 className="section-title">Modify Privileges for: {selectedUser.username}</h3>
            <div className="checkbox-grid">
                <label><input type="checkbox" checked={access.credit_limit_auth} onChange={e => setAccess({ ...access, credit_limit_auth: e.target.checked })} /> Credit Limit Authorize</label>
                <label><input type="checkbox" checked={access.credit_limit_modify} onChange={e => setAccess({ ...access, credit_limit_modify: e.target.checked })} /> Credit Limit Modify</label>
                <label><input type="checkbox" checked={access.max_disc_modify} onChange={e => setAccess({ ...access, max_disc_modify: e.target.checked })} /> Max Discount Modify</label>
                <label><input type="checkbox" checked={access.all_location_access} onChange={e => setAccess({ ...access, all_location_access: e.target.checked })} /> All Location Access</label>
                <label><input type="checkbox" checked={access.authority} onChange={e => setAccess({ ...access, authority: e.target.checked })} /> Authority</label>
                <label><input type="checkbox" checked={access.cost_price_access} onChange={e => setAccess({ ...access, cost_price_access: e.target.checked })} /> Cost Price Access</label>
                <label><input type="checkbox" checked={access.profit_margin_access} onChange={e => setAccess({ ...access, profit_margin_access: e.target.checked })} /> Profit Margin Access</label>
                <label><input type="checkbox" checked={access.price_modify} onChange={e => setAccess({ ...access, price_modify: e.target.checked })} /> Price Modify</label>
            </div>

            <h4 style={{ marginTop: '30px', color: '#1e293b' }}>Granular Page-Level Privileges Tree</h4>
            <div className="privilege-tree">
                {Object.entries(PRIVILEGE_CATEGORIES).map(([catName, pages]) => (
                    <div key={catName} className="tree-node-container" style={{ marginBottom: '10px' }}>
                        <div className="tree-node" onClick={() => toggleCategory(catName)}>
                            <span className="tree-icon">{expandedCategories[catName] ? '▼' : '▶'}</span> {catName}
                        </div>
                        {expandedCategories[catName] && (
                            <div className="tree-children" style={{ marginLeft: '25px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                {pages.map(page => (
                                    <label key={page.id} style={{ fontSize: '14px', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={access.privileges.includes(page.id)}
                                            onChange={() => togglePriv(page.id)}
                                            style={{ marginRight: '8px' }}
                                        />
                                        {page.name}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="form-actions" style={{ marginTop: '30px' }}>
                <button className="btn-save" onClick={() => onSave({ ...selectedUser, ...access })}>Save Privileges</button>
                <button className="btn-cancel" onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
}

// --- Main Monolithic Container ---
export default function UserManagement() {
    const [activeTab, setActiveTab] = useState("list");
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const loadData = async () => {
        const token = localStorage.getItem("erp_session");
        try {
            const [uRes, rRes] = await Promise.all([
                axios.get("http://localhost:5005/api/users", { headers: { Authorization: `Bearer ${token}` } }),
                axios.get("http://localhost:5005/api/users/roles", { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setUsers(uRes.data);
            setRoles(rRes.data);
        } catch (e) {
            console.error("Failed to load user management matrix", e);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSaveUser = async (data: any) => {
        const token = localStorage.getItem("erp_session");
        try {
            if (data.id) {
                await axios.put(`http://localhost:5005/api/users/${data.id}`, data, { headers: { Authorization: `Bearer ${token}` } });
                alert("Updated natively!");
            } else {
                await axios.post("http://localhost:5005/api/users", data, { headers: { Authorization: `Bearer ${token}` } });
                alert("Created safely!");
            }
            loadData();
            setActiveTab("list");
            setSelectedUser(null);
        } catch (e: any) {
            alert("Error: " + (e.response?.data?.message || e.message));
        }
    };

    const handleEditUser = (u: any) => {
        setSelectedUser(u);
        setActiveTab("edit");
    };

    return (
        <div className="user-management-container">
            <div className="tab-navigation">
                <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => { setActiveTab('list'); setSelectedUser(null); }}>Users</button>
                <button className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`} onClick={() => setActiveTab('edit')}>{selectedUser ? 'Edit User Details' : 'New User'}</button>
                <button className={`tab-btn ${activeTab === 'privileges' ? 'active' : ''}`} onClick={() => setActiveTab('privileges')}>Privileges Access</button>
            </div>

            <div className="tab-content">
                {activeTab === 'list' && <UserGrid users={users} onEditUser={handleEditUser} />}
                {activeTab === 'edit' && <UserRegistration roles={roles} selectedUser={selectedUser} onSave={handleSaveUser} onCancel={() => setActiveTab('list')} />}
                {activeTab === 'privileges' && <UserPrivileges selectedUser={selectedUser} onSave={handleSaveUser} onCancel={() => setActiveTab('list')} />}
            </div>
        </div>
    );
}
