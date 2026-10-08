import { useState } from "react";

export default function OpenStock() {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    const [itemCode, setItemCode] = useState("");
    const [description, setDescription] = useState("");
    const [quantity, setQuantity] = useState("");
    const [reason, setReason] = useState("Opening Stock Entry");

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSearchInput = async (e: any) => {
        const val = e.target.value.toUpperCase();
        setSearchTerm(val);

        if (val.length > 0) {
            setShowSearchDropdown(true);
            try {
                const res = await fetch(`http://localhost:5005/api/newItem/search?q=${val}`);
                const data = await res.json();
                setSearchResults(data.items || []);
            } catch (e) { }
        } else {
            setShowSearchDropdown(false);
        }
    };

    const handleSelectItem = (item: any) => {
        setItemCode(item.Item_Code);
        setDescription(item.Description);
        setSearchTerm(`${item.Item_Code} - ${item.Description} (Current: ${item.stock_quantity})`);
        setShowSearchDropdown(false);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!itemCode) {
            alert("Please select an item from the search dropdown.");
            return;
        }
        if (!quantity || isNaN(Number(quantity))) {
            alert("Please enter a valid quantity.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch("http://localhost:5005/api/stock/open", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemCode, quantity, reason })
            });

            const data = await response.json();
            if (response.ok && data.success) {
                alert(`Stock updated successfully! New Quantity: ${data.newQuantity}`);
                // Reset form
                setSearchTerm("");
                setItemCode("");
                setDescription("");
                setQuantity("");
                setReason("Opening Stock Entry");
            } else {
                alert(data.message || "Failed to update stock");
            }
        } catch (err) {
            console.error("Open Stock submit error:", err);
            alert("Network error: Make sure backend is running.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '800px', margin: 'auto' }}>
            <h2 className="form-title">Open Stock & Inventory Adjustment</h2>
            <form className="form-layout" onSubmit={handleSubmit}>
                <div className="form-section">
                    <h3 className="section-title">Item Details</h3>
                    <div className="form-grid">
                        <div className="form-group" style={{ position: 'relative', zIndex: 10, gridColumn: 'span 2' }}>
                            <label>Search Item</label>
                            <input
                                type="text"
                                className="form-input"
                                value={searchTerm}
                                onChange={handleSearchInput}
                                onFocus={() => { if (searchTerm) setShowSearchDropdown(true); }}
                                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                                placeholder="Search by Code, Product ID, or Description..."
                            />
                            {showSearchDropdown && searchResults.length > 0 && (
                                <div className="autocomplete-dropdown" style={{ top: '100%', position: 'absolute', width: '100%', zIndex: 20 }}>
                                    {searchResults.map((item: any) => (
                                        <div
                                            key={item.Item_Code}
                                            className="autocomplete-item"
                                            onMouseDown={() => handleSelectItem(item)}
                                        >
                                            <strong>{item.Product_ID}</strong> - {item.Description} (Stock: {item.stock_quantity})
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="form-section" style={{ marginTop: '20px' }}>
                    <h3 className="section-title">Adjustment Details</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Item Name / Description</label>
                            <input
                                type="text"
                                className="form-input"
                                value={description}
                                disabled
                                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                            />
                        </div>

                        <div className="form-group">
                            <label>Add Stock Quantity</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                placeholder="E.g., 50"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Reason / Reference</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Opening Stock Entry"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-actions" style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn-secondary" onClick={() => {
                        setSearchTerm(""); setItemCode(""); setDescription(""); setQuantity(""); setReason("Opening Stock Entry");
                    }}>
                        Reset
                    </button>
                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? "Updating..." : "Update Stock"}
                    </button>
                </div>
            </form>
        </div>
    );
}
