import { useState, useEffect } from "react";

export default function PurchaseReturnSettle() {
    const [supplierSearch, setSupplierSearch] = useState("");
    const [supplierResults, setSupplierResults] = useState<any[]>([]);
    const [showSupDropdown, setShowSupDropdown] = useState(false);

    const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
    const [debitNotes, setDebitNotes] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);

    // For Credit Suppliers
    const [selectedDebitNote, setSelectedDebitNote] = useState<any>(null);
    const [invoiceMappings, setInvoiceMappings] = useState<{ [key: number]: number }>({});

    // For Cash Suppliers
    const [selectedCashRefund, setSelectedCashRefund] = useState<any>(null);

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const dly = setTimeout(() => {
            if (supplierSearch.trim().length > 1 && !selectedSupplier) {
                fetch(`http://localhost:5005/api/suppliers/search?q=${supplierSearch}`)
                    .then(res => res.json())
                    .then(data => {
                        if (Array.isArray(data)) {
                            setSupplierResults(data);
                            setShowSupDropdown(true);
                        }
                    });
            } else {
                setShowSupDropdown(false);
            }
        }, 300);
        return () => clearTimeout(dly);
    }, [supplierSearch, selectedSupplier]);

    const handleSelectSupplier = async (sup: any) => {
        setSelectedSupplier(sup);
        setSupplierSearch(sup.supplier_name);
        setShowSupDropdown(false);
        fetchSettlements(sup.id);
    };

    const fetchSettlements = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:5005/api/purchase-returns/supplier/${id}/settlements`);
            const data = await res.json();
            if (data.success) {
                setDebitNotes(data.creditNotes || []);
                setInvoices(data.invoices || []);
            }
        } catch (e) {
            alert("Failed to fetch settlements.");
        }
    };

    // Credit Flow Logic
    const remainingDebit = selectedDebitNote
        ? parseFloat(selectedDebitNote.total_amount) - Object.values(invoiceMappings).reduce((a, b) => a + b, 0)
        : 0;

    const handleMapInvoice = (invId: string, balance: string, val: string) => {
        const num = parseFloat(val) || 0;
        const bal = parseFloat(balance);

        // Prevent assigning more than the invoice balance
        if (num > bal) return;

        // Prevent assigning more than available credit
        const currentMapping = invoiceMappings[invId as any] || 0;
        const potentialRemaining = remainingDebit + currentMapping - num;

        if (potentialRemaining < 0) return;

        setInvoiceMappings(prev => ({
            ...prev,
            [invId]: num
        }));
    };

    const handleSettleCredit = async () => {
        if (!selectedDebitNote) return alert("Select a Debit Note.");
        const mappedAmount = Object.values(invoiceMappings).reduce((a, b) => a + b, 0);
        if (mappedAmount <= 0) return alert("Assign credit to at least one invoice.");

        setIsSaving(true);
        try {
            const res = await fetch("http://localhost:5005/api/purchase-returns/settle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    supplierId: selectedSupplier.id,
                    debitNoteId: selectedDebitNote.id,
                    targetInvoices: invoiceMappings
                })
            });
            const data = await res.json();
            if (data.success) {
                alert("Settled Successfully!");
                setSelectedDebitNote(null);
                setInvoiceMappings({});
                fetchSettlements(selectedSupplier.id); // refresh
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
                const res = await fetch(`http://localhost:5005/api/purchase-returns/${selectedCashRefund.id}/refund`, {
                    method: "PUT"
                });
                const data = await res.json();
                if (data.success) {
                    alert("Cash Refund Issued!");
                    setSelectedCashRefund(null);
                    fetchSettlements(selectedSupplier.id);
                } else alert("Failed to issue refund.");
            } catch (e) { alert("Network Error."); }
            finally { setIsSaving(false); }
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '1200px', margin: 'auto' }}>
            <h2 className="form-title">Purchase Return Settlement</h2>

            <div className="form-grid" style={{ marginBottom: '30px' }}>
                <div className="form-group autocomplete-container" style={{ width: '400px' }}>
                    <label>Supplier Search</label>
                    <input
                        type="text"
                        className="form-input"
                        value={supplierSearch}
                        onChange={(e) => {
                            setSupplierSearch(e.target.value);
                            setSelectedSupplier(null);
                            setDebitNotes([]);
                            setInvoices([]);
                            setSelectedDebitNote(null);
                            setInvoiceMappings({});
                            setSelectedCashRefund(null);
                        }}
                        placeholder="Type Supplier Code..."
                    />
                    {showSupDropdown && supplierResults.length > 0 && (
                        <div className="autocomplete-dropdown">
                            {supplierResults.map(sup => (
                                <div key={sup.id} className="autocomplete-item" onClick={() => handleSelectSupplier(sup)}>
                                    {sup.supplier_code} - <strong>{sup.supplier_name}</strong> [{sup.default_payment_type}]
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedSupplier && (
                <div style={{ display: 'flex', gap: '30px' }}>

                    {/* Left Pane: Debit Notes */}
                    <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', marginBottom: '20px' }}>Pending Debit Notes</h3>
                        {debitNotes.filter(n => n.return_type === 'CREDIT_NOTE').length === 0 ? <p style={{ color: '#64748b' }}>No pending credit notes.</p> : (
                            <table className="custom-table" style={{ fontSize: '13px' }}>
                                <thead>
                                    <tr>
                                        <th>RTN Number</th>
                                        <th>Total</th>
                                        <th>Select</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {debitNotes.filter(n => n.return_type === 'CREDIT_NOTE').map(cn => (
                                        <tr key={cn.id} style={{ backgroundColor: selectedDebitNote?.id === cn.id ? '#dbeafe' : 'transparent' }}>
                                            <td>{cn.return_number}</td>
                                            <td style={{ fontWeight: 'bold' }}>{parseFloat(cn.total_amount).toFixed(2)}</td>
                                            <td>
                                                <button onClick={() => { setSelectedDebitNote(cn); setInvoiceMappings({}); }} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>Assign</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {selectedDebitNote && (
                            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#bfdbfe', borderRadius: '6px' }}>
                                <strong>Active Debit Note:</strong> {selectedDebitNote.return_number}<br />
                                <span style={{ fontSize: '18px', fontWeight: 'bold', display: 'block', marginTop: '10px' }}>Remaining Credit: LKR {remainingDebit.toFixed(2)}</span>
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
                                                    disabled={!selectedDebitNote}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <div style={{ textAlign: 'right', marginTop: '20px' }}>
                            <button onClick={handleSettleCredit} disabled={!selectedDebitNote || isSaving} className="btn-primary" style={{ backgroundColor: '#10b981' }}>Process Settlement</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedSupplier && (
                <div style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '30px' }}>
                    <h3 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', marginBottom: '20px' }}>Cash Refund Module</h3>
                    <p style={{ color: '#64748b', marginBottom: '20px' }}>Process direct manual cash returns collected immediately from the supplier.</p>

                    {debitNotes.filter(n => n.return_type === 'CASH_REFUND').length === 0 ? <p style={{ color: '#64748b' }}>No pending cash returns require refunds.</p> : (
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>RTN Number</th>
                                    <th>Refund Amount</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {debitNotes.filter(n => n.return_type === 'CASH_REFUND').map(cn => (
                                    <tr key={cn.id}>
                                        <td>{cn.return_number}</td>
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
