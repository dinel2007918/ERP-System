import { useState, useEffect } from "react";

export default function PurchaseInvoiceManagement() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const res = await fetch("http://localhost:5005/api/purchase-invoices/management");
            const data = await res.json();
            setInvoices(data);
        } catch (e) {
            console.error("Failed to load invoices", e);
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="form-container" style={{ maxWidth: '1400px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="form-title" style={{ color: '#047857', margin: 0 }}>Purchase Invoice Management</h2>
            </div>

            <div className="form-group" style={{ maxWidth: '400px' }}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Search by Invoice # or Supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <table className="custom-table">
                <thead>
                    <tr>
                        <th>Invoice #</th>
                        <th>Supplier</th>
                        <th>Date</th>
                        <th>Total (LKR)</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredInvoices.map(inv => (
                        <tr key={inv.id}>
                            <td><strong>{inv.invoice_number}</strong></td>
                            <td>{inv.supplier_name}</td>
                            <td>{new Date(inv.date).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 'bold' }}>{parseFloat(inv.grand_total).toFixed(2)}</td>
                            <td>
                                <span style={{
                                    padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                                    backgroundColor: inv.status === 'completed' ? '#dcfce7' : '#fee2e2',
                                    color: inv.status === 'completed' ? '#15803d' : '#b91c1c'
                                }}>
                                    {inv.status}
                                </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                <button className="btn-secondary" style={{ marginRight: '10px' }}>Print</button>
                                <button className="btn-secondary" style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                                    Return
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filteredInvoices.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>No invoices found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
