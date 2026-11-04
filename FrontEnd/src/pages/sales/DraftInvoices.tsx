import { useState, useEffect } from "react";

export default function DraftInvoices({ setPage, setPassData }: { setPage?: (p: string) => void, setPassData?: (d: any) => void }) {
    const [drafts, setDrafts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("erp_session");
    const authHeader = { Authorization: `Bearer ${token}` };

    const loadDrafts = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:5005/api/sales-invoices", { headers: authHeader });
            const data = await res.json();
            if (data.success) {
                setDrafts(data.invoices.filter((inv: any) => inv.status === 'DRAFT'));
            }
        } catch (e) {
            console.error("Failed to load drafts", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadDrafts(); }, []);

    const handleApprove = async (invoiceId: string) => {
        if (!window.confirm("Approve this draft? This will deduct inventory and post the invoice.")) return;
        try {
            const res = await fetch(`http://localhost:5005/api/sales-invoices/${invoiceId}/approve`, {
                method: 'POST',
                headers: authHeader
            });
            const data = await res.json();
            if (data.success) {
                alert("Invoice approved and posted successfully!");
                loadDrafts();
            } else {
                alert(data.message || "Approval failed.");
            }
        } catch (e) {
            alert("Network error trying to approve draft.");
        }
    };

    const handleView = (invoiceId: string) => {
        if (setPassData) setPassData({ invoiceId });
        if (setPage) setPage("invoice-print");
    };

    const handleReject = async (invoiceId: string) => {
        const reason = window.prompt("Enter a reason for rejecting this invoice order:");
        if (reason === null) return;
        if (!reason.trim()) {
            alert("A rejection reason is required.");
            return;
        }
        try {
            const res = await fetch(`http://localhost:5005/api/sales-invoices/${invoiceId}/cancel`, {
                method: 'PUT',
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({ reason: reason.trim() })
            });
            const data = await res.json();
            if (data.success) {
                alert("Invoice order rejected.");
                loadDrafts();
            } else {
                alert(data.message || "Rejection failed.");
            }
        } catch (e) {
            alert("Network error trying to reject draft.");
        }
    };

    const totalDraftSum = drafts.reduce((sum, inv) => sum + parseFloat(inv.grand_total), 0);

    return (
        <div className="tab-section">
            <h3 className="section-title">Pending Invoices</h3>

            {loading ? (
                <div style={{ padding: '20px', color: '#64748b' }}>Loading drafts...</div>
            ) : drafts.length === 0 ? (
                <div style={{ padding: '20px', color: '#64748b', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    No pending invoices.
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px', color: '#0f172a', fontWeight: 'bold' }}>
                        Pending Total: Rs. {totalDraftSum.toFixed(2)}
                    </div>
                    <div className="table-responsive">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: '#f1f5f9' }}>
                                <tr>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Invoice #</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Customer</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Total (Rs)</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drafts.map(inv => (
                                    <tr key={inv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{inv.invoice_number}</td>
                                        <td style={{ padding: '12px' }}>{new Date(inv.date).toLocaleString()}</td>
                                        <td style={{ padding: '12px' }}>{inv.customer_name}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: '#059669', fontWeight: 'bold' }}>
                                            {parseFloat(inv.grand_total).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                {/* Save = Approve/Post */}
                                                <button
                                                    onClick={() => handleApprove(inv.id)}
                                                    style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Save
                                                </button>
                                                {/* View = Open invoice print */}
                                                <button
                                                    onClick={() => handleView(inv.id)}
                                                    style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    View
                                                </button>
                                                {/* Reject = Cancel/Delete draft */}
                                                <button
                                                    onClick={() => handleReject(inv.id)}
                                                    style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
