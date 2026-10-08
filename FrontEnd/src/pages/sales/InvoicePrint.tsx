import { useState, useEffect } from 'react';

export default function InvoicePrint({ invoiceId, onBack }: { invoiceId: string, onBack: () => void }) {
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const res = await fetch(`http://localhost:5005/api/sales-invoices/${invoiceId}`);
                const data = await res.json();
                if (data.success) {
                    setInvoice(data.invoice);
                } else {
                    alert("Failed to fetch invoice");
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [invoiceId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading Receipt...</div>;
    if (!invoice) return <div style={{ padding: '20px' }}>Invoice not found</div>;

    const formattedDate = new Date(invoice.invoice_date).toLocaleDateString();

    return (
        <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '20px', fontFamily: '"Inter", sans-serif' }}>

            {/* Non-printable action bar */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', maxWidth: '800px', margin: '0 auto 20px auto' }}>
                <button onClick={onBack} className="btn-secondary">🔙 Back</button>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handlePrint} className="btn-primary" style={{ backgroundColor: '#10b981' }}>🖨️ Print / Save as PDF</button>
                </div>
            </div>

            {/* Printable A4 Paper Layout */}
            <div className="printable-invoice" style={{ position: 'relative', overflow: 'hidden', maxWidth: '800px', margin: 'auto', backgroundColor: '#fff', padding: '40px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderRadius: '8px' }}>

                {invoice.status === 'CANCELED' && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-45deg)',
                        fontSize: '120px',
                        color: 'rgba(239, 68, 68, 0.15)',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        pointerEvents: 'none',
                        zIndex: 0,
                        whiteSpace: 'nowrap',
                        letterSpacing: '10px'
                    }}>
                        CANCELED
                    </div>
                )}

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '20px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '28px', color: '#1f2937', fontWeight: 800 }}>DINEL ERP</h1>
                        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>123 Main Street<br />Colombo, Sri Lanka<br />+94 77 123 4567</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 style={{ margin: 0, fontSize: '32px', color: '#3b82f6', letterSpacing: '1px' }}>INVOICE</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 'bold' }}>#{invoice.invoice_number}</p>
                        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Date: {formattedDate}</p>
                        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Status: {invoice.status}</p>
                    </div>
                </div>

                {/* Customer Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                    <div>
                        <h4 style={{ margin: '0 0 8px', color: '#9ca3af', textTransform: 'uppercase', fontSize: '12px' }}>Bill To</h4>
                        <h3 style={{ margin: 0, color: '#1f2937' }}>{invoice.customer_name}</h3>
                        <p style={{ margin: '4px 0 0', color: '#4b5563', fontSize: '14px' }}>{invoice.address}</p>
                        <p style={{ margin: '4px 0 0', color: '#4b5563', fontSize: '14px' }}>{invoice.contact_number}</p>
                        <p style={{ margin: '4px 0 0', color: '#4b5563', fontSize: '14px' }}>{invoice.email}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h4 style={{ margin: '0 0 8px', color: '#9ca3af', textTransform: 'uppercase', fontSize: '12px' }}>Payment Info</h4>
                        <p style={{ margin: '4px 0 0', color: '#4b5563', fontSize: '14px' }}><strong>Method:</strong> {invoice.payment_method}</p>
                        {invoice.sales_order_id && <p style={{ margin: '4px 0 0', color: '#4b5563', fontSize: '14px' }}><strong>Source SO:</strong> {invoice.sales_order_id}</p>}
                    </div>
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f9fafb', color: '#4b5563', fontSize: '13px', textTransform: 'uppercase' }}>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Item</th>
                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Qty</th>
                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Unit Price</th>
                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Discount</th>
                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items && invoice.items.map((item: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '12px', color: '#1f2937' }}>
                                    <strong>{item.item_code}</strong><br />
                                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{item.item_name}</span>
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', color: '#4b5563' }}>{item.quantity}</td>
                                <td style={{ padding: '12px', textAlign: 'right', color: '#4b5563' }}>{parseFloat(item.unit_price).toFixed(2)}</td>
                                <td style={{ padding: '12px', textAlign: 'right', color: '#4b5563' }}>{parseFloat(item.discount).toFixed(2)}</td>
                                <td style={{ padding: '12px', textAlign: 'right', color: '#1f2937', fontWeight: 600 }}>{parseFloat(item.line_total).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
                    <div style={{ width: '300px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#6b7280' }}>Subtotal</span>
                            <span style={{ fontWeight: 500 }}>{parseFloat(invoice.subtotal).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#6b7280' }}>Total Discount</span>
                            <span style={{ fontWeight: 500 }}>{parseFloat(invoice.discount).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>
                            <span>Grand Total</span>
                            <span>{parseFloat(invoice.grand_total).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                            <span style={{ color: '#6b7280' }}>Amount Paid</span>
                            <span style={{ fontWeight: 500 }}>{parseFloat(invoice.amount_paid).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: (parseFloat(invoice.grand_total) - parseFloat(invoice.amount_paid)) > 0 ? '#ef4444' : '#10b981' }}>
                            <span style={{ fontWeight: 'bold' }}>Balance Due</span>
                            <span style={{ fontWeight: 'bold' }}>{(parseFloat(invoice.grand_total) - parseFloat(invoice.amount_paid)).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Notes */}
                <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', fontSize: '13px', color: '#9ca3af', textAlign: 'center' }}>
                    Thank you for your business. For any inquiries, please contact us at info@dinelerp.com.
                </div>
            </div>

            <style>
                {`
                @media print {
                    body {
                        visibility: hidden;
                        background: #fff;
                    }
                    .no-print {
                        display: none !important;
                    }
                    /* Since our component is nested inside the app structure, we must make sure IT takes over the screen */
                    .printable-invoice {
                        visibility: visible;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        -webkit-print-color-adjust: exact; 
                    }
                    /* Force hiding everything else globally during print */
                    .sidebar, .header-container {
                        display: none !important;
                    }
                }
                `}
            </style>
        </div>
    );
}
