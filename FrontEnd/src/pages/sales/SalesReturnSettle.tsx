import { useState, useEffect } from "react";

export default function SalesReturnSettle() {
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [showCustDropdown, setShowCustDropdown] = useState(false);

    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [creditNotes, setCreditNotes] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);

    // For Credit Customers
    const [selectedCreditNote, setSelectedCreditNote] = useState<any>(null);
    const [invoiceMappings, setInvoiceMappings] = useState<{ [key: number]: number }>({});

    // For Cash Customers
    const [selectedCashRefund, setSelectedCashRefund] = useState<any>(null);

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
                setInvoices(data.invoices);
            }
        } catch (e) {
            alert("Failed to fetch settlements.");
        }
    };

    // Credit Flow Logic
    const remainingCredit = selectedCreditNote
        ? parseFloat(selectedCreditNote.total_amount) - Object.values(invoiceMappings).reduce((a, b) => a + b, 0)
        : 0;

    const handleMapInvoice = (invId: string, balance: string, val: string) => {
        const num = parseFloat(val) || 0;
        const bal = parseFloat(balance);

        // Prevent assigning more than the invoice balance
        if (num > bal) return;

        // Prevent assigning more than available credit
        const currentMapping = invoiceMappings[invId as any] || 0;
        const potentialRemaining = remainingCredit + currentMapping - num;

        if (potentialRemaining < 0) return;

        setInvoiceMappings(prev => ({
            ...prev,
            [invId]: num
        }));
    };

    const handleSettleCredit = async () => {
        if (!selectedCreditNote) return alert("Select a Credit Note.");
        const mappedAmount = Object.values(invoiceMappings).reduce((a, b) => a + b, 0);
        if (mappedAmount <= 0) return alert("Assign credit to at least one invoice.");

        setIsSaving(true);
        try {
            const res = await fetch("http://localhost:5005/api/sales-returns/settle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId: selectedCustomer.id,
                    creditNoteId: selectedCreditNote.id,
                    targetInvoices: invoiceMappings
                })
            });
            const data = await res.json();
            if (data.success) {
                alert("Settled Successfully!");
                setSelectedCreditNote(null);
                setInvoiceMappings({});
                fetchSettlements(selectedCustomer.id); // refresh
            } else {
                alert(data.message || "Failed.");
            }
        } catch (e) {
            alert("Network error.");
        } finally {
            setIsSaving(false);
        }
    };

    // Cash Refund Flow Logic
    const handleIssueRefund = async () => {
        if (!selectedCashRefund) return;

        if (window.confirm("Confirm you want to issue Cash Refund?")) {
            setIsSaving(true);
            try {
                const res = await fetch(`http://localhost:5005/api/sales-returns/${selectedCashRefund.id}/refund`, {
                    method: "PUT"
                });
                const data = await res.json();
                if (data.success) {
                    alert("Cash Refund Issued!");
                    setSelectedCashRefund(null);
                    fetchSettlements(selectedCustomer.id);
                } else alert("Failed to issue refund.");
            } catch (e) { alert("Network Error."); }
            finally { setIsSaving(false); }
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '1200px', margin: 'auto' }}>
            <h2 className="form-title">Sales Return Settlement</h2>

            <div className="form-grid" style={{ marginBottom: '30px' }}>
                <div className="form-group autocomplete-container" style={{ width: '400px' }}>
                    <label>Customer Search</label>
                    <input
                        type="text"
                        className="form-input"
                        value={customerSearch}
                        onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setSelectedCustomer(null);
                            setCreditNotes([]);
                            setInvoices([]);
                            setSelectedCreditNote(null);
                            setInvoiceMappings({});
                            setSelectedCashRefund(null);
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
                <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 10px', color: '#1e3a8a' }}>Active Customer Profile</h3>
                    <p style={{ margin: 0 }}><strong>Name:</strong> {selectedCustomer.customer_name}</p>
                    <p style={{ margin: '4px 0 0' }}><strong>Payment Type:</strong> {selectedCustomer.default_payment_type}</p>
                </div>
            )}

            {selectedCustomer && selectedCustomer.default_payment_type === 'Credit' && (
                <div style={{ display: 'flex', gap: '30px' }}>

                    {/* Left Pane: Credit Notes */}
                    <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', marginBottom: '20px' }}>Pending Credit Notes</h3>
                        {creditNotes.length === 0 ? <p style={{ color: '#64748b' }}>No pending credit notes.</p> : (
                            <table className="custom-table" style={{ fontSize: '13px' }}>
                                <thead>
                                    <tr>
                                        <th>RTN Number</th>
                                        <th>Orig. Invoice</th>
                                        <th>Total</th>
                                        <th>Select</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {creditNotes.map(cn => (
                                        <tr key={cn.id} style={{ backgroundColor: selectedCreditNote?.id === cn.id ? '#dbeafe' : 'transparent' }}>
                                            <td>{cn.return_number}</td>
                                            <td>{cn.original_invoice_number}</td>
                                            <td style={{ fontWeight: 'bold' }}>{parseFloat(cn.total_amount).toFixed(2)}</td>
                                            <td>
                                                <button onClick={() => { setSelectedCreditNote(cn); setInvoiceMappings({}); }} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>Assign</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {selectedCreditNote && (
                            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#bfdbfe', borderRadius: '6px' }}>
                                <strong>Active Credit Note:</strong> {selectedCreditNote.return_number}<br />
                                <span style={{ fontSize: '18px', fontWeight: 'bold', display: 'block', marginTop: '10px' }}>Remaining Credit: LKR {remainingCredit.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {/* Right Pane: Invoices */}
                    <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', marginBottom: '20px' }}>Unpaid Invoices</h3>
                        {invoices.length === 0 ? <p style={{ color: '#64748b' }}>No unpaid invoices found.</p> : (
                            <table className="custom-table" style={{ fontSize: '13px' }}>
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Wait Balance</th>
                                        <th style={{ width: '120px' }}>Apply (LKR)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map(inv => (
                                        <tr key={inv.id}>
                                            <td>{inv.invoice_number}</td>
                                            <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{parseFloat(inv.balance).toFixed(2)}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ padding: '4px', textAlign: 'right' }}
                                                    value={invoiceMappings[inv.id as any] || ''}
                                                    onChange={e => handleMapInvoice(inv.id, inv.balance, e.target.value)}
                                                    disabled={!selectedCreditNote}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <div style={{ textAlign: 'right', marginTop: '20px' }}>
                            <button onClick={handleSettleCredit} disabled={!selectedCreditNote || isSaving} className="btn-primary" style={{ backgroundColor: '#10b981' }}>Process Settlement</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedCustomer && selectedCustomer.default_payment_type === 'Cash' && (
                <div style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', marginBottom: '20px' }}>Cash Refund Module</h3>
                    <p style={{ color: '#64748b', marginBottom: '20px' }}>Cash customers require direct manual refunds instead of invoice offsetting.</p>

                    {creditNotes.length === 0 ? <p style={{ color: '#64748b' }}>No pending cash returns require refunds.</p> : (
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>RTN Number</th>
                                    <th>Orig. Invoice</th>
                                    <th>Refund Amount</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {creditNotes.map(cn => (
                                    <tr key={cn.id}>
                                        <td>{cn.return_number}</td>
                                        <td>{cn.original_invoice_number}</td>
                                        <td style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '16px' }}>{parseFloat(cn.total_amount).toFixed(2)}</td>
                                        <td>
                                            <button onClick={() => { setSelectedCashRefund(cn); handleIssueRefund(); }} disabled={isSaving} className="btn-primary">
                                                Issue Cash
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
