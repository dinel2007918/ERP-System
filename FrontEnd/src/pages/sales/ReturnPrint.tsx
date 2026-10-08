import { useEffect, useState } from 'react';

export default function ReturnPrint({ returnId, setPage }: any) {
    const [retData, setRetData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!returnId) return;
        fetch(`http://localhost:5005/api/sales-returns/${returnId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setRetData(data.returnRecord);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [returnId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div style={{ padding: '20px' }}>Generating Document...</div>;
    if (!retData) return <div style={{ padding: '20px' }}>Error Loading Document.</div>;

    const { status, return_type, total_amount, return_number, return_date, invoice_number, customer_name, items } = retData;

    return (
        <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '20px', position: 'relative' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', maxWidth: '800px', margin: '0 auto 20px auto' }}>
                <button onClick={() => setPage('sales-management')} className="btn-secondary">Back to Management</button>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handlePrint} className="btn-primary" style={{ backgroundColor: '#0f172a' }}>🖨️ Print Document</button>
                </div>
            </div>

            {/* Printable A4 Paper Layout */}
            <div className="printable-invoice" style={{ position: 'relative', overflow: 'hidden', maxWidth: '800px', margin: 'auto', backgroundColor: '#fff', padding: '40px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderRadius: '8px' }}>

                {status === 'REFUNDED' && return_type === 'CASH_REFUND' && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-45deg)',
                        fontSize: '90px',
                        color: 'rgba(34, 197, 94, 0.15)',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        pointerEvents: 'none',
                        zIndex: 0,
                        whiteSpace: 'nowrap',
                        letterSpacing: '5px'
                    }}>
                        CASH REFUNDED
                    </div>
                )}

                {status === 'SETTLED' && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-45deg)',
                        fontSize: '120px',
                        color: 'rgba(56, 189, 248, 0.15)',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        pointerEvents: 'none',
                        zIndex: 0,
                        whiteSpace: 'nowrap',
                        letterSpacing: '10px'
                    }}>
                        SETTLED
                    </div>
                )}

                {/* Header */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '20px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '28px', color: '#1e293b' }}>{return_type === 'CASH_REFUND' ? 'CASH REFUND Note' : 'CREDIT NOTE'}</h1>
                        <p style={{ margin: '5px 0 0', color: '#64748b' }}>Return #: <strong>{return_number}</strong></p>
                        <p style={{ margin: '5px 0 0', color: '#64748b' }}>Original Invoice: <strong>{invoice_number || 'N/A'}</strong></p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
                            <span style={{ fontWeight: 'bold' }}>Status:</span>
                            <span style={{
                                padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block',
                                backgroundColor: status === 'PENDING' ? '#fef3c7' : '#d1fae5',
                                color: status === 'PENDING' ? '#92400e' : '#065f46'
                            }}>
                                {status}
                            </span>
                        </div>
                        <p style={{ margin: '0', color: '#334155' }}><strong>Customer:</strong> {customer_name || 'N/A'}</p>
                        <p style={{ margin: '5px 0 0', color: '#64748b' }}>Date: {new Date(return_date).toLocaleString()}</p>
                    </div>
                </div>

                {/* Items Table */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                                <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569' }}>Item Code</th>
                                <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569' }}>Description</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right', color: '#475569' }}>Qty Returned</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right', color: '#475569' }}>Unit Price (Net)</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right', color: '#475569' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items && items.map((itm: any, index: number) => (
                                <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px 8px', color: '#1e293b' }}>{itm.item_code}</td>
                                    <td style={{ padding: '12px 8px', color: '#334155' }}>{itm.item_name}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>- {parseFloat(itm.quantity).toFixed(2)}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#334155' }}>{parseFloat(itm.unit_price).toFixed(2)}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', color: '#1e293b' }}>{parseFloat(itm.line_total).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals Section */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
                        <div style={{ width: '300px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
                                <span>TOTAL REFUND:</span>
                                <span>LKR {parseFloat(total_amount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
