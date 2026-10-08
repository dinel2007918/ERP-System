import { useState, useEffect } from "react";

export default function PurchaseInvoice() {
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

    // Supplier Search State
    const [supplierSearch, setSupplierSearch] = useState("");
    const [supplierResults, setSupplierResults] = useState<any[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

    // Item Search State
    const [itemSearch, setItemSearch] = useState("");
    const [itemResults, setItemResults] = useState<any[]>([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);

    // Active Cart
    const [cart, setCart] = useState<any[]>([]);

    // Automatically generate temporary PO number if empty
    useEffect(() => {
        setInvoiceNumber("PO-" + Date.now().toString().slice(-6));
    }, []);

    // Supplier Lookup Hook
    useEffect(() => {
        const dly = setTimeout(() => {
            if (supplierSearch.trim().length > 1 && !selectedSupplier) {
                fetch(`http://localhost:5005/api/purchase-invoices/suppliers/search?q=${supplierSearch}`)
                    .then(res => res.json())
                    .then(data => {
                        if (Array.isArray(data)) {
                            setSupplierResults(data);
                            setShowSupplierDropdown(true);
                        }
                    });
            } else {
                setShowSupplierDropdown(false);
            }
        }, 300);
        return () => clearTimeout(dly);
    }, [supplierSearch, selectedSupplier]);

    // Item Lookup Hook
    useEffect(() => {
        const dly = setTimeout(() => {
            if (itemSearch.trim().length > 1) {
                fetch(`http://localhost:5005/api/newItem/search?q=${itemSearch}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && Array.isArray(data.items)) {
                            setItemResults(data.items);
                            setShowItemDropdown(true);
                        }
                    });
            } else {
                setShowItemDropdown(false);
            }
        }, 300);
        return () => clearTimeout(dly);
    }, [itemSearch]);

    const handleSelectSupplier = (sup: any) => {
        setSelectedSupplier(sup);
        setSupplierSearch(sup.name);
        setShowSupplierDropdown(false);
    };

    // Strict validations active natively. All free typing hooks deprecated.

    const handleSelectItem = (item: any) => {
        // Build new cart line item using exact field names from item.js (Cost, sale_price, etc)
        const newItem = {
            id: Date.now().toString(),
            itemCode: item.Item_Code,
            productId: item.Product_ID,
            description: item.Description,
            oldCost: item.Cost || 0,
            newCost: "",
            oldSalePrice: item.sale_price || 0,
            newSalePrice: item.sale_price || 0,
            discount1: item['1st_discount'] || 0,
            discount2: item['2st_discount'] || 0,
            discount3: item['3st_discount'] || 0,
            quantity: 1
        };
        setCart([...cart, newItem]);
        setItemSearch("");
        setShowItemDropdown(false);
    };

    const updateCartItem = (id: string, field: string, value: string) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const removeCartItem = (id: string) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const calculateSubtotal = () => {
        return cart.reduce((sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.newCost || 0)), 0);
    };

    const handleSaveInvoice = async () => {
        if (!selectedSupplier || !selectedSupplier.id) {
            return alert("ERROR: You must strictly select a pre-registered supplier from the dropdown list. Typing a name without selecting is disabled to prevent duplicates.");
        }
        if (cart.length === 0) return alert("Please add at least one item.");

        const payload = {
            supplierData: selectedSupplier,
            invoiceNumber,
            invoiceDate,
            items: cart
        };

        if (!window.confirm("WARNING: Creating this Purchase Invoice will permanently overwrite the global Cost, Sale Price, and Discounts for all selected items. Proceed?")) return;

        try {
            const res = await fetch("http://localhost:5005/api/purchase-invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                // Reset form
                setCart([]);
                setSupplierSearch("");
                setSelectedSupplier(null);
                setInvoiceNumber("PO-" + Date.now().toString().slice(-6));
            } else {
                alert(data.message);
            }
        } catch (e) {
            alert("Network Error");
        }
    };

    return (
        <div className="form-container" style={{ width: '100%', maxWidth: '1400px', margin: 'auto', padding: '10px' }}>
            <h2 className="form-title" style={{ color: '#047857' }}>Purchase Invoice (Supplier Goods Inward)</h2>

            <div className="form-grid" style={{ marginBottom: '20px' }}>
                <div className="form-group autocomplete-container">
                    <label>Supplier Name</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            className="form-input"
                            value={supplierSearch}
                            onChange={(e) => {
                                setSupplierSearch(e.target.value);
                                setSelectedSupplier(null);
                            }}
                            placeholder="Type Supplier Name..."
                        />
                        {selectedSupplier && (
                            <button onClick={() => { setSelectedSupplier(null); setSupplierSearch(''); }} className="btn-secondary" style={{ padding: '0 15px' }}>Clear</button>
                        )}
                    </div>
                    {showSupplierDropdown && supplierResults.length > 0 && (
                        <div className="autocomplete-dropdown">
                            {supplierResults.map(sup => (
                                <div key={sup.id} className="autocomplete-item" onClick={() => handleSelectSupplier(sup)}>
                                    {sup.supplier_code} - <strong>{sup.name}</strong>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label>Purchase Invoice #</label>
                    <input type="text" className="form-input" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Invoice Date</label>
                    <input type="date" className="form-input" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </div>
            </div>

            <div className="form-group autocomplete-container" style={{ width: '100%', maxWidth: '400px', marginBottom: '20px' }}>
                <label>Add Item to Purchase</label>
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
                                <strong>{item.Product_ID}</strong> - {item.Description} (Current Cost: {parseFloat(item.Cost).toFixed(2)})
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* PURCHASE CART GRID */}
            <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                <table className="custom-table" style={{ fontSize: '11px', width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '120px' }}>Product ID</th>
                            <th style={{ width: '60px', backgroundColor: '#f1f5f9' }}>Old Cost</th>
                            <th style={{ width: '70px', backgroundColor: '#e2e8f0' }}>New Cost</th>
                            <th style={{ width: '60px', backgroundColor: '#f1f5f9' }}>Old Sale</th>
                            <th style={{ width: '75px', backgroundColor: '#e2e8f0' }}>New Sale</th>
                            <th style={{ width: '50px' }}>Disc 1</th>
                            <th style={{ width: '50px' }}>Disc 2</th>
                            <th style={{ width: '50px' }}>Disc 3</th>
                            <th style={{ width: '60px' }}>Qty</th>
                            <th style={{ textAlign: 'right', width: '80px' }}>Line Total</th>
                            <th style={{ width: '30px', textAlign: 'center' }}>X</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map((item) => (
                            <tr key={item.id}>
                                <td>
                                    <strong>{item.productId}</strong><br />
                                    <span style={{ fontSize: '9px', color: '#64748b', display: 'block', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</span>
                                </td>
                                <td style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>{parseFloat(item.oldCost).toFixed(2)}</td>
                                <td>
                                    <input type="number" className="form-input" style={{ padding: '2px', height: '24px', fontSize: '11px' }} value={item.newCost} onChange={e => updateCartItem(item.id, 'newCost', e.target.value)} />
                                </td>
                                <td style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>{parseFloat(item.oldSalePrice).toFixed(2)}</td>
                                <td>
                                    <input type="number" className="form-input" style={{ padding: '2px', height: '24px', fontSize: '11px' }} value={item.newSalePrice} onChange={e => updateCartItem(item.id, 'newSalePrice', e.target.value)} />
                                </td>
                                <td><input type="number" className="form-input" style={{ padding: '2px', height: '24px', fontSize: '11px' }} value={item.discount1} onChange={e => updateCartItem(item.id, 'discount1', e.target.value)} /></td>
                                <td><input type="number" className="form-input" style={{ padding: '2px', height: '24px', fontSize: '11px' }} value={item.discount2} onChange={e => updateCartItem(item.id, 'discount2', e.target.value)} /></td>
                                <td><input type="number" className="form-input" style={{ padding: '2px', height: '24px', fontSize: '11px' }} value={item.discount3} onChange={e => updateCartItem(item.id, 'discount3', e.target.value)} /></td>
                                <td><input type="number" className="form-input" style={{ padding: '2px', height: '24px', fontWeight: 'bold', fontSize: '11px' }} value={item.quantity} onChange={e => updateCartItem(item.id, 'quantity', e.target.value)} /></td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>
                                    {(parseFloat(item.quantity || 0) * parseFloat(item.newCost || 0)).toFixed(2)}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <button onClick={() => removeCartItem(item.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                                </td>
                            </tr>
                        ))}
                        {cart.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>No items added to invoice yet.</td></tr>}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <div style={{ width: '100%', maxWidth: '300px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span>Subtotal:</span>
                        <span>LKR {calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', borderTop: '1px solid #cbd5e1', paddingTop: '10px' }}>
                        <span>Grand Total:</span>
                        <span style={{ color: '#047857' }}>LKR {calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <button onClick={handleSaveInvoice} className="btn-primary" style={{ width: '100%', marginTop: '20px', padding: '12px', fontSize: '16px', backgroundColor: '#047857' }}>
                        POST PURCHASE INVOICE
                    </button>
                </div>
            </div>
        </div>
    );
}
