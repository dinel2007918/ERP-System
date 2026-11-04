import { useEffect, useState } from "react";

export default function ToShip() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);

    const loadInvoices = async () => {
        setLoading(true);
        try {
            const response = await fetch("http://localhost:5005/api/sales-invoices/shipping");
            const data = await response.json();
            if (data.success) setInvoices(data.invoices);
            else alert(data.message || "Failed to load invoices to ship.");
        } catch {
            alert("Network error loading invoices to ship.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadInvoices(); }, []);

    const updateInvoice = async (invoice: any) => {
        setSavingId(invoice.id);
        try {
            const response = await fetch(`http://localhost:5005/api/sales-invoices/${invoice.id}/shipping`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    shippingMethod: invoice.shipping_method,
                    courierName: invoice.courier_name,
                    shippingStatus: "SHIPPED"
                })
            });
            const data = await response.json();
            if (!data.success) {
                alert(data.message || "Failed to update shipping status.");
                return;
            }
            setInvoices(current => current.filter(item => item.id !== invoice.id));
        } catch {
            alert("Network error updating shipping status.");
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: "1200px", margin: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 className="form-title">To Ship</h2>
                <button type="button" className="btn-secondary" onClick={loadInvoices} disabled={loading}>Refresh</button>
            </div>
            {loading ? <p>Loading invoices...</p> : invoices.length === 0 ? (
                <p style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>No posted invoices are waiting to ship.</p>
            ) : (
                <div className="table-responsive" style={{ overflowX: "auto" }}>
                    <table className="custom-table" style={{ minWidth: "850px" }}>
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th style={{ textAlign: "right" }}>Total</th>
                                <th>Shipping Method</th>
                                <th>Courier / Provider</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map(invoice => (
                                <tr key={invoice.id}>
                                    <td>{invoice.invoice_number}</td>
                                    <td>{new Date(invoice.date).toLocaleDateString()}</td>
                                    <td>{invoice.customer_name}</td>
                                    <td style={{ textAlign: "right" }}>{Number(invoice.grand_total).toFixed(2)}</td>
                                    <td>
                                        <select
                                            className="form-input"
                                            value={invoice.shipping_method || ""}
                                            onChange={event => setInvoices(current => current.map(item => item.id === invoice.id ? { ...item, shipping_method: event.target.value } : item))}
                                        >
                                            <option value="">Select method</option>
                                            <option value="Courier">Courier</option>
                                            <option value="Company Delivery">Company Delivery</option>
                                            <option value="Customer Pickup">Customer Pickup</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </td>
                                    <td>
                                        <input
                                            className="form-input"
                                            value={invoice.courier_name || ""}
                                            onChange={event => setInvoices(current => current.map(item => item.id === invoice.id ? { ...item, courier_name: event.target.value } : item))}
                                            placeholder="Courier / provider"
                                        />
                                    </td>
                                    <td>
                                        <button type="button" className="btn-primary" onClick={() => updateInvoice(invoice)} disabled={savingId === invoice.id}>
                                            {savingId === invoice.id ? "Saving..." : "Mark Shipped"}
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