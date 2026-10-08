import { useState, useEffect } from 'react';

export default function SalesCancel({ passData, setPage }: any) {
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [invoice, setInvoice] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (passData && passData.invoiceNumber) {
            setInvoiceNumber(passData.invoiceNumber);
            handleSearch(passData.invoiceNumber);
        }
    }, [passData]);

    const handleSearch = async (target = invoiceNumber) => {
        if (!target) return;
        try {
            const res = await fetch(`http://localhost:5005/api/sales-returns/invoice/${target}`);
            const data = await res.json();
            if (data.success) {
                setInvoice(data.invoice);
            } else {
                alert("Invoice not found.");
            }
        } catch (err) {
            alert("Network error.");
        }
    };

    const handleCancelInvoice = async () => {
        if (!invoice) return;

        const confirmCancel = window.confirm(`WARNING: You are about to permanently CANCEL invoice ${invoice.invoice_number}.\n\nThis will reverse all associated stock quantities and cannot be undone. Proceed?`);

        if (!confirmCancel) return;

        setIsSaving(true);
        try {
            const res = await fetch(`http://localhost:5005/api/sales-invoices/${invoice.id}/cancel`, {
                method: 'PUT'
            });
            const data = await res.json();
            if (data.success) {
                alert("Invoice Successfully Canceled!");
                if (setPage) setPage('sales-management');
                else window.location.reload();
            } else {
                alert(data.message || "Failed to cancel.");
            }
        } catch (e) {
            alert("Network Error during cancellation.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '800px', margin: 'auto' }}>
            <h2 className="form-title" style={{ color: '#991b1b' }}>Cancel Sales Invoice</h2>

            <div className="form-grid">
                <div className="form-group" style={{ flexDirection: 'row', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <label>Lookup Target Invoice Number</label>
                        <input
                            className="form-input"
                            type="text"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Enter Invoice # and press Enter..."
                        />
                    </div>
                </div>
            </div>

            {invoice && (
                <div style={{ marginTop: '30px', padding: '20px', borderRadius: '8px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #fca5a5', paddingBottom: '10px', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ margin: 0, color: '#7f1d1d' }}>Invoice: {invoice.invoice_number}</h3>
                            <p style={{ margin: '5px 0 0', color: '#991b1b' }}>Customer: <strong>{invoice.customer_name}</strong></p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>Status: {invoice.status}</p>
                            <p style={{ margin: '5px 0 0' }}>Date: {new Date(invoice.date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <table className="custom-table" style={{ fontSize: '13px', backgroundColor: '#fff', opacity: invoice.status === 'CANCELED' ? 0.6 : 1 }}>
                        <thead>
                            <tr>
                                <th>Item Code</th>
                                <th>Description</th>
                                <th style={{ textAlign: 'right' }}>Qty</th>
                                <th style={{ textAlign: 'right' }}>Line Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((itm: any, idx: number) => (
                                <tr key={idx}>
                                    <td>{itm.item_code}</td>
                                    <td>{itm.item_name}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(itm.quantity).toFixed(2)}</td>
                                    <td style={{ textAlign: 'right' }}>{parseFloat(itm.line_total).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7f1d1d' }}>
                            Grand Total: LKR {parseFloat(invoice.grand_total).toFixed(2)}
                        </div>

                        {invoice.status === 'CANCELED' ? (
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#991b1b', padding: '10px 20px', border: '2px dashed #991b1b', borderRadius: '4px' }}>
                                ALREADY CANCELED
                            </div>
                        ) : (
                            <button
                                className="btn-primary"
                                style={{ backgroundColor: '#dc2626', fontSize: '16px', padding: '10px 30px' }}
                                onClick={handleCancelInvoice}
                                disabled={isSaving}
                            >
                                {isSaving ? "Processing..." : "CONFIRM & CANCEL INVOICE"}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
