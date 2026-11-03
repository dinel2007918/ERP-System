import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import { useState } from "react";

// products
import NewItem from "./pages/products/NewItem";
import ItemInquiry from "./pages/products/ItemInquiry";
import OpenStock from "./pages/products/OpenStock";
import OEM from "./pages/products/OEM";

// sales
import SalesOrder from "./pages/sales/SalesOrder";
import PendingOrders from "./pages/sales/PendingOrders";
import SalesInvoice from "./pages/sales/SalesInvoice";
import SalesManagement from "./pages/sales/SalesManagement";
import SalesCancel from "./pages/sales/SalesCancel";
import SalesReturn from "./pages/sales/SalesReturn";
import SalesReturnSettle from "./pages/sales/SalesReturnSettle";
import ReturnPrint from "./pages/sales/ReturnPrint";
import CashRefund from "./pages/sales/CashRefund";
import SalesReport from "./pages/sales/SalesReport";
import InvoicePrint from "./pages/sales/InvoicePrint";
import DraftInvoices from "./pages/sales/DraftInvoices";

// customers
import NewCustomer from "./pages/customers/NewCustomer";
import CustomerInquiry from "./pages/customers/CustomerInquiry";
import CustomerPayment from "./pages/customers/CustomerPayment";
import ChequeStatus from "./pages/customers/ChequeStatus";
import CustomerReport from "./pages/customers/CustomerReport";

// purchase
import PurchaseInvoice from "./pages/purchase/PurchaseInvoice";
import PurchaseInvoiceReturn from "./pages/purchase/PurchaseInvoiceReturn";
import PurchaseInvoiceManagement from "./pages/purchase/PurchaseInvoiceManagement";
import NewSupplier from "./pages/purchase/NewSupplier";
import SupplierInquiry from "./pages/purchase/SupplierInquiry";
import SupplierPayment from "./pages/purchase/SupplierPayment";
import PurchaseReturnSettle from "./pages/purchase/PurchaseReturnSettle";
import SupplierChequeStatus from "./pages/purchase/SupplierChequeStatus";

// users
import NewUser from "./pages/users/NewUser";
import UserAccess from "./pages/users/UserAccess";

// auth
import Login from "./Login";

const pageTitles: Record<string, string> = {
    "dashboard": "Dashboard",
    "new-item": "New Item",
    "item-inquiry": "Item Inquiry",
    "open-stock": "Open Stock",
    "OEM": "OEM",
    "sales-order": "Sales Order",
    "pending-orders": "Pending Orders",
    "invoice": "Sales Invoice",
    "draft-invoices": "Draft Invoices Config",
    "sales-management": "Sales Management",
    "cashbill": "Sales Cancel",
    "customerbill": "Sales Return",
    "payment": "Sales Return Settle",
    "payment-report": "Sales Report",
    "invoice-print": "Print Invoice",
    "new-customer": "New Customer",
    "customer-inquiry": "Customer Inquiry",
    "customer-payment": "Customer Payment",
    "cheque-status": "Cheque Status",
    "customer-report": "Customer Report",
    "purchase-invoice": "Purchase Invoice",
    "purchase-return": "Purchase Invoice Return",
    "purchase-management": "Purchase Invoice Management",
    "new-supplier": "New Supplier",
    "supplier-inquiry": "Supplier Inquiry",
    "supplier-payment": "Supplier Payment",
    "new-user": "New User",
    "user-access": "User Access",
};

function App() {
    const [page, setPage] = useState("dashboard");
    const [passData, setPassData] = useState<any>(null); // For passing conversion data like Sales Order ID to Invoice
    const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem("erp_session"));

    const handleLogout = async () => {
        try {
            await fetch("http://localhost:5005/api/users/logout", {
                method: "POST",
                headers: { "Authorization": `Bearer ${authToken}` }
            });
        } catch (e) { }

        localStorage.removeItem("erp_session");
        localStorage.removeItem("erp_user");
        setAuthToken(null);
    };

    if (!authToken) {
        return <Login setAuthToken={setAuthToken} />;
    }

    return (
        <div className="app">
            <Sidebar setPage={setPage} handleLogout={handleLogout} />

            <div className="main-content">
                <Header title={pageTitles[page] || "Dashboard"} />

                <div className="page-content">
                    {page === "dashboard" && <Dashboard />}

                    {/* products */}
                    {page === "new-item" && <NewItem />}
                    {page === "item-inquiry" && <ItemInquiry />}
                    {page === "open-stock" && <OpenStock />}
                    {page === "OEM" && <OEM />}

                    {/* sales */}
                    {page === "sales-order" && <SalesOrder setPage={setPage} />}
                    {page === "pending-orders" && <PendingOrders setPage={setPage} setPassData={setPassData} />}
                    {page === "invoice" && <SalesInvoice setPage={setPage} passData={passData} setPassData={setPassData} />}
                    {page === "draft-invoices" && <DraftInvoices setPage={setPage} setPassData={setPassData} />}
                    {page === "sales-management" && <SalesManagement setPage={setPage} setPassData={setPassData} />}
                    {page === "cashbill" && <SalesCancel passData={passData} setPage={setPage} />}
                    {page === "customerbill" && <SalesReturn setPage={setPage} setPassData={setPassData} passData={passData} />}
                    {page === "payment" && <SalesReturnSettle />}
                    {page === "cash-refund" && <CashRefund />}
                    {page === "return-print" && passData && <ReturnPrint returnId={passData.returnId} setPage={setPage} />}
                    {page === "payment-report" && <SalesReport />}
                    {page === "invoice-print" && passData && <InvoicePrint invoiceId={passData.invoiceId} onBack={() => { setPage("invoice"); setPassData(null); }} />}

                    {/* customers */}
                    {page === "new-customer" && <NewCustomer />}
                    {page === "customer-inquiry" && <CustomerInquiry />}
                    {page === "customer-payment" && <CustomerPayment />}
                    {page === "cheque-status" && <ChequeStatus />}
                    {page === "customer-report" && <CustomerReport />}

                    {/* purchase */}
                    {page === "purchase-invoice" && <PurchaseInvoice />}
                    {page === "purchase-return" && <PurchaseInvoiceReturn />}
                    {page === "purchase-management" && <PurchaseInvoiceManagement />}
                    {page === "new-supplier" && <NewSupplier />}
                    {page === "supplier-inquiry" && <SupplierInquiry />}
                    {page === "supplier-payment" && <SupplierPayment />}
                    {page === "purchase-return-settle" && <PurchaseReturnSettle />}
                    {page === "supplier-cheque-status" && <SupplierChequeStatus />}

                    {/* users */}
                    {page === "new-user" && <NewUser />}
                    {page === "user-access" && <UserAccess />}
                </div>
            </div>
        </div>
    );
}

export default App;