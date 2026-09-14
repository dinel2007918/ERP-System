import { useState } from "react";

type SidebarProps = {
    setPage: (page: string) => void;
};

function Sidebar({ setPage }: SidebarProps) {
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const toggleMenu = (menu: string) => {
        setOpenMenu(openMenu === menu ? null : menu);
    };

    return (
        <div className="sidebar">
            <h2>Menu</h2>
            <button onClick={() => setPage("dashboard")}>dashboard</button>

            <button onClick={() => toggleMenu("products")}>products{openMenu === "products" ? "▲" : "▼"}</button>
            {openMenu === "products" && (
                <div className="submenu">
                    <button onClick={() => setPage("new-item")}>New Item</button>
                    <button onClick={() => setPage("item-inquiry")}>Item Inquiry</button>
                    <button onClick={() => setPage("open-stock")}>Open Stock</button>
                    <button onClick={() => setPage("OEM")}>OEM</button>
                </div>
            )}

            <button onClick={() => toggleMenu("sales")}>sales{openMenu === "sales" ? "▲" : "▼"}</button>
            {openMenu === "sales" && (
                <div className="submenu">
                    <button onClick={() => setPage("invoice")}>Sales invoice</button>
                    <button onClick={() => setPage("cashbill")}>sales cancel</button>
                    <button onClick={() => setPage("customerbill")}>Sales return</button>
                    <button onClick={() => setPage("payment")}>sales return settle</button>
                    <button onClick={() => setPage("payment-report")}>Sales report</button>
                </div>
            )}

            <button onClick={() => toggleMenu("customers")}>customers{openMenu === "customers" ? "▲" : "▼"}</button>
            {openMenu === "customers" && (
                <div className="submenu">
                    <button onClick={() => setPage("new-customer")}>New Customer</button>
                    <button onClick={() => setPage("customer-inquiry")}>Customer Inquiry</button>
                    <button onClick={() => setPage("customer-payment")}>Customer Payment</button>
                    <button onClick={() => setPage("cheque-status")}>Cheque Status</button>
                    <button onClick={() => setPage("customer-report")}>Customer Report</button>
                </div>
            )}

            <button onClick={() => toggleMenu("purchase")}>purchase{openMenu === "purchase" ? "▲" : "▼"}</button>
            {openMenu === "purchase" && (
                <div className="submenu">
                    <button onClick={() => setPage("purchase-invoice")}>Purchase Invoice</button>
                    <button onClick={() => setPage("purchase-return")}>Purchase Invoice Return</button>
                    <button onClick={() => setPage("purchase-management")}>Purchase Invoice Management</button>
                </div>
            )}

            <button onClick={() => toggleMenu("users")}>users{openMenu === "users" ? "▲" : "▼"}</button>
            {openMenu === "users" && (
                <div className="submenu">
                    <button onClick={() => setPage("new-user")}>New User</button>
                    <button onClick={() => setPage("user-access")}>User Access</button>
                </div>
            )}
        </div>
    )
}
export default Sidebar;