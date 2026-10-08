import { useState, useEffect } from 'react';

export default function SalesReturn({ setPage, setPassData, passData }: any) {
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [invoice, setInvoice] = useState<any>(null);
    const [returnItems, setReturnItems] = useState<any[]>([]);

    // For manual item entry
    const [searchItem, setSearchItem] = useState("");
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [searchQty, setSearchQty] = useState("");

    const [returnType, setReturnType] = useState("CREDIT_NOTE");
    const [isSaving, setIsSaving] = useState(false);

    // Auto-mount injected invoice data from Sales Management router
    useEffect(() => {
        if (passData && passData.invoiceNumber && !invoice) {
            setInvoiceNumber(passData.invoiceNumber);
            handleSearchInvoice(passData.invoiceNumber);
        }
    }, [passData]);

    const handleSearchInvoice = async (targetInv = invoiceNumber) => {
        if (!targetInv) return;

        try {
            const res = await fetch(`http://localhost:5005/api/sales-returns/invoice/${targetInv}`);
            const data = await res.json();

            if (data.success) {
                const inv = data.invoice;
                setInvoice(inv);

                // User Prompt
                const loadAll = window.confirm("Do you want to load all items?");
                if (loadAll) {
                    const mapped = inv.items
                        .filter((itm: any) => parseFloat(itm.remaining_qty) > 0)
                        .map((itm: any) => ({
                            itemCode: itm.item_code,
                            itemName: itm.item_name,
                            unitPrice: parseFloat(itm.unit_price) - (parseFloat(itm.discount) / parseFloat(itm.quantity)),
                            maxQty: parseFloat(itm.remaining_qty),
                            returnQty: parseFloat(itm.remaining_qty),
                        }));
                    setReturnItems(mapped);
                } else {
                    setReturnItems([]); // Keep empty so user must manually type
                }

                // Auto-set return type based on customer default if credit
                if (inv.default_payment_type === 'Credit') {
                    setReturnType('CREDIT_NOTE');
                } else {
                    setReturnType('CASH_REFUND');
                }

            } else {
                alert(data.message || "Invoice not found.");
            }
        } catch (err) {
            alert("Network error fetching invoice.");
        }
    };

    const handleAddManualItem = () => {
        if (!invoice) return alert("Search for invoice first.");
        if (!searchItem || !searchQty) return alert("Enter item and qty.");

        // Find if this item actually existed on the invoice!
        const existingLine = invoice.items.find((itm: any) => itm.item_code.toLowerCase() === searchItem.toLowerCase());
        if (!existingLine) {
            return alert("This item was not on the original invoice!");
        }

        const returnQ = parseFloat(searchQty);
        const remQty = parseFloat(existingLine.remaining_qty);

        if (returnQ > remQty) {
            return alert(`Cannot return more than remaining allowed (${remQty} out of ${existingLine.quantity} original).`);
        }

        // Prevent duplicate manual lines
        if (returnItems.find((r: any) => r.itemCode.toLowerCase() === searchItem.toLowerCase())) {
            return alert("Item already in return list. Remove it first to adjust.");
        }

        setReturnItems([...returnItems, {
            itemCode: existingLine.item_code,
            itemName: existingLine.item_name,
            unitPrice: parseFloat(existingLine.unit_price) - (parseFloat(existingLine.discount) / parseFloat(existingLine.quantity)),
            maxQty: remQty,
            returnQty: returnQ
        }]);

        setSearchItem("");
        setSearchQty("");
    };

    const handleRemoveItem = (index: number) => {
        const c = [...returnItems];
        c.splice(index, 1);
        setReturnItems(c);
    };

    const handleQtyChange = (val: string, index: number) => {
        const c = [...returnItems];
        let num = parseFloat(val) || 0;
        if (num > c[index].maxQty) num = c[index].maxQty; // Cap
        c[index].returnQty = num;
        setReturnItems(c);
    };

    const totalReturnAmount = returnItems.reduce((acc, itm) => acc + (itm.returnQty * itm.unitPrice), 0);

    const handleSubmit = async () => {
        if (!invoice) return alert("No invoice loaded.");
        if (returnItems.length === 0) return alert("No items to return.");
        if (returnItems.some(r => r.returnQty <= 0)) return alert("Return quantities must be greater than 0.");

        setIsSaving(true);

        const payload = {
            invoiceId: invoice.id,
            customerId: invoice.customer_id,
            returnType,
            totalAmount: totalReturnAmount,
            items: returnItems.map(r => ({
                itemCode: r.itemCode,
                quantity: r.returnQty,
                unitPrice: r.unitPrice,
                lineTotal: r.returnQty * r.unitPrice
            }))
        };

        try {
            const res = await fetch("http://localhost:5005/api/sales-returns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                if (setPage) {
                    if (setPassData) setPassData({ returnId: data.returnId });
                    setPage('return-print');
                } else {
                    window.location.reload();
                }
            } else {
                alert(data.message || "Failed to process return.");
            }
        } catch (err) {
            alert("Network error.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '1000px', margin: 'auto' }}>
            <h2 className="form-title">Sales Return / Credit Note</h2>

            <div className="form-grid" style={{ marginBottom: '30px' }}>
                <div className="form-group">
                    <label>Invoice Number</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            className="form-input"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSearchInvoice() }}
                            placeholder="e.g. A261005001"
                        />
                        <button onClick={() => handleSearchInvoice()} className="btn-primary">Search</button>
                    </div>
                </div>
            </div>

            {invoice && (
                <div className="discount-section" style={{ marginBottom: '30px', borderLeft: '4px solid #38bdf8' }}>
                    <h3 style={{ margin: 0, paddingBottom: 0, border: 'none' }}>Invoice Details</h3>
                    <div style={{ display: 'flex', gap: '40px', marginTop: '10px' }}>
                        <div><strong>Customer:</strong> {invoice.customer_name || "N/A"}</div>
                        <div><strong>Date:</strong> {new Date(invoice.invoice_date).toLocaleDateString()}</div>
                        <div><strong>Original Total:</strong> {parseFloat(invoice.grand_total).toFixed(2)}</div>
                    </div>
                </div>
            )}

            {invoice && (
                <div style={{ marginBottom: '20px' }}>
                    <div className="form-group" style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-end', marginBottom: '20px' }}>
                        <div className="autocomplete-container" style={{ width: '250px' }}>
                            <label>Item Code</label>
                            <input
                                className="form-input"
                                value={searchItem}
                                onChange={e => {
                                    setSearchItem(e.target.value);
                                    setShowItemDropdown(true);
                                }}
                                onFocus={() => setShowItemDropdown(true)}
                                onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
                            />
                            {showItemDropdown && searchItem && invoice?.items?.length > 0 && (
                                <div className="autocomplete-dropdown">
                                    {invoice.items
                                        .filter((itm: any) =>
                                            itm.item_code.toLowerCase().includes(searchItem.toLowerCase()) ||
                                            itm.item_name.toLowerCase().includes(searchItem.toLowerCase())
                                        )
                                        .map((itm: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="autocomplete-item"
                                                onClick={() => {
                                                    setSearchItem(itm.item_code);
                                                    setShowItemDropdown(false);
                                                }}
                                            >
                                                {itm.item_code} - <strong>{itm.item_name}</strong>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                        <div style={{ width: '100px' }}>
                            <label>Return Qty</label>
                            <input className="form-input" type="number" min="0" value={searchQty} onChange={e => setSearchQty(e.target.value)} />
                        </div>
                        <button onClick={handleAddManualItem} className="btn-secondary" style={{ height: '46px' }}>Add Item</button>
                    </div>

                    <div className="table-container">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Item Code</th>
                                    <th>Name</th>
                                    <th style={{ textAlign: 'right' }}>Max Qty</th>
                                    <th style={{ textAlign: 'right' }}>Return Qty</th>
                                    <th style={{ textAlign: 'right' }}>Unit Price (Net)</th>
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                    <th style={{ textAlign: 'center' }}>Remove</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returnItems.map((itm, idx) => (
                                    <tr key={idx}>
                                        <td><strong>{itm.itemCode}</strong></td>
                                        <td>{itm.itemName}</td>
                                        <td style={{ textAlign: 'right', color: '#64748b' }}>{itm.maxQty}</td>
                                        <td style={{ width: '100px' }}>
                                            <input
                                                type="number"
                                                className="form-input"
                                                style={{ textAlign: 'right', padding: '6px' }}
                                                value={itm.returnQty}
                                                onChange={(e) => handleQtyChange(e.target.value, idx)}
                                                max={itm.maxQty}
                                                min={0}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'right' }}>{itm.unitPrice.toFixed(2)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{(itm.returnQty * itm.unitPrice).toFixed(2)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button onClick={() => handleRemoveItem(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                                        </td>
                                    </tr>
                                ))}
                                {returnItems.length === 0 && (
                                    <tr><td colSpan={7} style={{ textAlign: 'center' }}>No items added for return.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {invoice && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', borderTop: '2px solid #e2e8f0', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Return Procedure</label>
                            <select className="form-input" value={returnType} onChange={e => setReturnType(e.target.value)}>
                                <option value="CREDIT_NOTE">Keep as Credit Note</option>
                                <option value="CASH_REFUND">Issue Cash Refund</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem' }}>Total Refund: <span style={{ color: '#ef4444' }}>{totalReturnAmount.toFixed(2)}</span></h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setPage('sales-management')} className="btn-secondary">Cancel</button>
                            <button onClick={handleSubmit} disabled={isSaving || returnItems.length === 0} className="btn-primary" style={{ backgroundColor: '#ef4444' }}>
                                {isSaving ? "Saving..." : "Process Return"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
