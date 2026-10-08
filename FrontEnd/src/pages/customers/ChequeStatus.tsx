import { useState, useEffect } from "react";

export default function ChequeStatus() {
    const [cheques, setCheques] = useState<any[]>([]);
    const [filterStatus, setFilterStatus] = useState("PENDING");
    const [searchQuery, setSearchQuery] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchCheques();
    }, [filterStatus]);

    const fetchCheques = async () => {
        try {
            const res = await fetch(`http://localhost:5005/api/payments/cheques?status=${filterStatus}`);
            const data = await res.json();
            if (data.success) {
                setCheques(data.cheques);
            }
        } catch (e) {
            console.error("Failed fetching cheques", e);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        const actionStr = newStatus === 'CLEARED' ? 'CLEAR' : 'BOUNCE';
        if (!window.confirm(`WARNING: Are you sure you want to completely ${actionStr} this cheque? This cannot be undone.`)) {
            return;
        }

        setIsUpdating(true);
        try {
            const res = await fetch(`http://localhost:5005/api/payments/cheques/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newStatus })
            });

            const data = await res.json();
            if (data.success) {
                alert(`Success: ${data.message}`);
                fetchCheques(); // Refresh active list
            } else {
                alert(data.message || 'Failed to update status.');
            }
        } catch (e) {
            alert('Network error.');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '1200px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 className="form-title" style={{ color: '#0f766e', margin: 0 }}>Bank Cheque Tracking Hub</h2>
                <div style={{ width: '300px' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search Cheque # or Customer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
                <button
                    className={filterStatus === 'PENDING' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setFilterStatus('PENDING')}
                    style={{ backgroundColor: filterStatus === 'PENDING' ? '#0d9488' : '#f8fafc', color: filterStatus === 'PENDING' ? 'white' : 'black' }}
                >
                    Pending Clearance
                </button>
                <button
                    className={filterStatus === 'CLEARED' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setFilterStatus('CLEARED')}
                    style={{ backgroundColor: filterStatus === 'CLEARED' ? '#16a34a' : '#f8fafc', color: filterStatus === 'CLEARED' ? 'white' : 'black' }}
                >
                    Cleared
                </button>
                <button
                    className={filterStatus === 'BOUNCED' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setFilterStatus('BOUNCED')}
                    style={{ backgroundColor: filterStatus === 'BOUNCED' ? '#dc2626' : '#f8fafc', color: filterStatus === 'BOUNCED' ? 'white' : 'black' }}
                >
                    Bounced
                </button>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '400px' }}>
                {cheques.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '18px', textAlign: 'center', marginTop: '100px' }}>
                        No cheques currently under {filterStatus} status filter.
                    </p>
                ) : (
                    <table className="custom-table" style={{ fontSize: '13px' }}>
                        <thead>
                            <tr>
                                <th>Received On</th>
                                <th>Customer</th>
                                <th>Cheque Number</th>
                                <th>Bank / Branch</th>
                                <th>Cheque Date</th>
                                <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
                                {filterStatus === 'PENDING' && <th style={{ textAlign: 'center' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {cheques
                                .filter(chk =>
                                    chk.cheque_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    chk.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map(chk => (
                                    <tr key={chk.id}>
                                        <td>{new Date(chk.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <strong>{chk.customer_name}</strong><br />
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>{chk.customer_code}</span>
                                        </td>
                                        <td><span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{chk.cheque_number}</span></td>
                                        <td>{chk.cheque_bank}</td>
                                        <td style={{ color: new Date(chk.cheque_date) < new Date() ? '#b91c1c' : '#047857', fontWeight: 'bold' }}>
                                            {new Date(chk.cheque_date).toLocaleDateString()}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>
                                            {parseFloat(chk.amount).toFixed(2)}
                                        </td>

                                        {filterStatus === 'PENDING' && (
                                            <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => handleUpdateStatus(chk.id, 'CLEARED')}
                                                    disabled={isUpdating}
                                                    style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                >
                                                    CLEAR ✓
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(chk.id, 'BOUNCED')}
                                                    disabled={isUpdating}
                                                    style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                >
                                                    BOUNCE ✗
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
