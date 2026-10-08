import { useState, useEffect } from "react";

export default function SupplierPayment() {
    const [supplierSearch, setSupplierSearch] = useState("");
    const [supplierResults, setSupplierResults] = useState<any[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // Ledger state
    const [invoices, setInvoices] = useState<any[]>([]);
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [amountToPay, setAmountToPay] = useState("");

    // Cheque Info
    const [chequeNumber, setChequeNumber] = useState("");
    const [chequeBank, setChequeBank] = useState("");
    const [chequeDate, setChequeDate] = useState("");

    // Supplier Lookup
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
                    console.error(error);
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

        try {
            const res = await fetch(`http://localhost:5005/api/suppliers/${s.id}/inquiry`);
            const data = await res.json();
            if (data.success) {
                setInvoices(data.ledger.invoices.filter((i: any) => i.status === 'completed' && parseFloat(i.balance) > 0));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSavePayment = async () => {
        if (!selectedSupplier) return alert("Select a supplier first.");
        const payAmount = parseFloat(amountToPay) || 0;

        if (payAmount <= 0) return alert("Enter a valid payment amount.");
        if (paymentMethod === 'CHEQUE' && (!chequeNumber || !chequeBank)) {
            return alert("Cheque Number and Bank are required for Cheque payments.");
        }

        const payload = {
            supplierId: selectedSupplier.id,
            amount: payAmount,
            paymentMethod,
            chequeNumber,
            chequeBank,
            chequeDate
        };

        try {
            const res = await fetch("http://localhost:5005/api/suppliers/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                // Reset
                setSelectedSupplier(null);
                setAmountToPay("");
                setInvoices([]);
            } else {
                alert(data.message);
            }
        } catch (e) {
            alert("Network Error");
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '1200px' }}>
            <h2 className="form-title">Supplier Payments & Settlements</h2>

            <div className="form-group autocomplete-container" style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <label>Select Supplier to Pay</label>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* LEFT PANEL: Invoices */}
                    <div>
                        <h3 style={{ color: '#047857' }}>Active Payables (Purchase Invoices)</h3>
                        <table className="custom-table" style={{ fontSize: '12px' }}>
                            <thead>
                                <tr>
                                    <th>Inv #</th>
                                    <th>Date</th>
                                    <th>Total</th>
                                    <th>Bal Due</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(i => (
                                    <tr key={i.id}>
                                        <td>{i.invoice_number}</td>
                                        <td>{new Date(i.date).toLocaleDateString()}</td>
                                        <td>{i.grand_total}</td>
                                        <td style={{ color: 'red', fontWeight: 'bold' }}>{parseFloat(i.balance).toFixed(2)}</td>
                                    </tr>
                                ))}
                                {invoices.length === 0 && <tr><td colSpan={4}>No active payables.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* RIGHT PANEL: Payment Form */}
                    <div className="form-grid" style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '8px', border: '1px solid #bbf7d0', height: 'fit-content' }}>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Amount to Pay (LKR)</label>
                            <input
                                type="number"
                                className="form-input"
                                style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534' }}
                                value={amountToPay}
                                onChange={e => setAmountToPay(e.target.value)}
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Payment Method</label>
                            <select className="form-input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                <option value="CASH">Cash</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="CHEQUE">Cheque</option>
                            </select>
                        </div>

                        {paymentMethod === 'CHEQUE' && (
                            <>
                                <div className="form-group">
                                    <label>Cheque Number</label>
                                    <input type="text" className="form-input" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Cheque Bank</label>
                                    <input type="text" className="form-input" value={chequeBank} onChange={e => setChequeBank(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>Cheque Date</label>
                                    <input type="date" className="form-input" value={chequeDate} onChange={e => setChequeDate(e.target.value)} />
                                </div>
                            </>
                        )}

                        <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '20px' }}>
                            <button className="btn-primary" style={{ width: '100%', padding: '15px', backgroundColor: '#166534' }} onClick={handleSavePayment}>
                                PROCESS SECURE PAYMENT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
