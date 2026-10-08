import { useState, useEffect } from "react";

export default function PendingOrders({ setPage, setPassData }: any) {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch("http://localhost:5005/api/sales-orders/pending");
                const data = await res.json();
                if (data.success) {
                    setOrders(data.orders);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const handleCreateInvoice = (order: any) => {
        // Pass the entire order object through props/context to auto-populate Sales Invoice
        if (setPassData) {
            setPassData({
                source: "SALES_ORDER",
                orderId: order.id
            });
        }
        setPage("invoice");
    };

    const handleCancelOrder = async (orderId: number) => {
        if (!window.confirm("Are you sure you want to completely cancel this order and release all requested stock?")) return;

        try {
            const res = await fetch(`http://localhost:5005/api/sales-orders/${orderId}/cancel`, { method: "POST" });
            const data = await res.json();
            if (data.success) {
                alert("Order successfully cancelled and stock released.");
                setOrders(orders.filter(o => o.id !== orderId));
            } else {
                alert(data.message || "Failed to cancel");
            }
        } catch (err) {
            alert("Network Error");
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '1200px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="form-title">Pending Sales Orders</h2>
                <button type="button" className="btn-secondary" onClick={() => setPage("sales-order")}>
                    + New Sales Order
                </button>
            </div>

            {loading ? <p>Loading pending orders...</p> : (
                <div className="table-responsive" style={{ overflowX: 'auto', marginTop: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Order No</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Customer</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>PO Num</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>Grand Total</th>
                                <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '15px' }}>No pending orders found.</td>
                                </tr>
                            )}
                            {orders.map(order => (
                                <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px' }}><strong>{order.order_number}</strong></td>
                                    <td style={{ padding: '12px' }}>{new Date(order.order_date).toLocaleDateString()}</td>
                                    <td style={{ padding: '12px' }}>{order.customer_code} - {order.customer_name}</td>
                                    <td style={{ padding: '12px' }}>{order.po_number || '-'}</td>
                                    <td style={{ padding: '12px', textAlign: 'right' }}>{parseFloat(order.grand_total).toFixed(2)}</td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <span style={{ backgroundColor: order.status === 'PENDING' ? '#fef08a' : '#bfdbfe', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleCreateInvoice(order)}>
                                            Create Invoice
                                        </button>
                                        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#fee2e2', color: '#ef4444', borderColor: '#fca5a5' }} onClick={() => handleCancelOrder(order.id)}>
                                            Cancel
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
