import { useState, useEffect } from "react";

export default function NewCustomer() {
    // Form state
    const [customerCode, setCustomerCode] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [discountTier, setDiscountTier] = useState("None");
    const [paymentType, setPaymentType] = useState("Cash");
    const [isActive, setIsActive] = useState(true);
    const [creditLimit, setCreditLimit] = useState("");
    const [creditPeriod, setCreditPeriod] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    // Autocomplete dropdown state
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [showCustDropdown, setShowCustDropdown] = useState(false);

    const handleCustomerSearch = async (e: any) => {
        const val = e.target.value.toUpperCase();
        setCustomerSearch(val);
        setCustomerName(val);
        setShowCustDropdown(true);

        try {
            const res = await fetch(`http://localhost:5005/api/customers/search?q=${val}`);
            const data = await res.json();
            setCustomerResults(Array.isArray(data) ? data : []);
        } catch (e) { }
    };

    const handleSelectCustomer = (c: any) => {
        setCustomerSearch(c.customer_name || "");
        setCustomerName(c.customer_name || "");
        setShowCustDropdown(false);

        setCustomerCode(c.customer_code || "");
        setContactNumber(c.contact_number || "");
        setEmail(c.email || "");
        setAddress(c.address || "");
        setDiscountTier(c.discount_tier || "None");
        setPaymentType(c.default_payment_type || "Cash");
        setIsActive(c.is_active === 1 || c.is_active === true);
        setCreditLimit(c.credit_limit || "");
        setCreditPeriod(c.credit_period || "");
        setIsEditing(true);
    };

    // Auto-generate customer code based on customerName 
    useEffect(() => {
        if (!customerName || customerName.trim() === '' || isEditing) {
            if (!isEditing) setCustomerCode("");
            return;
        }

        const fetchNextCode = async () => {
            try {
                const response = await fetch("http://localhost:5005/api/customers/next-customer-code", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: customerName })
                });
                const data = await response.json();
                if (data.customerCode) {
                    setCustomerCode(data.customerCode);
                }
            } catch (err) {
                console.error("Failed to generate code:", err);
            }
        };

        const debounceTimer = setTimeout(fetchNextCode, 500); // 500ms delay to prevent spamming
        return () => clearTimeout(debounceTimer);
    }, [customerName]);

    const handleRecall = async () => {
        if (!customerName) {
            alert("Please enter a Customer Name to search.");
            return;
        }

        try {
            const response = await fetch(`http://localhost:5005/api/customers/recall-by-name/${customerName}`);
            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Customer not found.");
                return;
            }

            // Fill form with recalled data
            const customer = data.customer;
            setCustomerCode(customer.customer_code || "");
            setCustomerName(customer.customer_name || "");
            setContactNumber(customer.contact_number || "");
            setEmail(customer.email || "");
            setAddress(customer.address || "");
            setDiscountTier(customer.discount_tier || "None");
            setIsActive(customer.is_active === 1 || customer.is_active === true);
            setCreditLimit(customer.credit_limit || "");
            setCreditPeriod(customer.credit_period || "");
            setIsEditing(true);
            alert("Customer recalled successfully!");
        } catch (error) {
            console.error("Error recalling customer:", error);
            alert("Failed to connect to the server for recall.");
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const customer = {
            customerCode,
            customerName,
            contactNumber,
            email,
            address,
            discountTier,
            paymentType,
            isActive,
            creditLimit,
            creditPeriod
        };

        try {
            const response = await fetch("http://localhost:5005/api/customers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(customer)
            });

            const data = await response.json();

            if (response.status === 409) {
                alert(data.message);
                return;
            }

            if (!response.ok) {
                alert(data.message || "Failed to save customer.");
                return;
            }

            alert("Customer saved successfully!");
            handleCancel();
        } catch (error) {
            console.error("Error saving customer:", error);
            alert("Failed to save. Please make sure the backend server is running.");
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setCustomerCode("");
        setCustomerName("");
        setContactNumber("");
        setEmail("");
        setAddress("");
        setDiscountTier("None");
        setPaymentType("Cash");
        setIsActive(true);
        setCreditLimit("");
        setCreditPeriod("");
    };

    return (
        <div className="form-container">
            <h2 className="form-title">New Customer Form</h2>
            <form onSubmit={handleSubmit} className="premium-form">

                {/* Active Checkbox top aligned */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        Active Customer
                    </label>
                </div>

                <div className="form-group" style={{ position: "relative", zIndex: 10 }}>
                    <label>Customer Name (Recall Customer)</label>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <div style={{ position: "relative", flex: 1 }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Full Name (E.g. Dineth)"
                                value={customerSearch}
                                onChange={handleCustomerSearch}
                                onFocus={handleCustomerSearch}
                                required
                                style={{ width: "100%" }}
                            />
                            {showCustDropdown && customerResults.length > 0 && (
                                <div className="autocomplete-dropdown" style={{ top: '100%', position: 'absolute', width: '100%', zIndex: 1000 }}>
                                    {customerResults.map(c => (
                                        <div key={c.id} className="autocomplete-item" onMouseDown={() => handleSelectCustomer(c)}>
                                            <strong>{c.customer_code}</strong> | {c.customer_name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleRecall}
                            style={{ padding: "0 15px", whiteSpace: "nowrap" }}
                        >
                            Recall
                        </button>
                    </div>
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label>Customer Code</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Auto-Generated"
                            value={customerCode}
                            readOnly
                            style={{ backgroundColor: "#f0f0f0", cursor: "not-allowed", flex: 1 }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Discount Tier</label>
                        <select
                            className="form-input"
                            style={{ padding: "11.5px 16px" }}
                            value={discountTier}
                            onChange={(e) => setDiscountTier(e.target.value)}
                        >
                            <option value="None">None</option>
                            <option value="1st Discount">1st Discount</option>
                            <option value="2nd Discount">2nd Discount</option>
                            <option value="3rd Discount">3rd Discount</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Default Payment Type</label>
                        <select
                            className="form-input"
                            style={{ padding: "11.5px 16px" }}
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

                <div className="form-grid">
                    <div className="form-group">
                        <label>Contact Number</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Phone..."
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value.toUpperCase())}
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value.toUpperCase())}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Address</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Customer Address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value.toUpperCase())}
                    />
                </div>

                <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={handleCancel}>Cancel</button>
                    <button type="submit" className="btn-primary">Save Customer</button>
                </div>
            </form>
        </div>
    );
}
