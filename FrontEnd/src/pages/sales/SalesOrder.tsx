import { useState, useEffect } from "react";

export default function SalesOrder({ setPage }: any) {
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [showCustDropdown, setShowCustDropdown] = useState(false);

    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [poNumber, setPoNumber] = useState("");
    const [note, setNote] = useState("");

    const [itemSearch, setItemSearch] = useState("");
    const [itemResults, setItemResults] = useState<any[]>([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);

    const [orderItems, setOrderItems] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const [discountTier, setDiscountTier] = useState<"discount1" | "discount2" | "discount3">("discount1");

    // Apply the correct discount tier if customer changes secretly
    useEffect(() => {
        if (orderItems.length > 0) {
            const updated = orderItems.map(item => {
                const discAmt = parseFloat(item[discountTier] || item.discount) || 0;
                return {
                    ...item,
                    discount: discAmt,
                    lineTotal: (parseFloat(item.unitPrice) - discAmt) * parseFloat(item.quantity)
                };
            });
            // We use simple comparison to prevent infinite loops when arrays change
            const diff = updated.some((u, i) => u.discount !== orderItems[i].discount || u.lineTotal !== orderItems[i].lineTotal);
            if (diff) {
                setOrderItems(updated);
            }
        }
    }, [discountTier, orderItems]);

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalDiscount = orderItems.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
    const grandTotal = subtotal - totalDiscount;

    const handleCustomerSearch = async (e: any) => {
        const val = e.target.value.toUpperCase();
        setCustomerSearch(val);
        setShowCustDropdown(true);

        try {
            const res = await fetch(`http://localhost:5005/api/customers/search?q=${val}`);
            const data = await res.json();
            setCustomerResults(Array.isArray(data) ? data : []);
        } catch (e) { }
    };

    const handleSelectCustomer = (c: any) => {
        setSelectedCustomer(c);
        setCustomerSearch(`${c.customer_code} - ${c.customer_name}`);
        setShowCustDropdown(false);

        // Auto-select discount tier based on customer mapping
        const tier = String(c.discount_tier || "").toLowerCase();
        if (tier.includes("2")) setDiscountTier("discount2");
        else if (tier.includes("3")) setDiscountTier("discount3");
        else setDiscountTier("discount1");
    };

    const handleItemSearch = async (e: any) => {
        const val = e.target.value.toUpperCase();
        setItemSearch(val);

        if (val.length > 0) {
            setShowItemDropdown(true);
            try {
                const res = await fetch(`http://localhost:5005/api/newItem/search?q=${val}`);
                const data = await res.json();

                // Fetch strictly available stock for each
                const enriched = await Promise.all(data.items.map(async (itm: any) => {
                    const stRes = await fetch(`http://localhost:5005/api/sales-orders/stock/${itm.Item_Code}`);
                    const stData = await stRes.json();
                    return { ...itm, availableStock: stData.available || 0 };
                }));
                setItemResults(enriched || []);
            } catch (e) { }
        } else {
            setShowItemDropdown(false);
        }
    };

    const addOrderItem = (item: any) => {
        if (orderItems.find(i => i.itemCode === item.Item_Code)) {
            alert("Item already added to the order.");
            return;
        }
        setOrderItems([...orderItems, {
            itemCode: item.Item_Code,
            productId: item.Product_ID,
            description: item.Description,
            unitPrice: parseFloat(item.sale_price) || 0,
            quantity: 1,
            discount1: parseFloat(item["1st_discount"]) || 0,
            discount2: parseFloat(item["2st_discount"]) || 0,
            discount3: parseFloat(item["3st_discount"]) || 0,
            discount: parseFloat(item[discountTier]) || 0,
            availableStock: item.availableStock,
            lineTotal: (parseFloat(item.sale_price) - (parseFloat(item[discountTier]) || 0)) * 1
        }]);
        setItemSearch("");
        setShowItemDropdown(false);
    };

    const updateItemQty = (index: number, newQty: string) => {
        const updated = [...orderItems];
        const item = updated[index];
        if (newQty !== "" && Number(newQty) > item.availableStock) {
            alert(`Insufficient active stock! Only ${item.availableStock} available to reserve.`);
            newQty = String(item.availableStock);
        }
        item.quantity = newQty;
        item.lineTotal = (item.unitPrice - item.discount) * (Number(newQty) || 0);
        setOrderItems(updated);
    };

    const removeItem = (index: number) => {
        const updated = [...orderItems];
        updated.splice(index, 1);
        setOrderItems(updated);
    };

    const saveOrder = async () => {
        if (!selectedCustomer) return alert("Select a customer first");
        if (orderItems.length === 0) return alert("Add at least one item");
        if (orderItems.some(item => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) {
            return alert("Enter a quantity greater than zero for every order item.");
        }

        setIsSaving(true);
        const payload = {
            customerId: selectedCustomer.id,
            poNumber,
            note,
            subtotal,
            discountTotal: totalDiscount,
            grandTotal,
            items: orderItems.map(item => ({ ...item, quantity: Number(item.quantity) }))
        };

        try {
            const res = await fetch("http://localhost:5005/api/sales-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                alert(`Order saved successfully! Order Number: ${data.orderNumber}`);
                window.location.reload();
            } else {
                alert(data.message || "Failed to save order");
            }
        } catch (e: any) {
            alert("Network error saving order!");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '1200px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="form-title">Create Sales Order</h2>
                {setPage && (
                    <button type="button" className="btn-secondary" onClick={() => setPage("pending-orders")}>
                        View Pending Orders
                    </button>
                )}
            </div>

            {/* Header section (Customer & Docs) */}
            <div className="form-section">
                <h3 className="section-title">Order Info</h3>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group" style={{ position: 'relative', zIndex: 10 }}>
                        <label>Select Customer</label>
                        <input type="text" className="form-input" placeholder="Search by name or code..." value={customerSearch} onChange={handleCustomerSearch} onFocus={handleCustomerSearch} />
                        {showCustDropdown && customerResults.length > 0 && (
                            <div className="autocomplete-dropdown" style={{ top: '100%', position: 'absolute', width: '100%', zIndex: 1000 }}>
                                {customerResults.map(c => (
                                    <div key={c.id} className="autocomplete-item" onMouseDown={() => handleSelectCustomer(c)}>
                                        <strong>{c.customer_code}</strong> | {c.customer_name}
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedCustomer && (
                            <div style={{ marginTop: '10px', fontSize: '13px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '4px' }}>
                                <strong>{selectedCustomer.customer_name}</strong><br />
                                Phone: {selectedCustomer.contact_number} <br />
                                Address: {selectedCustomer.address} <br />
                                Tier: {selectedCustomer.discount_tier}
                                <div style={{ marginTop: '10px' }}>
                                    <label style={{ fontSize: '12px' }}>Apply Discount Tier:</label>
                                    <select
                                        className="form-input"
                                        style={{ padding: '4px', fontSize: '13px', marginLeft: '10px', width: 'auto' }}
                                        value={discountTier}
                                        onChange={(e: any) => {
                                            setDiscountTier(e.target.value);
                                            // Recalculate all lines
                                            const tier = e.target.value;
                                            const updated = orderItems.map(item => {
                                                item.get = function () { return item[tier] || 0; };
                                                item.discount = item[tier] || 0;
                                                item.lineTotal = (item.unitPrice - item.discount) * item.quantity;
                                                return item;
                                            });
                                            setOrderItems(updated);
                                        }}
                                    >
                                        <option value="discount1">Type 1</option>
                                        <option value="discount2">Type 2</option>
                                        <option value="discount3">Type 3</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label>PO Number (Cust Ref)</label>
                                <input type="text" className="form-input" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
                            </div>
                            <div>
                                <label>Internal Note</label>
                                <input type="text" className="form-input" value={note} onChange={e => setNote(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product selection */}
            <div className="form-section" style={{ marginTop: '20px' }}>
                <h3 className="section-title">Add Items</h3>
                <div className="form-group" style={{ position: 'relative', zIndex: 5, width: '50%' }}>
                    <input type="text" className="form-input" placeholder="Search item code/ID/desc..." value={itemSearch} onChange={handleItemSearch} />
                    {showItemDropdown && itemResults.length > 0 && (
                        <div className="autocomplete-dropdown" style={{ top: '100%', position: 'absolute', width: '100%', zIndex: 20 }}>
                            {itemResults.map(itm => (
                                <div key={itm.Item_Code} className="autocomplete-item" onMouseDown={() => addOrderItem(itm)}>
                                    <strong>{itm.Product_ID}</strong> - {itm.Description} <span style={{ color: itm.availableStock > 0 ? 'green' : 'red' }}>(Avail: {itm.availableStock})</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="table-responsive" style={{ marginTop: '15px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead style={{ backgroundColor: '#f1f5f9' }}>
                            <tr>
                                <th style={{ padding: '10px' }}>Item Code</th>
                                <th style={{ padding: '10px' }}>Description</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>Avail Stock</th>
                                <th style={{ padding: '10px', width: '10%' }}>Quantity</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Unit Price</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {orderItems.map((itm, idx) => (
                                <tr key={itm.itemCode} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '10px' }}>{itm.itemCode}</td>
                                    <td style={{ padding: '10px' }}>{itm.description}</td>
                                    <td style={{ padding: '10px', textAlign: 'center', color: '#16a34a' }}>{itm.availableStock}</td>
                                    <td style={{ padding: '10px' }}>
                                        <input type="number" min="1" max={itm.availableStock} value={itm.quantity} onChange={(e) => updateItemQty(idx, e.target.value)} className="form-input" style={{ padding: '5px' }} />
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'right' }}>{itm.unitPrice.toFixed(2)}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{itm.lineTotal.toFixed(2)}</td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                        <button type="button" onClick={() => removeItem(idx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>X</button>
                                    </td>
                                </tr>
                            ))}
                            {orderItems.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '15px', color: '#94a3b8' }}>No items added yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {orderItems.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <div style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', minWidth: '300px', backgroundColor: '#f8fafc' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>Subtotal:</span>
                                <strong>{subtotal.toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>Total Discount:</span>
                                <strong>-{totalDiscount.toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', borderTop: '2px solid #cbd5e1', paddingTop: '10px', marginTop: '10px' }}>
                                <span>Grand Total:</span>
                                <strong>{grandTotal.toFixed(2)}</strong>
                            </div>
                            <button type="button" className="btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={saveOrder} disabled={isSaving}>
                                {isSaving ? "Saving Order..." : "Confirm Reservation & Save Order"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
