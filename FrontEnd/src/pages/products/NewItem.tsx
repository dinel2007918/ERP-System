import { useEffect, useState } from "react";
export default function AddItem() {
    //item details
    const [groupCode, setGroupCode] = useState("");
    const [groupSearchTerm, setGroupSearchTerm] = useState("");
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const [typeCode, setTypeCode] = useState("");
    const [typeSearchTerm, setTypeSearchTerm] = useState("");
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [Brand, setBrand] = useState("");
    const [brandSearchTerm, setBrandSearchTerm] = useState("");
    const [showBrandDropdown, setShowBrandDropdown] = useState(false);
    const [itemCode, setItemcode] = useState("");
    const [productId, setProductId] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [discription, setDiscription] = useState("");
    //price details
    const [cost, setCost] = useState("");
    const [salePrice, setSalePrice] = useState("");
    const [discount1, setDiscount1] = useState("");
    const [discount2, setDiscount2] = useState("");
    const [discount3, setDiscount3] = useState("");
    //select types,brands,groups
    const [brand, setbrand] = useState([]);
    const [group_code, setGroup_code] = useState([]);
    const [type_code, setType_code] = useState([]);
    //load the excisting brands from the database
    useEffect(() => {
        fetch("http://localhost:5005/api/brands")
            .then(Response => Response.json())
            .then(data => {
                setbrand(data);
            });

        fetch("http://localhost:5005/api/group_code")
            .then(Response => Response.json())
            .then(data => {
                setGroup_code(data);
            });

        fetch("http://localhost:5005/api/type_code")
            .then(Response => Response.json())
            .then(data => {
                setType_code(data);
            });
    }, []);

    // Auto-generate Item Code when groupCode, typeCode, and Brand are selected
    useEffect(() => {
        if (groupCode && typeCode && Brand) {
            setIsGenerating(true);
            fetch("http://localhost:5005/api/newItem/next-item-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ groupCode, typeCode, brandCode: Brand })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.itemCode) {
                        setItemcode(data.itemCode);
                    } else if (data.error) {
                        alert("Error generating code: " + data.error);
                        setItemcode("");
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch next item code:", err);
                    alert("Failed to connect to the server to generate Item Code.");
                    setItemcode("");
                })
                .finally(() => {
                    setIsGenerating(false);
                });
        } else {
            // Clear item code if not all 3 are selected yet
            setItemcode("");
        }
    }, [groupCode, typeCode, Brand]);

    const handleGroupSearch = (e: any) => {
        const value = e.target.value.toUpperCase();
        setGroupSearchTerm(value);
        setShowGroupDropdown(true);

        const match = group_code.find((g: any) =>
            (g.group_name || g.group_code).toLowerCase() === value.toLowerCase()
        );
        if (match) {
            setGroupCode(match.group_code);
        } else {
            setGroupCode("");
        }
    };

    const handleSelectGroup = (g: any) => {
        setGroupSearchTerm(g.group_name || g.group_code);
        setGroupCode(g.group_code);
        setShowGroupDropdown(false);
    };

    const handleTypeSearch = (e: any) => {
        const value = e.target.value.toUpperCase();
        setTypeSearchTerm(value);
        setShowTypeDropdown(true);

        const match = type_code.find((t: any) =>
            (t.type_name || t.type_code).toLowerCase() === value.toLowerCase()
        );
        if (match) {
            setTypeCode(match.type_code);
        } else {
            setTypeCode("");
        }
    };

    const handleSelectType = (t: any) => {
        setTypeSearchTerm(t.type_name || t.type_code);
        setTypeCode(t.type_code);
        setShowTypeDropdown(false);
    };

    const handleBrandSearch = (e: any) => {
        const value = e.target.value.toUpperCase();
        setBrandSearchTerm(value);
        setShowBrandDropdown(true);

        const match = brand.find((b: any) =>
            (b.brand_name || b.brand_code).toLowerCase() === value.toLowerCase()
        );
        if (match) {
            setBrand(match.brand_code);
        } else {
            setBrand("");
        }
    };

    const handleSelectBrand = (b: any) => {
        setBrandSearchTerm(b.brand_name || b.brand_code);
        setBrand(b.brand_code);
        setShowBrandDropdown(false);
    };
    const createItemCode = (b: any, t: any, g: any) => {
        const BrandCode = b.brand_code;
        const TypeCode = t.type_code;
        const GroupCode = g.group_code;


    }
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!groupCode) {
            alert("Please select a valid group code from the suggestions.");
            return;
        }
        if (!typeCode) {
            alert("Please select a valid type code from the suggestions.");
            return;
        }
        if (!Brand) {
            alert("Please select a valid brand from the suggestions.");
            return;
        }
        const item = {
            groupCode,
            typeCode,
            Brand,
            itemCode,
            productId,
            discription,
            cost,
            salePrice,
            discount1,
            discount2,
            discount3
        };
        try {
            const response = await fetch("http://localhost:5005/api/newItem", {
                method: "post",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(item)
            });

            const data = await response.json();

            if (response.status === 409) {
                // Concurrency error: Duplicate key
                alert(data.message);
                // Clear the item code to force regeneration if user triggers the effect again by reselecting, 
                // but actually, just setting it to empty will show that it failed. 
                // A safer way is to just let them click 'Save' again (we could auto-regenerate it, 
                // but telling the user exactly what's up is fine per plan).
                setItemcode("");
                return;
            }

            if (!response.ok) {
                alert(data.message || "Failed to save item.");
                return;
            }

            console.log("item Response:", data);
            console.log("Item submitted:", item);
            alert("Item added successfully!");
        } catch (error) {
            console.error("Error saving item:", error);
            alert("Failed to save. Please make sure the backend server is running.");
            return;
        }

        // Clear all inputs by setting them to an empty string
        setGroupCode("");
        setGroupSearchTerm("");
        setTypeCode("");
        setTypeSearchTerm("");
        setBrand("");
        setBrandSearchTerm("");
        setItemcode("");
        setProductId("");
        setDiscription("");
        setCost("");
        setSalePrice("");
        setDiscount1("");
        setDiscount2("");
        setDiscount3("");
    };

    const handleCancel = () => {
        // Clear all inputs by setting them to an empty string
        setGroupCode("");
        setGroupSearchTerm("");
        setTypeCode("");
        setTypeSearchTerm("");
        setBrand("");
        setBrandSearchTerm("");
        setItemcode("");
        setProductId("");
        setDiscription("");
        setCost("");
        setSalePrice("");
        setDiscount1("");
        setDiscount2("");
        setDiscount3("");
    };

    return (
        <div className="form-container">
            <h2 className="form-title">New Item Form</h2>
            <form onSubmit={handleSubmit} className="premium-form">

                <div className="form-grid">
                    <div className="form-group">
                        <label>Group Code</label>
                        <div className="autocomplete-container">
                            <input
                                type="text"
                                className="form-input"
                                value={groupSearchTerm}
                                onChange={handleGroupSearch}
                                onFocus={() => setShowGroupDropdown(true)}
                                onBlur={() => setTimeout(() => setShowGroupDropdown(false), 200)}
                                placeholder="Select or type group code"
                                required
                            />
                            {showGroupDropdown && (
                                <div className="autocomplete-dropdown">
                                    {Array.isArray(group_code) && group_code
                                        .filter((g: any) =>
                                            (g.group_name || g.group_code).toLowerCase().includes(groupSearchTerm.toLowerCase())
                                        )
                                        .map((g: any, i) => (
                                            <div
                                                key={i}
                                                className="autocomplete-item"
                                                onMouseDown={() => handleSelectGroup(g)}
                                            >
                                                {g.group_name || g.group_code}
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Type Code</label>
                        <div className="autocomplete-container">
                            <input
                                type="text"
                                className="form-input"
                                value={typeSearchTerm}
                                onChange={handleTypeSearch}
                                onFocus={() => setShowTypeDropdown(true)}
                                onBlur={() => setTimeout(() => setShowTypeDropdown(false), 200)}
                                placeholder="Select or type type code"
                                required
                            />
                            {showTypeDropdown && (
                                <div className="autocomplete-dropdown">
                                    {Array.isArray(type_code) && type_code
                                        .filter((t: any) =>
                                            (t.type_name || t.type_code).toLowerCase().includes(typeSearchTerm.toLowerCase())
                                        )
                                        .map((t: any, i) => (
                                            <div
                                                key={i}
                                                className="autocomplete-item"
                                                onMouseDown={() => handleSelectType(t)}
                                            >
                                                {t.type_name || t.type_code}
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Brand</label>
                        <div className="autocomplete-container">
                            <input
                                type="text"
                                className="form-input"
                                value={brandSearchTerm}
                                onChange={handleBrandSearch}
                                onFocus={() => setShowBrandDropdown(true)}
                                onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)}
                                placeholder="Select or type brand"
                                required
                            />
                            {showBrandDropdown && (
                                <div className="autocomplete-dropdown">
                                    {Array.isArray(brand) && brand
                                        .filter((b: any) =>
                                            (b.brand_name || b.brand_code).toLowerCase().includes(brandSearchTerm.toLowerCase())
                                        )
                                        .map((b: any, i) => (
                                            <div
                                                key={i}
                                                className="autocomplete-item"
                                                onMouseDown={() => handleSelectBrand(b)}
                                            >
                                                {b.brand_name || b.brand_code}
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Item Code</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder={isGenerating ? "Generating..." : "Auto-generated Item Code"}
                            value={itemCode}
                            readOnly
                            style={{ backgroundColor: "#e2e8f0", cursor: "not-allowed" }}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Product ID</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter the Product ID"
                        value={productId}
                        onChange={(e) => setProductId(e.target.value.toUpperCase())}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Description</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Description..."
                        value={discription}
                        onChange={(e) => setDiscription(e.target.value.toUpperCase())}
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
                        <label>Sale Price</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="0.00"
                            value={salePrice}
                            onChange={(e) => setSalePrice(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="discount-section">
                    <h3>Discounts</h3>
                    <div className="discount-grid">
                        <div className="form-group">
                            <label>1st Discount</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="0.00"
                                value={discount1}
                                onChange={(e) => setDiscount1(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>2nd Discount</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="0.00"
                                value={discount2}
                                onChange={(e) => setDiscount2(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>3rd Discount</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="0.00"
                                value={discount3}
                                onChange={(e) => setDiscount3(e.target.value)}
                            />
                        </div>
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