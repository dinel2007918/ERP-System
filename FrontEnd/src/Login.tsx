import { useState } from "react";
import "./Login.css";

export default function Login({ setAuthToken }: { setAuthToken: (token: string) => void }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await fetch("http://localhost:5005/api/users/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (data.success && data.token) {
                // Store safely in local storage
                localStorage.setItem("erp_session", data.token);
                localStorage.setItem("erp_user", JSON.stringify(data.user));
                // Unlock global application interface
                setAuthToken(data.token);
            } else {
                setError(data.message || "Invalid credentials.");
            }
        } catch (e) {
            setError("Network failure reaching authentication matrix.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-matrix">
            <div className="login-card">
                <div className="login-header">
                    <h2>System Login</h2>
                    <p>Enter your credentials to access the ERP</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    {error && <div className="login-alert">{error}</div>}

                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            placeholder="Enter Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Enter Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" disabled={isLoading} className="login-btn">
                        {isLoading ? "Logging..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}
