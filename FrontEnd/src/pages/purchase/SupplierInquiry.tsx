import { useState, useEffect } from "react";

export default function SupplierInquiry() {
    const [supplierSearch, setSupplierSearch] = useState("");
    const [supplierResults, setSupplierResults] = useState<any[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // Ledger Data
    const [ledger, setLedger] = useState({
        invoices: [],
        returns: [],
        settlements: [],
        payments: [],
        metrics: { activeBalance: 0, pendingCheques: 0 }
    });

    const [activeTab, setActiveTab] = useState("INVOICES");

    // Fetch suppliers for Recall
    useEffect(() => {
        const fetchSuppliers = async () => {
            if (supplierSearch.length > 1) {
                try {
                    const res = await fetch(`http://localhost:5005/api/suppliers/search?q=${supplierSearch}`);
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setSupplierResults(data);
                        setShowDropdown(true);
                    }
                } catch (error) {
                    console.error("Error fetching suppliers:", error);
                }
            } else {
                setShowDropdown(false);
            }
        };
        const delayDebounceFn = setTimeout(() => { fetchSuppliers(); }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [supplierSearch]);

    const handleSelectSupplier = async (s: any) => {
        setSupplierSearch("");
        setShowDropdown(false);
        setSelectedSupplier(s);

        // Fetch Ledger
        try {
            const res = await fetch(`http://localhost:5005/api/suppliers/${s.id}/inquiry`);
            const data = await res.json();
            if (data.success) {
                setLedger(data.ledger);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'INVOICES':
                return (
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Date</th>
                                <th>Grand Total</th>
                                <th>Paid</th>
                                <th>Balance Due</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.invoices.map((inv: any) => (
                                <tr key={inv.id}>
                                    <td>{inv.invoice_number}</td>
                                    <td>{new Date(inv.date).toLocaleDateString()}</td>
                                    <td>{parseFloat(inv.grand_total).toFixed(2)}</td>
                                    <td>{parseFloat(inv.amount_paid).toFixed(2)}</td>
                                    <td style={{ color: 'red', fontWeight: 'bold' }}>{parseFloat(inv.balance).toFixed(2)}</td>
                                    <td><span className={`status-badge status-${inv.status.toLowerCase()}`}>{inv.status}</span></td>
                                </tr>
                            ))}
                            {ledger.invoices.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center" }}>No Purchase Invoices Found</td></tr>}
                        </tbody>
                    </table>
                );
            case 'RETURNS':
                return (
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Return # / Debit Note</th>
                                <th>Date</th>
                                <th>Total Amount</th>
                                <th>Return Type</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.returns.map((ret: any) => (
                                <tr key={ret.id}>
                                    <td>{ret.return_number}</td>
                                    <td>{new Date(ret.return_date).toLocaleDateString()}</td>
                                    <td>{parseFloat(ret.total_amount).toFixed(2)}</td>
                                    <td>{ret.return_type}</td>
                                    <td><span className={`status-badge status-${ret.status.toLowerCase()}`}>{ret.status}</span></td>
                                </tr>
                            ))}
                            {ledger.returns.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center" }}>No Returns Found</td></tr>}
                        </tbody>
                    </table>
                );
            case 'SETTLEMENTS':
                return (
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Date Issued</th>
                                <th>Debit Note Source</th>
                                <th>Mapped Purchase Inv.</th>
                                <th>Amount Offset</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.settlements.map((set: any) => (
                                <tr key={set.id}>
                                    <td>{new Date(set.created_at).toLocaleDateString()}</td>
                                    <td>{set.return_number}</td>
                                    <td>{set.invoice_number}</td>
                                    <td style={{ color: 'green', fontWeight: 'bold' }}>{parseFloat(set.amount_applied).toFixed(2)}</td>
                                </tr>
                            ))}
                            {ledger.settlements.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center" }}>No Debit Note Settlements Found</td></tr>}
                        </tbody>
                    </table>
                );
            case 'PAYMENTS':
                return (
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Payment Date</th>
                                <th>Amount Paid</th>
                                <th>Method</th>
                                <th>Cheque / Bank Info</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.payments.map((p: any) => (
                                <tr key={p.id}>
                                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                    <td>{parseFloat(p.amount).toFixed(2)}</td>
                                    <td>{p.payment_method}</td>
                                    <td>{p.cheque_number ? `CHQ: ${p.cheque_number} (${p.cheque_bank})` : '-'}</td>
                                    <td><span className={`status-badge status-${p.status.toLowerCase()}`}>{p.status}</span></td>
                                </tr>
                            ))}
                            {ledger.payments.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center" }}>No Payment History Found</td></tr>}
                        </tbody>
                    </table>
                );
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '1400px' }}>
            <h2 className="form-title">Supplier Dashboard & Ledger Inquiry</h2>

            <div className="form-group autocomplete-container" style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', width: '500px' }}>
                <label style={{ color: '#166534', fontWeight: 'bold' }}>Search Supplier</label>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Search by Name or Code..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                />
                {showDropdown && supplierResults.length > 0 && (
                    <div className="autocomplete-dropdown">
                        {supplierResults.map((s) => (
                            <div key={s.id} className="autocomplete-item" onClick={() => handleSelectSupplier(s)}>
                                <strong>{s.supplier_code}</strong> - {s.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedSupplier && (
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
                    {/* LEFT PANEL: PROFILE & METRICS */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
                        <h3 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', marginBottom: '15px' }}>{selectedSupplier.name}</h3>
                        <p><strong>Code:</strong> {selectedSupplier.supplier_code}</p>
                        <p><strong>Contact:</strong> {selectedSupplier.contact || 'N/A'}</p>
                        <p><strong>Terms:</strong> {selectedSupplier.default_payment_type}</p>
                        {selectedSupplier.default_payment_type === 'Credit' && (
                            <>
                                <p><strong>Limit:</strong> LKR {parseFloat(selectedSupplier.credit_limit).toFixed(2)}</p>
                                <p><strong>Period:</strong> {selectedSupplier.credit_period} Days</p>
                            </>
                        )}

                        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#fee2e2', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#991b1b' }}>Total Payables</h4>
                            <h2 style={{ margin: 0, color: '#b91c1c' }}>LKR {ledger.metrics.activeBalance.toFixed(2)}</h2>
                        </div>

                        <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#92400e' }}>Pending Cheques (Out)</h4>
                            <h2 style={{ margin: 0, color: '#b45309' }}>LKR {ledger.metrics.pendingCheques.toFixed(2)}</h2>
                        </div>
                    </div>

                    {/* RIGHT PANEL: TABS & DATA */}
                    <div>
                        <div className="tabs-container" style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
                            {['INVOICES', 'RETURNS', 'SETTLEMENTS', 'PAYMENTS'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        padding: '10px 20px',
                                        background: activeTab === tab ? '#166534' : '#f1f5f9',
                                        color: activeTab === tab ? 'white' : '#64748b',
                                        border: 'none',
                                        borderRadius: '8px 8px 0 0',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {tab.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        <div className="tab-content">
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
