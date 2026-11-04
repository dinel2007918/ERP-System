import { useState, useEffect } from "react";

export default function SalesInvoice({ passData, setPassData, setPage }: any) {
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [showCustDropdown, setShowCustDropdown] = useState(false);

    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [poNumber, setPoNumber] = useState("");
    const [note, setNote] = useState("");
    const [shippingMethod, setShippingMethod] = useState("");
    const [courierName, setCourierName] = useState("");

    const [sourceOrder, setSourceOrder] = useState<any>(null);
    const [isConverting, setIsConverting] = useState(false);

    const [itemSearch, setItemSearch] = useState("");
    const [itemResults, setItemResults] = useState<any[]>([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);

    const [orderItems, setOrderItems] = useState<any[]>([]);
    const [discountTier, setDiscountTier] = useState<"discount1" | "discount2" | "discount3">("discount1");

    const [amountPaid, setAmountPaid] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [isSaving, setIsSaving] = useState(false);
    const [hasPostAccess, setHasPostAccess] = useState(false);

    // Fetch live permissions from server on mount — avoids stale localStorage issue
    useEffect(() => {
        const token = localStorage.getItem("erp_session");
        if (!token) return;
        fetch("http://localhost:5005/api/users/me", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    const u = data.user;
                    setHasPostAccess(
                        !!u.invoice_post_access ||
                        (u.privileges || []).includes("draft-invoices")
                    );
                }
            })
            .catch(() => {
                // Fallback to localStorage if network fails
                try {
                    const userStr = localStorage.getItem("erp_user");
                    if (userStr) {
                        const userObj = JSON.parse(userStr);
                        setHasPostAccess(
                            !!userObj.invoice_post_access ||
                            (userObj.privileges || []).includes("draft-invoices")
                        );
                    }
                } catch (e) { }
            });
    }, []);

    // Apply the correct discount tier if customer changes secretly
    useEffect(() => {
        if (!sourceOrder && orderItems.length > 0) {
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
    }, [discountTier, orderItems, sourceOrder]);

    // Load from Order if redirected via Pending Orders
    useEffect(() => {
        if (passData && passData.source === "SALES_ORDER" && passData.orderId) {
            loadFromOrder(passData.orderId);
        }
    }, [passData]);

    const loadFromOrder = async (orderId: number) => {
        setIsConverting(true);
        try {
            const res = await fetch(`http://localhost:5005/api/sales-orders/${orderId}`);
            const data = await res.json();
            if (data.success) {
                setSourceOrder(data.order);
                setSelectedCustomer({
                    id: data.order.customer_id,
                    customer_name: data.order.customer_name,
                    customer_code: data.order.customer_code,
                    address: data.order.address,
                    contact_number: data.order.contact_number,
                    discount_tier: data.order.discount_tier
                });
                setCustomerSearch(`${data.order.customer_code} - ${data.order.customer_name}`);
                setPoNumber(data.order.po_number || "");
                setNote(`Invoice generated from ${data.order.order_number}`);

                // Load un-invoiced items
                const mappedItems = data.items.map((i: any) => {
                    const remainingQty = parseFloat(i.ordered_quantity) - parseFloat(i.invoiced_quantity);
                    return {
                        orderItemId: i.id, // For tracking reservation conversion
                        itemCode: i.item_code,
                        productId: i.Product_ID,
                        description: i.item_name,
                        unitPrice: parseFloat(i.unit_price) || 0,
                        quantity: remainingQty,
                        maxQuantity: remainingQty,
                        discount1: parseFloat(i.discount) || 0, // In converting, we just use the fixed saved discount
                        discount2: parseFloat(i.discount) || 0,
                        discount3: parseFloat(i.discount) || 0,
                        get discount() { return this[discountTier] || 0; },
                        availableStock: remainingQty,
                        lineTotal: (parseFloat(i.unit_price) - parseFloat(i.discount)) * remainingQty
                    };
                }).filter((i: any) => i.quantity > 0);

                setOrderItems(mappedItems);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsConverting(false);
            if (setPassData) setPassData(null); // Clear context
        }
    };

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalDiscount = orderItems.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
    const grandTotal = subtotal - totalDiscount;
    const balance = grandTotal - (parseFloat(amountPaid) || 0);

    const handleCustomerSearch = async (e: any) => {
        if (sourceOrder) return; // Lock customer if converting
        const val = e.target.value.toUpperCase();
        setCustomerSearch(val);
        setShowCustDropdown(true);

        try {
            const res = await fetch(`http://localhost:5005/api/customers/search?q=${val}`);
            const data = await res.json();
            setCustomerResults(Array.isArray(data) ? data : []);
        } catch (e) { }
    };

    const handleItemSearch = async (e: any) => {
        if (sourceOrder) return; // Strict: Don't allow adding unauthorized items to an explicit Sales Order Invoice
        const val = e.target.value.toUpperCase();
        setItemSearch(val);

        if (val.length > 0) {
            setShowItemDropdown(true);
            try {
                const res = await fetch(`http://localhost:5005/api/newItem/search?q=${val}`);
                const data = await res.json();

                const enriched = await Promise.all(data.items.map(async (itm: any) => {
                    try {
                        const stRes = await fetch(`http://localhost:5005/api/sales-orders/stock/${encodeURIComponent(itm.Item_Code)}`);
                        if (stRes.ok) {
                            const stData = await stRes.json();
                            return { ...itm, availableStock: stData.available || 0 };
                        }
                    } catch (err) {
                        console.error("Failed to fetch stock for", itm.Item_Code);
                    }
                    return { ...itm, availableStock: 0 };
                }));
                setItemResults(enriched || []);
            } catch (e) {
                console.error("Item search completely failed", e);
            }
        } else {
            setShowItemDropdown(false);
        }
    };

    const addOrderItem = (item: any) => {
        if (orderItems.find(i => i.itemCode === item.Item_Code)) {
            alert("Item already added to the Invoice.");
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

        let maxAllowed = sourceOrder ? item.maxQuantity : item.availableStock;

        if (newQty !== "" && Number(newQty) > maxAllowed) {
            alert(`Maximum allowed quantity for this line is ${maxAllowed}.`);
            newQty = String(maxAllowed);
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

    const saveInvoice = async (mode: 'order' | 'save') => {
        if (!selectedCustomer) return alert("Select a customer first");
        if (orderItems.length === 0) return alert("Add at least one item to invoice");
        if (orderItems.some(item => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) {
            return alert("Enter a quantity greater than zero for every invoice item.");
        }

        const isDraft = mode === 'order';

        setIsSaving(true);
        const payload = {
            customerId: selectedCustomer.id,
            orderId: sourceOrder ? sourceOrder.id : null,
            poNumber,
            note,
            subtotal,
            discountTotal: totalDiscount,
            grandTotal,
            amountPaid: parseFloat(amountPaid) || 0,
            paymentMethod,
            shippingMethod,
            courierName,
            status: isDraft ? 'DRAFT' : 'POSTED',
            items: orderItems.map(item => ({ ...item, quantity: Number(item.quantity) }))
        };

        try {
            const res = await fetch("http://localhost:5005/api/sales-invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                if (isDraft) {
                    if (hasPostAccess) {
                        if (setPage) setPage("draft-invoices");
                    } else {
                        alert("Invoice order submitted for approval.");
                        setSelectedCustomer(null);
                        setCustomerSearch("");
                        setPoNumber("");
                        setNote("");
                        setOrderItems([]);
                        setAmountPaid("");
                        setSourceOrder(null);
                    }
                } else {
                    // SAVE: go to print page
                    if (setPage) {
                        if (setPassData) setPassData({ invoiceId: data.invoiceId });
                        setPage("invoice-print");
                    } else {
                        alert(`Invoice posted successfully! Number: ${data.invoiceNumber}`);
                        window.location.reload();
                    }
                }
            } else {
                alert(data.message || "Failed to save invoice");
            }
        } catch (e: any) {
            alert("Network error saving invoice!");
        } finally {
            setIsSaving(false);
        }
    };

    if (isConverting) return <div style={{ padding: '20px' }}>Loading and Converting Order...</div>;

    return (
        <div className="form-container" style={{ maxWidth: '1200px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="form-title">
                    {sourceOrder ? `Sales Invoice (from Order ${sourceOrder.order_number})` : "Direct Sales Invoice"}
                </h2>
            </div>

            {/* Header section */}
            <div className="form-section">
                <h3 className="section-title">Customer & Invoice Details</h3>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group" style={{ position: 'relative', zIndex: 10 }}>
                        <label>Customer</label>
                        <input type="text" className="form-input" placeholder="Search by name or code..." value={customerSearch} onChange={handleCustomerSearch} onFocus={handleCustomerSearch} disabled={!!sourceOrder} style={sourceOrder ? { backgroundColor: '#e2e8f0' } : {}} />
                        {showCustDropdown && customerResults.length > 0 && (
                            <div className="autocomplete-dropdown" style={{ top: '100%', position: 'absolute', width: '100%', zIndex: 1000 }}>
                                {customerResults.map(c => (
                                    <div key={c.id} className="autocomplete-item" onMouseDown={() => {
                                        setSelectedCustomer(c);
                                        setCustomerSearch(`${c.customer_code} - ${c.customer_name}`);
                                        setShowCustDropdown(false);

                                        const tier = String(c.discount_tier || "").toLowerCase();
                                        if (tier.includes("2")) setDiscountTier("discount2");
                                        else if (tier.includes("3")) setDiscountTier("discount3");
                                        else setDiscountTier("discount1");

                                        // Set checkout payment method appropriately based on saved customer default
                                        const defPayment = c.default_payment_type || "Cash";
                                        setPaymentMethod(defPayment);
                                    }}>
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
                                {!sourceOrder && (
                                    <div style={{ marginTop: '10px' }}>
                                        <label style={{ fontSize: '12px' }}>Apply Discount Tier:</label>
                                        <select
                                            className="form-input"
                                            style={{ padding: '4px', fontSize: '13px', marginLeft: '10px', width: 'auto' }}
                                            value={discountTier}
                                            onChange={(e: any) => {
                                                setDiscountTier(e.target.value);
                                            }}
                                        >
                                            <option value="discount1">Type 1</option>
                                            <option value="discount2">Type 2</option>
                                            <option value="discount3">Type 3</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label>PO Number</label>
                                <input type="text" className="form-input" value={poNumber} onChange={e => setPoNumber(e.target.value)} disabled={!!sourceOrder} style={sourceOrder ? { backgroundColor: '#e2e8f0' } : {}} />
                            </div>
                            <div>
                                <label>Notes</label>
                                <input type="text" className="form-input" value={note} onChange={e => setNote(e.target.value)} />
                            </div>
                            <div>
                                <label>Shipping Method</label>
                                <select className="form-input" value={shippingMethod} onChange={e => setShippingMethod(e.target.value)}>
                                    <option value="">Select shipping method</option>
                                    <option value="Courier">Courier</option>
                                    <option value="Company Delivery">Company Delivery</option>
                                    <option value="Customer Pickup">Customer Pickup</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label>Courier / Delivery Provider</label>
                                <input type="text" className="form-input" value={courierName} onChange={e => setCourierName(e.target.value)} placeholder="Courier or delivery provider" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product selection */}
            <div className="form-section" style={{ marginTop: '20px' }}>
                <h3 className="section-title">Invoice Lines</h3>

                {!sourceOrder && (
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
                )}

                <div className="table-responsive" style={{ marginTop: '15px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead style={{ backgroundColor: '#f1f5f9' }}>
                            <tr>
                                <th style={{ padding: '10px' }}>Item Code</th>
                                <th style={{ padding: '10px' }}>Description</th>
                                <th style={{ padding: '10px', width: '10%' }}>Quantity</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Unit Price</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Discount</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Line Total</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {orderItems.map((itm, idx) => (
                                <tr key={itm.itemCode} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '10px' }}>{itm.itemCode}</td>
                                    <td style={{ padding: '10px' }}>{itm.description}</td>
                                    <td style={{ padding: '10px' }}>
                                        <input type="number" min="1" value={itm.quantity} onChange={(e) => updateItemQty(idx, e.target.value)} className="form-input" style={{ padding: '5px' }} />
                                        {sourceOrder && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Max: {itm.maxQuantity} (Order)</div>}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'right' }}>{itm.unitPrice.toFixed(2)}</td>
                                    <td style={{ padding: '10px', textAlign: 'right' }}>{itm.discount.toFixed(2)}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{itm.lineTotal.toFixed(2)}</td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                        <button type="button" onClick={() => removeItem(idx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>X</button>
                                    </td>
                                </tr>
                            ))}
                            {orderItems.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '15px', color: '#94a3b8' }}>No items to invoice.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {orderItems.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <div style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', minWidth: '400px', backgroundColor: '#f8fafc' }}>
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

                            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748b' }}>Payment Details</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Amount Paid</label>
                                        <input type="number" className="form-input" style={{ padding: '8px' }} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Method</label>
                                        <select className="form-input" style={{ padding: '8px' }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                            <option value="Cash">Cash</option>
                                            <option value="Credit">Credit</option>
                                            <option value="Card">Card</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="Cheque">Cheque</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '15px', color: balance > 0 ? '#ef4444' : '#10b981' }}>
                                    <span>Balance Due:</span>
                                    <strong>{balance > 0 ? balance.toFixed(2) : "0.00"}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ORDER and SAVE buttons — always visible */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '15px 40px', fontSize: '16px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        onClick={() => saveInvoice('order')}
                        disabled={isSaving}
                    >
                        {isSaving ? "Saving..." : "ORDER"}
                    </button>
                    {hasPostAccess && (
                        <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '15px 40px', fontSize: '16px', cursor: 'pointer' }}
                            onClick={() => saveInvoice('save')}
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving..." : "SAVE"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
