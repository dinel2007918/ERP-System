import { useState } from "react";

type SidebarProps = {
    setPage: (page: string) => void;
    handleLogout: () => void;
};

function Sidebar({ setPage, handleLogout }: SidebarProps) {
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const toggleMenu = (menu: string) => {
        setOpenMenu(openMenu === menu ? null : menu);
    };

    let userPrivileges: string[] = [];
    let hasDashboardAccess = false;
    let hasInvoicePostAccess = false;
    try {
        const userStr = localStorage.getItem("erp_user");
        if (userStr) {
            const userObj = JSON.parse(userStr);
            userPrivileges = userObj.privileges || [];
            hasDashboardAccess = !!userObj.dashboard_access;
            hasInvoicePostAccess = !!userObj.invoice_post_access;
        }
    } catch (e) { }

    const hasPriv = (priv: string) => userPrivileges.includes(priv);

    const canAccess = (priv: string) => hasPriv(priv);

    // Check if any granular keys in the block are authorized 
    const checkBlock = (keys: string[]) => keys.some(k => hasPriv(k));

    return (
        <div className="sidebar">
            <h2>Menu</h2>
            {hasDashboardAccess && (
                <button onClick={() => setPage("dashboard")}>dashboard</button>
            )}

            {checkBlock(["new-item", "item-inquiry", "open-stock", "OEM"]) && (
                <>
                    <button onClick={() => toggleMenu("products")}>products{openMenu === "products" ? "▲" : "▼"}</button>
                    {openMenu === "products" && (
                        <div className="submenu">
                            {canAccess("new-item") && <button onClick={() => setPage("new-item")}>New Item</button>}
                            {canAccess("item-inquiry") && <button onClick={() => setPage("item-inquiry")}>Item Inquiry</button>}
                            {canAccess("open-stock") && <button onClick={() => setPage("open-stock")}>Open Stock</button>}
                            {canAccess("OEM") && <button onClick={() => setPage("OEM")}>OEM</button>}
                        </div>
                    )}
                </>
            )}

            {checkBlock(["invoice", "draft-invoices", "to-ship", "sales-management", "cashbill", "customerbill", "payment", "cash-refund", "payment-report"]) && (
                <>
                    <button onClick={() => toggleMenu("sales")}>sales{openMenu === "sales" ? "▲" : "▼"}</button>
                    {openMenu === "sales" && (
                        <div className="submenu">
                            {canAccess("invoice") && <button onClick={() => setPage("invoice")}>Sales invoice</button>}
                            {(canAccess("draft-invoices") || hasInvoicePostAccess) && <button onClick={() => setPage("draft-invoices")}>Pending Invoices</button>}
                            {canAccess("to-ship") && <button onClick={() => setPage("to-ship")}>To Ship</button>}
                            {canAccess("sales-management") && <button onClick={() => setPage("sales-management")}>Sales Management</button>}
                            {canAccess("cashbill") && <button onClick={() => setPage("cashbill")}>Sales cancel</button>}
                            {canAccess("customerbill") && <button onClick={() => setPage("customerbill")}>Sales return</button>}
                            {canAccess("payment") && <button onClick={() => setPage("payment")}>Sales return settle</button>}
                            {canAccess("cash-refund") && <button onClick={() => setPage("cash-refund")}>Cash Refund</button>}
                            {canAccess("payment-report") && <button onClick={() => setPage("payment-report")}>Sales report</button>}
                        </div>
                    )}
                </>
            )}

            {checkBlock(["new-customer", "customer-inquiry", "customer-payment", "cheque-status", "customer-report"]) && (
                <>
                    <button onClick={() => toggleMenu("customers")}>customers{openMenu === "customers" ? "▲" : "▼"}</button>
                    {openMenu === "customers" && (
                        <div className="submenu">
                            {canAccess("new-customer") && <button onClick={() => setPage("new-customer")}>New Customer</button>}
                            {canAccess("customer-inquiry") && <button onClick={() => setPage("customer-inquiry")}>Customer Inquiry</button>}
                            {canAccess("customer-payment") && <button onClick={() => setPage("customer-payment")}>Customer Payment</button>}
                            {canAccess("cheque-status") && <button onClick={() => setPage("cheque-status")}>Cheque Status</button>}
                            {canAccess("customer-report") && <button onClick={() => setPage("customer-report")}>Customer Report</button>}
                        </div>
                    )}
                </>
            )}

            {checkBlock(["new-supplier", "supplier-inquiry", "supplier-payment", "purchase-invoice", "purchase-return", "purchase-return-settle", "supplier-cheque-status", "purchase-management"]) && (
                <>
                    <button onClick={() => toggleMenu("purchase")}>purchase{openMenu === "purchase" ? "▲" : "▼"}</button>
                    {openMenu === "purchase" && (
                        <div className="submenu">
                            {canAccess("new-supplier") && <button onClick={() => setPage("new-supplier")}>New Supplier</button>}
                            {canAccess("supplier-inquiry") && <button onClick={() => setPage("supplier-inquiry")}>Supplier Inquiry</button>}
                            {canAccess("supplier-payment") && <button onClick={() => setPage("supplier-payment")}>Supplier Payment (Cash/CQ)</button>}
                            {canAccess("purchase-invoice") && <button onClick={() => setPage("purchase-invoice")}>Purchase Invoice</button>}
                            {canAccess("purchase-return") && <button onClick={() => setPage("purchase-return")}>Purchase Invoice Return</button>}
                            {canAccess("purchase-return-settle") && <button onClick={() => setPage("purchase-return-settle")}>Supplier Return Settle</button>}
                            {canAccess("supplier-cheque-status") && <button onClick={() => setPage("supplier-cheque-status")}>Supplier Cheque Clearance</button>}
                            {canAccess("purchase-management") && <button onClick={() => setPage("purchase-management")}>Purchase Invoice Management</button>}
                        </div>
                    )}
                </>
            )}

            {checkBlock(["new-user", "user-access"]) && (
                <>
                    <button onClick={() => toggleMenu("users")}>users{openMenu === "users" ? "▲" : "▼"}</button>
                    {openMenu === "users" && (
                        <div className="submenu">
                            {canAccess("new-user") && <button onClick={() => setPage("new-user")}>New User</button>}
                            {canAccess("user-access") && <button onClick={() => setPage("user-access")}>User Access</button>}
                        </div>
                    )}
                </>
            )}

            <button
                onClick={handleLogout}
                style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    fontWeight: 'bold',
                    marginTop: '40px',
                    cursor: 'pointer',
                    borderRadius: '4px'
                }}
            >
                EXIT SESSION
            </button>
        </div>
    )
}
export default Sidebar;