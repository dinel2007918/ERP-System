import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./Dashboard.css";

function Dashboard() {
    const [metrics, setMetrics] = useState({
        dailySales: 0,
        dailyPurchases: 0,
        dailyPayments: 0,
        dailyProfit: 0
    });
    const [graphData, setGraphData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const token = localStorage.getItem("erp_session");
                if (!token) return;

                const res = await fetch("http://localhost:5005/api/dashboard/stats", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.success) {
                    setMetrics(data.topMetrics);
                    setGraphData(data.graphData);
                }
            } catch (e) {
                console.error("Dashboard Fetch Error:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboard();
    }, []);

    const formatCurrency = (val: number) => {
        return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (isLoading) {
        return <div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><h2>Loading Dashboard...</h2></div>;
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Dashboard overview</h1>
            </div>

            <div className="dashboard-metrics">
                <div className="metric-card sales">
                    <div className="metric-content">
                        <div className="metric-value">{formatCurrency(metrics.dailySales)}</div>
                        <div className="metric-label">Sales</div>
                    </div>
                    <div className="metric-footer">More <span>+</span></div>
                </div>

                <div className="metric-card purchase">
                    <div className="metric-content">
                        <div className="metric-value">{formatCurrency(metrics.dailyPurchases)}</div>
                        <div className="metric-label">Purchase</div>
                    </div>
                    <div className="metric-footer">More <span>+</span></div>
                </div>

                <div className="metric-card payments">
                    <div className="metric-content">
                        <div className="metric-value">{formatCurrency(metrics.dailyPayments)}</div>
                        <div className="metric-label">Payments Received</div>
                    </div>
                    <div className="metric-footer">More <span>+</span></div>
                </div>

                <div className="metric-card profit">
                    <div className="metric-content">
                        <div className="metric-value">{formatCurrency(metrics.dailyProfit)}</div>
                        <div className="metric-label">Profit</div>
                    </div>
                    <div className="metric-footer">More <span>+</span></div>
                </div>
            </div>

            <div className="dashboard-graph-panel">
                <div className="graph-header">
                    <h3><span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></span> Sales Graph (Last 12 Months)</h3>
                </div>

                <div style={{ width: '100%', height: '400px' }}>
                    <ResponsiveContainer>
                        <LineChart data={graphData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" stroke="rgba(255,255,255,0.8)" tick={{ fill: 'rgba(255,255,255,0.8)' }} />
                            <YAxis stroke="rgba(255,255,255,0.8)" tick={{ fill: 'rgba(255,255,255,0.8)' }} tickFormatter={(val) => (val / 1000) + 'k'} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '8px', border: 'none', color: '#1e293b' }} />
                            <Legend wrapperStyle={{ paddingTop: '20px', color: 'white' }} />

                            <Line type="monotone" dataKey="Sales" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="Cash" stroke="#d97706" strokeWidth={3} dot={{ r: 4, fill: '#d97706' }} />
                            <Line type="monotone" dataKey="Credit" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} />
                            <Line type="monotone" dataKey="Profit" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;