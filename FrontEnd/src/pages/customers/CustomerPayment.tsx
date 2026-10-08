import { useState, useEffect } from "react";

export default function CustomerPayment() {
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [showCustDropdown, setShowCustDropdown] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [invoices, setInvoices] = useState<any[]>([]);

    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [paymentAmount, setPaymentAmount] = useState("");

    // Cheque specific fields
    const [chequeNumber, setChequeNumber] = useState("");
    const [chequeBank, setChequeBank] = useState("");
    const [chequeDate, setChequeDate] = useState("");

    const [allocations, setAllocations] = useState<Record<string, string>>({});
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
        fetchInvoices(cust.id);
    };

    const fetchInvoices = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:5005/api/customers/${id}/inquiry`);
            const data = await res.json();
            if (data.success && data.ledger) {
                // Filter exclusively for invoices that actually owe money
                const unpaid = data.ledger.invoices.filter((i: any) => parseFloat(i.balance) > 0);
                setInvoices(unpaid);

                // Reset allocations
                const initialAllocs: Record<string, string> = {};
                unpaid.forEach((inv: any) => initialAllocs[inv.id] = "0");
                setAllocations(initialAllocs);
            }
        } catch (e) {
            alert("Failed to fetch pending invoices.");
        }
    };

    const handleAutoAllocate = () => {
        let remaining = parseFloat(paymentAmount || "0");
        if (remaining <= 0) return alert("Enter a valid payment amount first!");

        const newAllocs = { ...allocations };
        for (const inv of invoices) {
            const bal = parseFloat(inv.balance);
            if (remaining >= bal) {
                newAllocs[inv.id] = bal.toFixed(2);
                remaining -= bal;
            } else if (remaining > 0) {
                newAllocs[inv.id] = remaining.toFixed(2);
                remaining = 0;
            } else {
                newAllocs[inv.id] = "0";
            }
        }
        setAllocations(newAllocs);

        if (remaining > 0) {
            alert(`Note: LKR ${remaining.toFixed(2)} remains unallocated! It will be stored as generic credit unless manually assigned.`);
        }
    };

    const handleSubmitPayment = async () => {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) return alert("Invalid amount.");

        if (paymentMethod === 'Cheque') {
            if (!chequeNumber || !chequeBank || !chequeDate) {
                return alert("Cheque tracking requires Number, Bank, and Date.");
            }
        }

        // Calculate mapped
        let mappedTotal = 0;
        const targetInvoices: any = {};
        for (const [id, val] of Object.entries(allocations)) {
            const applied = parseFloat(val);
            if (applied > 0) {
                targetInvoices[id] = applied;
                mappedTotal += applied;
            }
        }

        if (mappedTotal > amount) {
            return alert("You have allocated MORE cash than the actual Payment Amount!");
        }

        setIsSaving(true);
        try {
            const res = await fetch("http://localhost:5005/api/payments", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: selectedCustomer.id,
                    paymentMethod,
                    amount,
                    chequeNumber,
                    chequeBank,
                    chequeDate,
                    targetInvoices
                })
            });
            const data = await res.json();
            if (data.success) {
                alert("Payment processed successfully!");
                setSelectedCustomer(null);
                setCustomerSearch("");
                setPaymentAmount("");
                setChequeNumber("");
                setChequeBank("");
                setChequeDate("");
            } else {
                alert(data.message || "Payment processing failed.");
            }
        } catch (e) {
            alert("Network Error.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '1000px', margin: 'auto' }}>
            <h2 className="form-title" style={{ color: '#047857' }}>Customer Payment Terminal</h2>

            <div className="form-grid" style={{ marginBottom: '30px', gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group autocomplete-container">
                    <label>🔍 Lookup Active Customer</label>
                    <input
                        type="text"
                        className="form-input"
                        value={customerSearch}
                        onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setSelectedCustomer(null);
                            setInvoices([]);
                        }}
                        placeholder="Type Customer Code..."
                    />
                    {showCustDropdown && customerResults.length > 0 && (
                        <div className="autocomplete-dropdown">
                            {customerResults.map(cust => (
                                <div key={cust.id} className="autocomplete-item" onClick={() => handleSelectCustomer(cust)}>
                                    {cust.customer_code} - <strong>{cust.customer_name}</strong>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selectedCustomer && (
                    <div style={{ padding: '15px', backgroundColor: '#ecfdf5', borderRadius: '4px', border: '1px solid #10b981' }}>
                        <p style={{ margin: 0, fontWeight: 'bold', color: '#065f46' }}>Selected Profile: {selectedCustomer.customer_name}</p>
                        <p style={{ margin: 0, color: '#047857', fontSize: '14px' }}>Code: {selectedCustomer.customer_code}</p>
                    </div>
                )}
            </div>

            {selectedCustomer && (
                <>
                    <h3 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '10px' }}>1. Physical Payment Tender</h3>
                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                        <div className="form-group">
                            <label>Payment Method</label>
                            <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                <option value="Cash">Cash</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cheque">Bank Cheque</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Total Payment (LKR)</label>
                            <input type="number" className="form-input" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" />
                        </div>
                        <div className="form-group">
                            <label>&nbsp;</label>
                            <button onClick={handleAutoAllocate} className="btn-secondary" style={{ padding: '9px 15px' }}>Auto-Allocate Down</button>
                        </div>
                    </div>

                    {paymentMethod === 'Cheque' && (
                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', backgroundColor: '#fffbeb', padding: '20px', borderRadius: '8px', border: '1px solid #fcd34d', marginBottom: '30px' }}>
                            <div className="form-group">
                                <label>Cheque Number</label>
                                <input type="text" className="form-input" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Bank / Branch</label>
                                <input type="text" className="form-input" value={chequeBank} onChange={e => setChequeBank(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Cheque Date</label>
                                <input type="date" className="form-input" value={chequeDate} onChange={e => setChequeDate(e.target.value)} />
                            </div>
                        </div>
                    )}

                    <h3 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '10px' }}>2. Offset / Application Matrix</h3>

                    {invoices.length === 0 ? <p style={{ color: '#64748b' }}>Customer currently has NO outstanding invoices.</p> : (
                        <table className="custom-table" style={{ marginBottom: '30px' }}>
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Date</th>
                                    <th style={{ textAlign: 'right' }}>Grand Total</th>
                                    <th style={{ textAlign: 'right' }}>Active Balance Due</th>
                                    <th style={{ textAlign: 'right', width: '250px' }}>Amount to Apply</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(inv => (
                                    <tr key={inv.id}>
                                        <td>{inv.invoice_number}</td>
                                        <td>{new Date(inv.date).toLocaleDateString()}</td>
                                        <td style={{ textAlign: 'right' }}>{parseFloat(inv.grand_total).toFixed(2)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#b91c1c' }}>{parseFloat(inv.balance).toFixed(2)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <input
                                                type="number"
                                                className="form-input"
                                                style={{ textAlign: 'right', padding: '4px 8px' }}
                                                value={allocations[inv.id]}
                                                onChange={(e) => setAllocations({ ...allocations, [inv.id]: e.target.value })}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <div style={{ textAlign: 'right' }}>
                        <button onClick={handleSubmitPayment} disabled={isSaving || invoices.length === 0 || !paymentAmount} className="btn-primary" style={{ backgroundColor: '#059669', fontSize: '16px', padding: '12px 30px' }}>
                            {isSaving ? "Authorizing..." : "PROCESS SECURE PAYMENT >>"}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
