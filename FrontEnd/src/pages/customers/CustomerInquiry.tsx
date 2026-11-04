import { useState, useEffect } from "react";

export default function CustomerInquiry() {
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [showCustDropdown, setShowCustDropdown] = useState(false);

    const [customerData, setCustomerData] = useState<any>(null);
    const [ledger, setLedger] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("INVOICES");
    const [invoiceFilter, setInvoiceFilter] = useState("ALL");

    const filteredInvoices = (ledger?.invoices || []).filter((invoice: any) => {
        if (invoiceFilter === "TO_SHIP" || invoiceFilter === "SHIPPED") {
            return invoice.status === "POSTED" && invoice.shipping_status === invoiceFilter;
        }
        return invoiceFilter === "ALL" || invoice.status === invoiceFilter;
    });

    // Search mapping hook
    useEffect(() => {
        const dly = setTimeout(() => {
            if (customerSearch.trim().length > 1 && !customerData) {
                fetch(`http://localhost:5005/api/customers/search?q=${customerSearch}`)
                    .then(res => res.json())
                    .then(data => {
                        if (Array.isArray(data)) {
                            setCustomerResults(data);
                            setShowCustDropdown(true);
                        }
                    });
            } else {
                setShowCustDropdown(false);
            }
        }, 300);
        return () => clearTimeout(dly);
    }, [customerSearch, customerData]);

    const handleSelectCustomer = async (cust: any) => {
        setCustomerData(cust);
        setCustomerSearch(cust.customer_name);
        setShowCustDropdown(false);
        fetchLedger(cust.id);
    };

    const fetchLedger = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:5005/api/customers/${id}/inquiry`);
            const data = await res.json();
            if (data.success) {
                setLedger(data.ledger);
            } else {
                alert(data.message);
            }
        } catch (e) {
            alert("Failed to fetch customer ledger.");
        }
    };

    const clearSelection = () => {
        setCustomerData(null);
        setCustomerSearch("");
        setLedger(null);
    };

    return (
        <div className="form-container" style={{ maxWidth: '1400px', margin: 'auto' }}>
            <h2 className="form-title" style={{ color: '#1e3a8a' }}>Customer Inquiry Terminal</h2>

            <div className="form-grid" style={{ marginBottom: '20px' }}>
                <div className="form-group autocomplete-container" style={{ width: '400px' }}>
                    <label>Lookup Customer</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            className="form-input"
                            value={customerSearch}
                            onChange={(e) => {
                                setCustomerSearch(e.target.value);
                                setCustomerData(null);
                                setLedger(null);
                            }}
                            placeholder="Type Customer Name or Code..."
                        />
                        {customerData && (
                            <button onClick={clearSelection} className="btn-secondary" style={{ padding: '0 15px' }}>Clear</button>
                        )}
                    </div>
                    {showCustDropdown && customerResults.length > 0 && (
                        <div className="autocomplete-dropdown">
                            {customerResults.map(cust => (
                                <div key={cust.id} className="autocomplete-item" onClick={() => handleSelectCustomer(cust)}>
                                    {cust.customer_code} - <strong>{cust.customer_name}</strong> [{cust.default_payment_type}]
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {customerData && ledger && (
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>

                    {/* Left Column SUMMARY PANEL */}
                    <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '20px' }}>
                        <h3 style={{ borderBottom: '2px solid #7dd3fc', paddingBottom: '10px', marginTop: 0, color: '#0369a1' }}>Customer Metrics</h3>

                        <div style={{ marginBottom: '15px' }}>
                            <p style={{ margin: '0 0 5px', color: '#0284c7', fontSize: '12px', fontWeight: 'bold' }}>CUSTOMER NAME</p>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>{customerData.customer_name}</div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <p style={{ margin: '0 0 5px', color: '#0284c7', fontSize: '12px', fontWeight: 'bold' }}>CREDIT LIMIT</p>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>LKR {parseFloat(customerData.credit_limit || 0).toFixed(2)}</div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <p style={{ margin: '0 0 5px', color: '#0284c7', fontSize: '12px', fontWeight: 'bold' }}>CURRENT ACTIVE BALANCE</p>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: ledger.metrics.activeBalance > 0 ? '#b91c1c' : '#15803d' }}>
                                LKR {parseFloat(ledger.metrics.activeBalance).toFixed(2)}
                            </div>
                        </div>

                        <div style={{ marginBottom: '25px' }}>
                            <p style={{ margin: '0 0 5px', color: '#0284c7', fontSize: '12px', fontWeight: 'bold' }}>PENDING CHEQUES</p>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d97706' }}>LKR {parseFloat(ledger.metrics.pendingCheques || 0).toFixed(2)}</div>
                        </div>

                        {/* NAV MENU */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {['INVOICES', 'RETURNS', 'REFUNDS', 'CREDIT_NOTE_SETTLEMENTS', 'CHEQUES'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        padding: '10px 15px',
                                        textAlign: 'left',
                                        backgroundColor: activeTab === tab ? '#0ea5e9' : '#fff',
                                        color: activeTab === tab ? '#fff' : '#0369a1',
                                        border: '1px solid #7dd3fc',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {tab.replace(/_/g, ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COLUMN DATA GRIDS */}
                    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', minHeight: '500px' }}>
                        <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginTop: 0 }}>
                            {activeTab.replace(/_/g, ' ')} LEDGER
                        </h3>

                        {activeTab === 'INVOICES' && (
                            <>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Invoice filter
                                    <select className="form-input" value={invoiceFilter} onChange={e => setInvoiceFilter(e.target.value)} style={{ width: 'auto' }}>
                                        <option value="ALL">All invoices</option>
                                        <option value="DRAFT">Pending approval</option>
                                        <option value="POSTED">Approved / posted</option>
                                        <option value="TO_SHIP">To ship</option>
                                        <option value="SHIPPED">Shipped</option>
                                        <option value="REJECTED">Rejected</option>
                                    </select>
                                </label>
                            </div>
                            <table className="custom-table">
                                <thead><tr><th>Invoice #</th><th>Date</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Paid</th><th style={{ textAlign: 'right' }}>Balance</th><th>Invoice Status</th><th>Shipping</th></tr></thead>
                                <tbody>
                                    {filteredInvoices.map((inv: any) => (
                                        <tr key={inv.id}>
                                            <td>{inv.invoice_number}</td>
                                            <td>{new Date(inv.date).toLocaleDateString()}</td>
                                            <td style={{ textAlign: 'right' }}>{parseFloat(inv.grand_total).toFixed(2)}</td>
                                            <td style={{ textAlign: 'right' }}>{parseFloat(inv.amount_paid).toFixed(2)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: (inv.grand_total - inv.amount_paid) > 0 ? '#b91c1c' : '#15803d' }}>
                                                {parseFloat(inv.balance).toFixed(2)}
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                                    backgroundColor: inv.status === 'DRAFT' ? '#fef3c7' : inv.status === 'REJECTED' ? '#fee2e2' : '#dcfce7',
                                                    color: inv.status === 'DRAFT' ? '#d97706' : inv.status === 'REJECTED' ? '#b91c1c' : '#166534'
                                                }}>
                                                    {inv.status}
                                                </span>
                                                {inv.rejection_reason && <div style={{ marginTop: '5px', color: '#b91c1c', fontSize: '12px' }}>{inv.rejection_reason}</div>}
                                            </td>
                                            <td>{inv.status === 'POSTED' ? (inv.shipping_status || 'TO_SHIP') : '-'}</td>
                                        </tr>
                                    ))}
                                    {filteredInvoices.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#64748b' }}>No invoices match this filter</td></tr>}
                                </tbody>
                            </table>
                            </>
                        )}

                        {activeTab === 'RETURNS' && (
                            <table className="custom-table">
                                <thead><tr><th>Return #</th><th>Return Type</th><th>Date</th><th style={{ textAlign: 'right' }}>Total</th><th>Status</th></tr></thead>
                                <tbody>
                                    {ledger.returns.map((rtn: any) => (
                                        <tr key={rtn.id}>
                                            <td>{rtn.return_number}</td>
                                            <td>{rtn.return_type}</td>
                                            <td>{new Date(rtn.return_date).toLocaleDateString()}</td>
                                            <td style={{ textAlign: 'right' }}>{parseFloat(rtn.total_amount).toFixed(2)}</td>
                                            <td>{rtn.status}</td>
                                        </tr>
                                    ))}
                                    {ledger.returns.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>No Returns found</td></tr>}
                                </tbody>
                            </table>
                        )}

                        {activeTab === 'REFUNDS' && (
                            <table className="custom-table">
                                <thead><tr><th>Return #</th><th>Date</th><th style={{ textAlign: 'right' }}>Refund Amount</th><th>Status</th></tr></thead>
                                <tbody>
                                    {ledger.returns.filter((r: any) => r.return_type === 'CASH_REFUND').map((rtn: any) => (
                                        <tr key={rtn.id}>
                                            <td>{rtn.return_number}</td>
                                            <td>{new Date(rtn.return_date).toLocaleDateString()}</td>
                                            <td style={{ textAlign: 'right' }}>{parseFloat(rtn.total_amount).toFixed(2)}</td>
                                            <td>{rtn.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {activeTab === 'CREDIT_NOTE_SETTLEMENTS' && (
                            <div>
                                <h4 style={{ color: '#475569', marginBottom: '10px' }}>Available Credit Notes</h4>
                                <table className="custom-table" style={{ marginBottom: '30px' }}>
                                    <thead><tr><th>Return #</th><th>Date</th><th style={{ textAlign: 'right' }}>Credit Amount</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {ledger.returns.filter((r: any) => r.return_type === 'CREDIT_NOTE').map((rtn: any) => (
                                            <tr key={rtn.id}>
                                                <td>{rtn.return_number}</td>
                                                <td>{new Date(rtn.return_date).toLocaleDateString()}</td>
                                                <td style={{ textAlign: 'right' }}>{parseFloat(rtn.total_amount).toFixed(2)}</td>
                                                <td>{rtn.status}</td>
                                            </tr>
                                        ))}
                                        {ledger.returns.filter((r: any) => r.return_type === 'CREDIT_NOTE').length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>No Credit Notes found</td></tr>}
                                    </tbody>
                                </table>

                                <h4 style={{ color: '#475569', marginBottom: '10px' }}>Settlements (Applied to Invoices)</h4>
                                <table className="custom-table">
                                    <thead><tr><th>Settlement Date</th><th>Credit Note #</th><th>Applied To Invoice #</th><th style={{ textAlign: 'right' }}>Amount Applied</th></tr></thead>
                                    <tbody>
                                        {ledger.settlements.map((set: any) => (
                                            <tr key={set.id}>
                                                <td>{new Date(set.created_at).toLocaleDateString()}</td>
                                                <td>{set.return_number}</td>
                                                <td>{set.invoice_number}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(set.amount_applied).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {ledger.settlements.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>No Settlements found</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'CHEQUES' && (
                            <div>
                                <table className="custom-table">
                                    <thead><tr><th>Received On</th><th>Cheque Number</th><th>Bank</th><th>Cheque Date</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'center' }}>Status</th></tr></thead>
                                    <tbody>
                                        {ledger.cheques && ledger.cheques.map((chk: any) => (
                                            <tr key={chk.id}>
                                                <td>{new Date(chk.created_at).toLocaleDateString()}</td>
                                                <td><span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{chk.cheque_number}</span></td>
                                                <td>{chk.cheque_bank}</td>
                                                <td>{new Date(chk.cheque_date).toLocaleDateString()}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(chk.amount).toFixed(2)}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                                                        backgroundColor: chk.status === 'CLEARED' ? '#dcfce7' : chk.status === 'BOUNCED' ? '#fee2e2' : '#fef3c7',
                                                        color: chk.status === 'CLEARED' ? '#166534' : chk.status === 'BOUNCED' ? '#991b1b' : '#92400e'
                                                    }}>
                                                        {chk.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!ledger.cheques || ledger.cheques.length === 0) && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b' }}>No Cheques on record for this customer.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}
