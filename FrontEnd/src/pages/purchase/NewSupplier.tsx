import { useState, useEffect } from "react";

export default function NewSupplier() {
    const [supplierCode, setSupplierCode] = useState("");
    const [supplierName, setSupplierName] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [paymentType, setPaymentType] = useState("Cash");
    const [isActive, setIsActive] = useState(true);
    const [creditLimit, setCreditLimit] = useState("");
    const [creditPeriod, setCreditPeriod] = useState("");

    // Autocomplete dropdown state
    const [supplierSearch, setSupplierSearch] = useState("");
    const [supplierResults, setSupplierResults] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // Fetch suppliers for Recall
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
                    console.error("Error fetching suppliers:", error);
                }
            } else {
                setShowDropdown(false);
            }
        };
        const delayDebounceFn = setTimeout(() => { fetchSuppliers(); }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [supplierSearch]);

    const handleSelectSupplier = (s: any) => {
        setSupplierSearch("");
        setShowDropdown(false);
        setSupplierCode(s.supplier_code);
        setSupplierName(s.name);
        setContactNumber(s.contact || "");
        setEmail(s.email || "");
        setAddress(s.address || "");
        setPaymentType(s.default_payment_type || "Cash");
        setIsActive(s.status === 'ACTIVE');
        setCreditLimit(s.credit_limit || "");
        setCreditPeriod(s.credit_period || "");
    };

    // Auto-generate supplier code based on supplierName 
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase();
        setSupplierName(val);
        if (val.length >= 3 && (!supplierCode || supplierCode.includes('-'))) {
            const prefix = val.substring(0, 4).replace(/[^A-Z]/g, '');
            setSupplierCode(prefix + "-" + Math.floor(100 + Math.random() * 900));
        }
    };

    const handleSave = async () => {
        if (!supplierCode || !supplierName) {
            alert("Supplier Code and Name are required.");
            return;
        }

        const payload = {
            supplierCode,
            supplierName,
            contactNumber,
            email,
            address,
            paymentType,
            isActive,
            creditLimit,
            creditPeriod
        };

        try {
            const res = await fetch("http://localhost:5005/api/suppliers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                clearForm();
            } else {
                alert(data.message || "Failed to save supplier.");
            }
        } catch (error) {
            console.error("Error saving supplier:", error);
            alert("Network error while communicating with the server.");
        }
    };

    const clearForm = () => {
        setSupplierCode("");
        setSupplierName("");
        setContactNumber("");
        setEmail("");
        setAddress("");
        setPaymentType("Cash");
        setIsActive(true);
        setCreditLimit("");
        setCreditPeriod("");
    };

    return (
        <div className="form-container">
            <h2 className="form-title">New Supplier Registration</h2>

            {/* RECALL / SEARCH BAR */}
            <div className="form-group autocomplete-container" style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <label style={{ color: '#166534', fontWeight: 'bold' }}>Recall Existing Supplier (Edit Mode)</label>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Search by Name or Code to edit..."
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Left Column */}
                <div className="form-grid">
                    <div className="form-group">
                        <label>Supplier Code *</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. SUP-1001"
                            value={supplierCode}
                            onChange={(e) => setSupplierCode(e.target.value.toUpperCase())}
                        />
                    </div>

                    <div className="form-group">
                        <label>Supplier Name *</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter full name"
                            value={supplierName}
                            onChange={handleNameChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Contact Number</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter phone number"
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="Enter email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Default Payment Type</label>
                        <select
                            className="form-input"
                            value={paymentType}
                            onChange={(e) => setPaymentType(e.target.value)}
                        >
                            <option value="Cash">Cash Account</option>
                            <option value="Credit">Credit Account</option>
                        </select>
                    </div>

                    {paymentType === "Credit" && (
                        <>
                            <div className="form-group">
                                <label>Credit Limit (LKR)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="Enter Maximum Credit Limit"
                                    value={creditLimit}
                                    onChange={(e) => setCreditLimit(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Credit Period (Days)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="Number of Days (E.g. 30)"
                                    value={creditPeriod}
                                    onChange={(e) => setCreditPeriod(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Right Column */}
                <div className="form-grid">
                    <div className="form-group" style={{ gridColumn: "span 2" }}>
                        <label>Address</label>
                        <textarea
                            className="form-input"
                            placeholder="Enter physical address"
                            rows={4}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        ></textarea>
                    </div>

                    <div className="form-group checkbox-group" style={{ gridColumn: "span 2" }}>
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            id="isActive"
                        />
                        <label htmlFor="isActive" style={{ fontWeight: 'normal', display: 'inline', marginLeft: '8px' }}>
                            Supplier is active and can receive orders
                        </label>
                    </div>
                </div>
            </div>

            <div className="form-actions" style={{ marginTop: '30px' }}>
                <button className="btn-secondary" onClick={clearForm}>
                    Clear Form
                </button>
                <button className="btn-primary" onClick={handleSave}>
                    Save Supplier
                </button>
            </div>
        </div>
    );
}
