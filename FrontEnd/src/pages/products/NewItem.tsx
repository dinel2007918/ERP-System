import { useState } from "react";
export default function AddItem() {
    //item details
    const [groupCode, setGroupCode] = useState("");
    const [typeCode, setTypeCode] = useState("");
    const [Brand, setBrand] = useState("");
    const [itemCode, setItemcode] = useState("");
    const [discription, setDiscription] = useState("");
    //price details
    const [cost, setCost] = useState("");
    const [WholesalePrice, setWholesalePrice] = useState("");
    const [retailPrice, setRetailPrice] = useState("");

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const item = {
            groupCode,
            typeCode,
            Brand,
            itemCode,
            discription,
            cost,
            WholesalePrice,
            retailPrice
        };

        console.log("Item submitted:", item);
        alert("Item added successfully!");

        // Clear all inputs by setting them to an empty string
        setGroupCode("");
        setTypeCode("");
        setBrand("");
        setItemcode("");
        setDiscription("");
        setCost("");
        setWholesalePrice("");
        setRetailPrice("");
    };

    const handleCancel = () => {
        // Clear all inputs by setting them to an empty string
        setGroupCode("");
        setTypeCode("");
        setBrand("");
        setItemcode("");
        setDiscription("");
        setCost("");
        setWholesalePrice("");
        setRetailPrice("");
    };

    return (
        <div className="form-container">
            <h2 className="form-title">New Item Form</h2>
            <form onSubmit={handleSubmit} className="premium-form">

                <div className="form-grid">
                    <div className="form-group">
                        <label>Group Code</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter the group code"
                            value={groupCode}
                            onChange={(e) => setGroupCode(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Type Code</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter the type code"
                            value={typeCode}
                            onChange={(e) => setTypeCode(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Brand</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter the brand"
                            value={Brand}
                            onChange={(e) => setBrand(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Item Code</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter the Item Code"
                            value={itemCode}
                            onChange={(e) => setItemcode(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Description</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Description..."
                        value={discription}
                        onChange={(e) => setDiscription(e.target.value)}
                        required
                    />
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label>Cost</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="0.00"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Wholesale Price</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="0.00"
                            value={WholesalePrice}
                            onChange={(e) => setWholesalePrice(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Retail Price</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="0.00"
                            value={retailPrice}
                            onChange={(e) => setRetailPrice(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={handleCancel}>Cancel</button>
                    <button type="submit" className="btn-primary">Save Item</button>
                </div>
            </form>
        </div>
    );
}