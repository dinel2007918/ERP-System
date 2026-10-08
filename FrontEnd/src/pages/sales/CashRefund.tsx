import { useState, useEffect } from "react";

export default function CashRefund() {
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [showCustDropdown, setShowCustDropdown] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [creditNotes, setCreditNotes] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const dly = setTimeout(() => {
            if (customerSearch.trim().length > 1 && !selectedCustomer) {
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
    }, [customerSearch, selectedCustomer]);

    const handleSelectCustomer = async (cust: any) => {
        if (cust.default_payment_type !== 'Cash') {
            alert(`Customer [${cust.customer_name}] is mapped as a Credit customer. Cash Refunds are natively blocked. Route them through the Return Settlement portal.`);
            return;
        }
        setSelectedCustomer(cust);
        setCustomerSearch(cust.customer_name);
        setShowCustDropdown(false);
        fetchSettlements(cust.id);
    };

    const fetchSettlements = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:5005/api/sales-returns/customer/${id}/settlements`);
            const data = await res.json();
            if (data.success) {
                setCreditNotes(data.creditNotes);
            }
        } catch (e) {
            alert("Failed to fetch pending cash refunds.");
        }
    };

    const handleIssueRefund = async (rtn: any) => {
        if (window.confirm(`Issue LKR ${parseFloat(rtn.total_amount).toFixed(2)} cash refund to ${selectedCustomer?.customer_name}?`)) {
            setIsSaving(true);
            try {
                const res = await fetch(`http://localhost:5005/api/sales-returns/${rtn.id}/refund`, {
                    method: "PUT"
                });
                const data = await res.json();
                if (data.success) {
                    alert("Cash Refund Issued!");
                    fetchSettlements(selectedCustomer.id);
                } else alert("Failed to issue refund.");
            } catch (e) { alert("Network Error."); }
            finally { setIsSaving(false); }
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '1000px', margin: 'auto' }}>
            <h2 className="form-title" style={{ color: '#047857' }}>Cash Refund Terminal</h2>

            <div className="form-grid" style={{ marginBottom: '30px' }}>
                <div className="form-group autocomplete-container" style={{ width: '400px' }}>
                    <label>Lookup POS Customer</label>
                    <input
                        type="text"
                        className="form-input"
                        value={customerSearch}
                        onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setSelectedCustomer(null);
                            setCreditNotes([]);
                        }}
                        placeholder="Type Customer Code..."
                    />
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

            {selectedCustomer && (
                <div style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', marginBottom: '20px' }}>Active Pending Cash Refunds</h3>
                    <p style={{ color: '#64748b', marginBottom: '20px' }}>Issue physical cash to close out the specific return nodes below.</p>

                    {creditNotes.length === 0 ? <p style={{ color: '#64748b', fontSize: '18px' }}>✅ No pending cash returns require refunds for this customer.</p> : (
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>RTN Number</th>
                                    <th>Orig. Invoice</th>
                                    <th style={{ textAlign: 'right' }}>Refund Amount (LKR)</th>
                                    <th style={{ textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {creditNotes.map(cn => (
                                    <tr key={cn.id}>
                                        <td>{cn.return_number}</td>
                                        <td>{cn.original_invoice_number}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#10b981', fontSize: '18px' }}>
                                            {parseFloat(cn.total_amount).toFixed(2)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button onClick={() => handleIssueRefund(cn)} disabled={isSaving} className="btn-primary" style={{ backgroundColor: '#059669', padding: '8px 16px' }}>
                                                $$ Issue Cash
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
