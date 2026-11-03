import { useState, useEffect } from "react";

export default function ItemInquiry() {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<any>(null);
    const [hasCostAccess, setHasCostAccess] = useState(true);

    useEffect(() => {
        try {
            const uStr = localStorage.getItem("erp_user");
            if (uStr) {
                const u = JSON.parse(uStr);
                if (u.role !== "ADMINISTRATOR" && u.role !== "Admin") {
                    setHasCostAccess(!!u.cost_price_access);
                }
            }
        } catch (e) { }
    }, []);

    const handleSearchInput = async (e: any) => {
        const val = e.target.value;
        setSearchTerm(val);
        if (val.length > 0) {
            setShowDropdown(true);
            try {
                const res = await fetch(`http://localhost:5005/api/newItem/search?q=${val}`);
                const data = await res.json();
                setSearchResults(data.items || []);
            } catch (err) {
                console.error(err);
            }
        } else {
            setShowDropdown(false);
        }
    };

    const loadReport = async (itemCode: string) => {
        setLoading(true);
        setShowDropdown(false);
        try {
            const res = await fetch(`http://localhost:5005/api/newItem/report/${itemCode}`);
            const data = await res.json();
            if (data.success) {
                setReport(data);
                setSearchTerm(`${data.item.Item_Code} - ${data.item.Description}`);
            } else {
                alert(data.error || "Failed to load report");
            }
        } catch (err) {
            alert("Error loading report");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '1000px', margin: 'auto' }}>
            <h2 className="form-title">Item Inquiry</h2>

            <div className="form-group" style={{ position: 'relative', zIndex: 10 }}>
                <label>Search Item (Code, Product ID, or Description)</label>
                <input
                    type="text"
                    className="form-input"
                    value={searchTerm}
                    onChange={handleSearchInput}
                    placeholder="Search for items..."
                />
                {showDropdown && searchResults.length > 0 && (
                    <div className="autocomplete-dropdown" style={{ top: '100%' }}>
                        {searchResults.map((item: any) => {
                            const availableStr = (Number(item.stock_quantity) || 0) - (Number(item.reserved_stock) || 0) - (Number(item.draft_stock) || 0);
                            return (
                                <div
                                    key={item.Item_Code}
                                    className="autocomplete-item"
                                    onMouseDown={() => loadReport(item.Item_Code)}
                                >
                                    <strong>{item.Product_ID}</strong> - {item.Description} (Available: {availableStr} | Physical: {item.stock_quantity})
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {loading && <p>Loading report...</p>}

            {report && !loading && (
                <div className="inquiry-report" style={{ marginTop: '2rem' }}>

                    <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '2rem' }}>
                        <div className="stat-card" style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                            <h4 style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Current Stock</h4>
                            <h2 style={{ margin: '5px 0 0', color: '#1e293b' }}>{report.item.stock_quantity}</h2>
                        </div>
                        <div className="stat-card" style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>
                            <h4 style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Total Sold (Qty)</h4>
                            <h2 style={{ margin: '5px 0 0', color: '#1e293b' }}>{report.summary.total_sold_qty}</h2>
                        </div>
                        <div className="stat-card" style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #eab308' }}>
                            <h4 style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Total Purchased</h4>
                            <h2 style={{ margin: '5px 0 0', color: '#1e293b' }}>{report.summary.total_purchased_qty}</h2>
                        </div>
                        <div className="stat-card" style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                            <h4 style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Total Sales Returns</h4>
                            <h2 style={{ margin: '5px 0 0', color: '#1e293b' }}>{report.summary.total_sales_return_qty}</h2>
                        </div>
                        <div className="stat-card" style={{ padding: '15px', backgroundColor: '#fdf2f8', borderRadius: '8px', borderLeft: '4px solid #db2777' }}>
                            <h4 style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Pending Draft Invoices</h4>
                            <h2 style={{ margin: '5px 0 0', color: '#1e293b' }}>{report.summary.total_draft_qty}</h2>
                        </div>
                        <div className="stat-card" style={{ padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                            <h4 style={{ margin: 0, color: '#10b981', fontSize: '13px', fontWeight: 'bold' }}>Available to Sell</h4>
                            <h2 style={{ margin: '5px 0 0', color: '#047857' }}>
                                {(Number(report.item.stock_quantity) || 0) - (Number(report.summary.total_reserved_qty) || 0) - (Number(report.summary.total_draft_qty) || 0)}
                            </h2>
                        </div>
                    </div>

                    <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>Purchase Invoices</h3>
                    <div className="table-responsive" style={{ overflowX: 'auto', marginBottom: '30px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                    <th style={{ padding: '12px' }}>Date</th>
                                    <th style={{ padding: '12px' }}>Invoice Number</th>
                                    <th style={{ padding: '12px' }}>Supplier Name</th>
                                    {hasCostAccess && <th style={{ padding: '12px', textAlign: 'right' }}>Unit Cost</th>}
                                    <th style={{ padding: '12px', textAlign: 'right' }}>QTY</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.history && report.history.filter((m: any) => m.movement_type === 'purchase').length > 0 ? (
                                    report.history.filter((m: any) => m.movement_type === 'purchase').map((mov: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '12px' }}>{new Date(mov.movement_date).toLocaleString()}</td>
                                            <td style={{ padding: '12px' }}>{mov.reference_id || '-'}</td>
                                            <td style={{ padding: '12px' }}>{mov.entity_name || '-'}</td>
                                            {hasCostAccess && (
                                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                                    {mov.price ? Number(mov.price).toFixed(2) : '0.00'}
                                                </td>
                                            )}
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                                                {mov.quantity_change}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>No purchase invoices recorded for this item.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>Sales Invoices</h3>
                    <div className="table-responsive" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                    <th style={{ padding: '12px' }}>Date</th>
                                    <th style={{ padding: '12px' }}>Invoice Number</th>
                                    <th style={{ padding: '12px' }}>Customer Name</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Sale Price</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>QTY</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.history && report.history.filter((m: any) => m.movement_type === 'sales').length > 0 ? (
                                    report.history.filter((m: any) => m.movement_type === 'sales').map((mov: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '12px' }}>{new Date(mov.movement_date).toLocaleString()}</td>
                                            <td style={{ padding: '12px' }}>{mov.reference_id || '-'}</td>
                                            <td style={{ padding: '12px' }}>{mov.entity_name || '-'}</td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                {mov.price ? Number(mov.price).toFixed(2) : '0.00'}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                                                {mov.quantity_change}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>No sales invoices recorded for this item.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
