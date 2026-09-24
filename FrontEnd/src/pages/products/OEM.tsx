import { useState } from "react";

export default function OEM() {
    // Group State
    const [groupCode, setGroupCode] = useState("");
    const [groupName, setGroupName] = useState("");
    const [groupActive, setGroupActive] = useState(true);

    // Type State
    const [typeCode, setTypeCode] = useState("");
    const [typeName, setTypeName] = useState("");
    const [typeActive, setTypeActive] = useState(true);

    // Brand State
    const [brandCode, setBrandCode] = useState("");
    const [brandName, setBrandName] = useState("");
    const [brandActive, setBrandActive] = useState(true);

    // Form Handlers
    const handleSaveGroup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (groupCode.trim() && groupName.trim()) {
            const group = {
                groupCode: groupCode.trim(),
                groupName: groupName.trim(),
                active: groupActive
            };
            const response = await fetch("http://localhost:5005/api/group_code",
                {
                    method: "post",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(group)
                })
            const data = await response.json();
            console.log("Group Response:", data);

            if (data.success) {
                // Clear inputs after successful save
                setGroupCode("");
                setGroupName("");
                setGroupActive(true);
                alert("Group saved successfully!");
            } else {
                alert("Error: " + data.message);
            }
        }
    };

    const handleSaveType = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (typeCode.trim() && typeName.trim()) {
            const type_code = {
                typeCode: typeCode.trim(),
                typeName: typeName.trim(),
                active: typeActive
            };
            const response = await fetch("http://localhost:5005/api/type_code",
                {
                    method: "post",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(type_code)
                })
            const data = await response.json();
            console.log("Type Response:", data);

            if (data.success) {
                // Clear inputs after successful save
                setTypeCode("");
                setTypeName("");
                setTypeActive(true);
                alert("Type saved successfully!");
            } else {
                alert("Error: " + data.message);
            }
        }
    };

    const handleSaveBrand = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (brandCode.trim() && brandName.trim()) {
            const brand = {
                brandCode: brandCode.trim(),
                brandName: brandName.trim(),
                active: brandActive
            };
            const response = await fetch("http://localhost:5005/api/brands",
                {
                    method: "post",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(brand)
                })
            const data = await response.json();
            console.log("Brand Response:", data);

            if (data.success) {
                // Clear inputs after successful save
                setBrandCode("");
                setBrandName("");
                setBrandActive(true);
                alert("Brand saved successfully!");
            } else {
                alert("Error: " + data.message);
            }
        }
    };

    return (
        <div style={{ padding: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "40px" }}>

                {/* Group Section */}
                <div className="form-container">
                    <h2 className="form-title">Group</h2>
                    <form onSubmit={handleSaveGroup} className="premium-form">
                        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>Group Code</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="group code"
                                    value={groupCode}
                                    onChange={(e) => setGroupCode(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Group Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter Group Name"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', gridColumn: 'span 2' }}>
                                <input
                                    type="checkbox"
                                    id="groupActiveCheck"
                                    checked={groupActive}
                                    onChange={(e) => setGroupActive(e.target.checked)}
                                />
                                <label htmlFor="groupActiveCheck" style={{ margin: 0, cursor: 'pointer' }}>Set as Active by default</label>
                            </div>
                        </div>
                        <div className="form-actions" style={{ marginTop: "15px" }}>
                            <button type="submit" className="btn-primary">Save Group</button>
                        </div>
                    </form>
                </div>

                {/* Type Section */}
                <div className="form-container">
                    <h2 className="form-title">Type</h2>
                    <form onSubmit={handleSaveType} className="premium-form">
                        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>Type Code</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="type code"
                                    value={typeCode}
                                    onChange={(e) => setTypeCode(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Type Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter Type Name"
                                    value={typeName}
                                    onChange={(e) => setTypeName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', gridColumn: 'span 2' }}>
                                <input
                                    type="checkbox"
                                    id="typeActiveCheck"
                                    checked={typeActive}
                                    onChange={(e) => setTypeActive(e.target.checked)}
                                />
                                <label htmlFor="typeActiveCheck" style={{ margin: 0, cursor: 'pointer' }}>Set as Active by default</label>
                            </div>
                        </div>
                        <div className="form-actions" style={{ marginTop: "15px" }}>
                            <button type="submit" className="btn-primary">Save Type</button>
                        </div>
                    </form>
                </div>

                {/* Brand Section */}
                <div className="form-container">
                    <h2 className="form-title">Brand</h2>
                    <form onSubmit={handleSaveBrand} className="premium-form">
                        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>Brand Code</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="brand code"
                                    value={brandCode}
                                    onChange={(e) => setBrandCode(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Brand Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter Brand Name"
                                    value={brandName}
                                    onChange={(e) => setBrandName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', gridColumn: 'span 2' }}>
                                <input
                                    type="checkbox"
                                    id="brandActiveCheck"
                                    checked={brandActive}
                                    onChange={(e) => setBrandActive(e.target.checked)}
                                />
                                <label htmlFor="brandActiveCheck" style={{ margin: 0, cursor: 'pointer' }}>Set as Active by default</label>
                            </div>
                        </div>
                        <div className="form-actions" style={{ marginTop: "15px" }}>
                            <button type="submit" className="btn-primary">Save Brand</button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
}