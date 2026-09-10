import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import { useState } from "react";

// products
import NewItem from "./pages/products/NewItem";
import ItemInquiry from "./pages/products/ItemInquiry";
import OpenStock from "./pages/products/OpenStock";

// sales
import SalesInvoice from "./pages/sales/SalesInvoice";
import SalesCancel from "./pages/sales/SalesCancel";
import SalesReturn from "./pages/sales/SalesReturn";
import SalesReturnSettle from "./pages/sales/SalesReturnSettle";
import SalesReport from "./pages/sales/SalesReport";

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

// users
import NewUser from "./pages/users/NewUser";
import UserAccess from "./pages/users/UserAccess";

function App() {
    const [page, setPage] = useState("dashboard");

    return (
        <div className="app">
            <Sidebar setPage={setPage} />

            <div className="main-content">
                <Header />

                <div className="page-content">
                    {page === "dashboard" && <Dashboard />}

                    {/* products */}
                    {page === "new-item" && <NewItem />}
                    {page === "item-inquiry" && <ItemInquiry />}
                    {page === "open-stock" && <OpenStock />}

                    {/* sales */}
                    {page === "invoice" && <SalesInvoice />}
                    {page === "cashbill" && <SalesCancel />}
                    {page === "customerbill" && <SalesReturn />}
                    {page === "payment" && <SalesReturnSettle />}
                    {page === "payment-report" && <SalesReport />}

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

                    {/* users */}
                    {page === "new-user" && <NewUser />}
                    {page === "user-access" && <UserAccess />}
                </div>
            </div>
        </div>
    );
}

export default App;