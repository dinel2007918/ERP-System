import { useState, useEffect } from "react";

export default function PurchaseInvoiceReturn() {
    const [supplierSearch, setSupplierSearch] = useState("");
    const [supplierResults, setSupplierResults] = useState<any[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // Form fields
    const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState("");
    const [returnType, setReturnType] = useState("CREDIT_NOTE"); // 'CREDIT_NOTE' (Debit Note to supplier), 'CASH_REFUND'
    const [itemSearch, setItemSearch] = useState("");
    const [itemResults, setItemResults] = useState<any[]>([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);

    // Return Cart
    const [returnCart, setReturnCart] = useState<any[]>([]);

    const loadInvoice = async () => {
        if (!originalInvoiceNumber) return;
        try {
            const res = await fetch(`http://localhost:5005/api/purchase-returns/load-invoice/${originalInvoiceNumber}`);
            const data = await res.json();
            if (data.success) {
                setSelectedSupplier(data.supplier);
                setSupplierSearch(data.supplier.name);
                setReturnCart(data.items);
                alert("PO Loaded Successfully!");
            } else {
                alert(data.message || "Failed to load PO");
            }
        } catch (e) {
            console.error(e);
            alert("Network Error loading PO");
        }
    };

    // Supplier Lookup
    useEffect(() => {
        const fetchSuppliers = async () => {
            if (supplierSearch.length > 1) {
                try {
                    const res = await fetch(`http://localhost:5005/api/suppliers/search?q=${supplierSearch}`);
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setSupplierResults(data);
                        setShowDropdown(true);
                    }
                } catch (error) {
                    console.error(error);
                }
            } else {
                setShowDropdown(false);
            }
        };
        const delayDebounceFn = setTimeout(() => { fetchSuppliers(); }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [supplierSearch]);

    // Item Lookup
    useEffect(() => {
        const fetchItems = async () => {
            if (itemSearch.trim().length > 1) {
                try {
                    const res = await fetch(`http://localhost:5005/api/newItem/search?q=${itemSearch}`);
                    const data = await res.json();
                    if (data && Array.isArray(data.items)) {
                        setItemResults(data.items);
                        setShowItemDropdown(true);
                    }
                } catch (e) {
                    console.error(e);
                }
            } else {
                setShowItemDropdown(false);
            }
        };
        const delay = setTimeout(fetchItems, 300);
        return () => clearTimeout(delay);
    }, [itemSearch]);

    const handleSelectSupplier = (s: any) => {
        setSelectedSupplier(s);
        setSupplierSearch(s.name);
        setShowDropdown(false);
    };

    const handleSelectItem = (item: any) => {
        const returnLine = {
            id: Date.now().toString(),
            itemCode: item.Item_Code,
            description: item.Description,
            returnQty: 1,
            unitCost: item.Cost || 0 // Reverting the cost they bought it for historically
        };
        setReturnCart([...returnCart, returnLine]);
        setItemSearch("");
        setShowItemDropdown(false);
    };

    const updateReturnLine = (id: string, field: string, value: string) => {
        setReturnCart(returnCart.map(i => i.id === id ? { ...i, [field]: value } : i));
    };
    const removeReturnLine = (id: string) => setReturnCart(returnCart.filter(i => i.id !== id));

    const calculateTotal = () => {
        return returnCart.reduce((sum, item) => sum + (parseFloat(item.returnQty || 0) * parseFloat(item.unitCost || 0)), 0);
    };

    const handleProcessReturn = async () => {
        if (!selectedSupplier) return alert("Please select a supplier!");
        if (returnCart.length === 0) return alert("Return cart is empty!");

        const payload = {
            supplierId: selectedSupplier.id,
            originalInvoiceNumber,
            returnType,
            items: returnCart,
            totalAmount: calculateTotal()
        };

        if (!window.confirm("WARNING: Completing this Return will generate a Debit Note and PHYSICALLY DEDUCT the items from your inventory stock. Proceed?")) return;

        try {
            const res = await fetch(`http://localhost:5005/api/purchase-returns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                setReturnCart([]);
                setOriginalInvoiceNumber("");
                setSelectedSupplier(null);
                setSupplierSearch("");
            } else {
                alert(data.message);
            }
        } catch (e) {
            alert("Network Error");
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '1200px' }}>
            <h2 className="form-title" style={{ color: '#b91c1c' }}>Purchase Returns (Debit Note Generator)</h2>

            <div className="form-grid" style={{ marginBottom: '20px', backgroundColor: '#fef2f2', padding: '20px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <div className="form-group autocomplete-container">
                    <label style={{ color: '#991b1b', fontWeight: 'bold' }}>Select Supplier</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by Name or Code..."
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                    />
                    {showDropdown && supplierResults.length > 0 && (
                        <div className="autocomplete-dropdown">
                            {supplierResults.map((s) => (
                                <div key={s.id} className="autocomplete-item" onClick={() => handleSelectSupplier(s)}>
                                    <strong>{s.supplier_code}</strong> - {s.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <label>Original Invoice #</label>
                        <input
                            type="text"
                            className="form-input"
                            value={originalInvoiceNumber}
                            onChange={e => setOriginalInvoiceNumber(e.target.value)}
                            placeholder="e.g. PO-123456"
                        />
                    </div>
                    <button onClick={loadInvoice} className="btn-secondary" style={{ height: '38px', padding: '0 20px', backgroundColor: '#e2e8f0', borderRadius: '4px', cursor: 'pointer', border: '1px solid #cbd5e1' }}>Auto-Load</button>
                </div>

                <div className="form-group">
                    <label>Return Settlement Type</label>
                    <select className="form-input" value={returnType} onChange={e => setReturnType(e.target.value)}>
                        <option value="CREDIT_NOTE">CREDIT (Generates Supplier Debit Note Balance)</option>
                        <option value="CASH_REFUND">CASH REFUND (Supplier Gave Immediate Cash)</option>
                    </select>
                </div>
            </div>

            {/* ITEM SEARCH */}
            <div className="form-group autocomplete-container" style={{ width: '400px', marginBottom: '20px' }}>
                <label>Add Item to Return to Supplier</label>
                <input
                    type="text"
                    className="form-input"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search by exact Item Code..."
                />
                {showItemDropdown && itemResults.length > 0 && (
                    <div className="autocomplete-dropdown">
                        {itemResults.map((item: any) => (
                            <div key={item.id} className="autocomplete-item" onClick={() => handleSelectItem(item)}>
                                <strong>{item.Item_Code}</strong> - {item.Description}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* RETURN CART GRID */}
            <div>
                <table className="custom-table" style={{ fontSize: '12px' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '200px' }}>Item Code</th>
                            <th>Description</th>
                            <th style={{ width: '120px' }}>Return QTY</th>
                            <th style={{ width: '120px' }}>Unit Return Cost</th>
                            <th style={{ textAlign: 'right', width: '120px' }}>Line Total</th>
                            <th style={{ width: '50px', textAlign: 'center' }}>X</th>
                        </tr>
                    </thead>
                    <tbody>
                        {returnCart.map((item) => (
                            <tr key={item.id}>
                                <td><strong>{item.itemCode}</strong></td>
                                <td style={{ color: '#64748b' }}>{item.description}</td>
                                <td>
                                    <input type="number" className="form-input" style={{ padding: '6px', fontWeight: 'bold', color: 'red' }} value={item.returnQty} onChange={e => updateReturnLine(item.id, 'returnQty', e.target.value)} />
                                </td>
                                <td>
                                    <input type="number" className="form-input" style={{ padding: '6px' }} value={item.unitCost} onChange={e => updateReturnLine(item.id, 'unitCost', e.target.value)} />
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '14px', color: '#b91c1c' }}>
                                    {(parseFloat(item.returnQty || 0) * parseFloat(item.unitCost || 0)).toFixed(2)}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <button onClick={() => removeReturnLine(item.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                                </td>
                            </tr>
                        ))}
                        {returnCart.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>No items marked for return.</td></tr>}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <div style={{ width: '350px', backgroundColor: '#fef2f2', padding: '20px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', borderBottom: '1px solid #fca5a5', paddingBottom: '10px' }}>
                        <span>Total Return Value:</span>
                        <span style={{ color: '#b91c1c' }}>LKR {calculateTotal().toFixed(2)}</span>
                    </div>
                    <button onClick={handleProcessReturn} className="btn-primary" style={{ width: '100%', marginTop: '20px', padding: '12px', fontSize: '16px', backgroundColor: '#b91c1c' }}>
                        FINALISE RETURN & DEDUCT STOCK
                    </button>
                </div>
            </div>
        </div>
    );
}
