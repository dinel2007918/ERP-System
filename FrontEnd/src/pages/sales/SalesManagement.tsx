import { useState, useEffect } from 'react';

export default function SalesManagement({ setPage, setPassData }: any) {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const res = await fetch("http://localhost:5005/api/sales-invoices");
            const data = await res.json();
            if (data.success) {
                setInvoices(data.invoices);
            }
        } catch (err) {
            console.error("Failed to fetch invoices", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = (id: string) => {
        if (setPassData && setPage) {
            setPassData({ invoiceId: id });
            setPage("invoice-print");
        }
    };



    const filteredInvoices = invoices.filter(inv =>
        (inv.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.invoice_number || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="form-container" style={{ maxWidth: '1400px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="form-title">Sales Invoice Management</h2>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Search Customer or Invoice #..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '300px' }}
                />
            </div>

            {loading ? (
                <div>Loading Invoices...</div>
            ) : (
                <div className="table-container">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Grand Total</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td><strong>{inv.invoice_number}</strong></td>
                                    <td>{inv.customer_name || 'N/A'}</td>
                                    <td>{new Date(inv.date).toLocaleDateString()}</td>
                                    <td style={{ fontWeight: 'bold' }}>{parseFloat(inv.grand_total).toFixed(2)}</td>
                                    <td>
                                        <span style={{
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                                            backgroundColor: inv.status === 'POSTED' ? '#d1fae5' : inv.status === 'CANCELED' ? '#fee2e2' : '#fef3c7',
                                            color: inv.status === 'POSTED' ? '#065f46' : inv.status === 'CANCELED' ? '#991b1b' : '#92400e'
                                        }}>
                                            {inv.status === 'POSTED' ? 'ACTIVE' : inv.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button onClick={() => handlePreview(inv.id)} className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }}>Preview</button>
                                        <button onClick={() => { setPassData({ invoiceNumber: inv.invoice_number }); setPage('customerbill'); }} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: '#e2e8f0', color: '#1e293b' }}>Return</button>
                                        {inv.status !== 'CANCELED' && (
                                            <button onClick={() => { setPassData({ invoiceNumber: inv.invoice_number }); setPage('cashbill'); }} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>Cancel</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No invoices found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
