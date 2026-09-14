import { useState } from "react";

interface Item {
    code: string;
    name: string;
    active: boolean;
}

export default function OEM() {
    // Group State
    const [groupCode, setGroupCode] = useState("");
    const [groupName, setGroupName] = useState("");
    const [groupActive, setGroupActive] = useState(true);
    const [groups, setGroups] = useState<Item[]>([]);

    // Type State
    const [typeCode, setTypeCode] = useState("");
    const [typeName, setTypeName] = useState("");
    const [typeActive, setTypeActive] = useState(true);
    const [types, setTypes] = useState<Item[]>([]);

    // Brand State
    const [brandCode, setBrandCode] = useState("");
    const [brandName, setBrandName] = useState("");
    const [brandActive, setBrandActive] = useState(true);
    const [brands, setBrands] = useState<Item[]>([]);

    // Form Handlers
    const handleSaveGroup = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (groupCode.trim() && groupName.trim()) {
            setGroups([...groups, { code: groupCode.trim(), name: groupName.trim(), active: groupActive }]);
            setGroupCode("");
            setGroupName("");
            setGroupActive(true);
            alert("Group saved successfully!");
        }
    };

    const handleSaveType = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (typeCode.trim() && typeName.trim()) {
            setTypes([...types, { code: typeCode.trim(), name: typeName.trim(), active: typeActive }]);
            setTypeCode("");
            setTypeName("");
            setTypeActive(true);
            alert("Type saved successfully!");
        }
    };

    const handleSaveBrand = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (brandCode.trim() && brandName.trim()) {
            setBrands([...brands, { code: brandCode.trim(), name: brandName.trim(), active: brandActive }]);
            setBrandCode("");
            setBrandName("");
            setBrandActive(true);
            alert("Brand saved successfully!");
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