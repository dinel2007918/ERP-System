import express from 'express';
import promiseDb from '../dataBase.js';
import crypto from 'crypto';

const router = express.Router();

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateSessionToken() {
    return crypto.randomBytes(64).toString('hex');
}

// POST /api/users/login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password required." });
    }

    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        const hashedPassword = hashPassword(password);

        // 1. Verify credentials
        const [users] = await connection.query(`
            SELECT u.id, u.username, u.status, r.role_name, 
                   u.cost_price_access, u.profit_margin_access, u.price_modify, u.invoice_post_access, u.privileges
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.username = ? AND u.password_hash = ?
        `, [username, hashedPassword]);

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        const user = users[0];

        if (user.status === 'SUSPENDED') {
            return res.status(403).json({ success: false, message: "Account is currently suspended." });
        }

        // 2. Generate new session token natively
        const token = generateSessionToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

        // Clear old sessions for security
        await connection.query("DELETE FROM user_sessions WHERE user_id = ?", [user.id]);

        // Insert new session securely
        await connection.query(`
            INSERT INTO user_sessions (user_id, session_token, expires_at)
            VALUES (?, ?, ?)
        `, [user.id, token, expiresAt]);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role_name,
                cost_price_access: !!user.cost_price_access,
                profit_margin_access: !!user.profit_margin_access,
                price_modify: !!user.price_modify,
                dashboard_access: !!user.dashboard_access,
                invoice_post_access: !!user.invoice_post_access,
                privileges: user.privileges ? (typeof user.privileges === 'string' ? JSON.parse(user.privileges) : user.privileges) : []
            }
        });
    } catch (e) {
        console.error("Login Engine Error:", e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection.release) connection.release();
    }
});

// POST /api/users/logout
router.post("/logout", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.json({ success: true });

    const token = authHeader.split(' ')[1];
    if (!token) return res.json({ success: true });

    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        await connection.query("DELETE FROM user_sessions WHERE session_token = ?", [token]);
        res.json({ success: true, message: "Logged out successfully." });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection.release) connection.release();
    }
});

// GET /api/users/me — returns fresh permissions for the currently logged-in user
router.get("/me", async (req, res) => {
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        const [rows] = await connection.query(`
            SELECT u.id, u.username, r.role_name,
                   u.cost_price_access, u.profit_margin_access, u.price_modify,
                   u.dashboard_access, u.invoice_post_access, u.privileges
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `, [req.user.id]);

        if (rows.length === 0) return res.status(404).json({ success: false, message: "User not found." });

        const u = rows[0];
        res.json({
            success: true,
            user: {
                id: u.id,
                username: u.username,
                role: u.role_name,
                cost_price_access: !!u.cost_price_access,
                profit_margin_access: !!u.profit_margin_access,
                price_modify: !!u.price_modify,
                dashboard_access: !!u.dashboard_access,
                invoice_post_access: !!u.invoice_post_access,
                privileges: u.privileges ? (typeof u.privileges === 'string' ? JSON.parse(u.privileges) : u.privileges) : []
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection.release) connection.release();
    }
});

// GET /api/users/roles
router.get("/roles", async (req, res) => {
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        const [roles] = await connection.query("SELECT id, role_name FROM roles ORDER BY role_name");
        res.json(roles);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection.release) connection.release();
    }
});

// GET /api/users
router.get("/", async (req, res) => {
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        const [users] = await connection.query(`
            SELECT u.*, r.role_name 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.id DESC
        `);
        // Transform TINYINT to standard booleans natively for React matching
        const parsedUsers = users.map(user => ({
            ...user,
            credit_limit_auth: !!user.credit_limit_auth,
            credit_limit_modify: !!user.credit_limit_modify,
            max_disc_modify: !!user.max_disc_modify,
            all_location_access: !!user.all_location_access,
            authority: !!user.authority,
            cost_price_access: !!user.cost_price_access,
            profit_margin_access: !!user.profit_margin_access,
            price_modify: !!user.price_modify,
            dashboard_access: !!user.dashboard_access,
            invoice_post_access: !!user.invoice_post_access,
            privileges: user.privileges ? (typeof user.privileges === 'string' ? JSON.parse(user.privileges) : user.privileges) : []
        }));
        res.json(parsedUsers);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection.release) connection.release();
    }
});

// POST /api/users
router.post("/", async (req, res) => {
    const payload = req.body;
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        const hashedPassword = hashPassword(payload.password);
        await connection.query(`
            INSERT INTO users (
                full_name, mobile, email, role_id, username, password_hash,
                login_time, logout_time, company_name, 
                credit_limit_auth, credit_limit_modify, max_disc_modify,
                all_location_access, authority, cost_price_access,
                profit_margin_access, price_modify, dashboard_access, invoice_post_access, privileges
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            payload.full_name, payload.mobile || null, payload.email || null, payload.role_id,
            payload.username, hashedPassword,
            payload.login_time || '09:00 AM', payload.logout_time || '05:30 PM', payload.company_name || 'Head Office',
            payload.credit_limit_auth ? 1 : 0, payload.credit_limit_modify ? 1 : 0, payload.max_disc_modify ? 1 : 0,
            payload.all_location_access ? 1 : 0, payload.authority ? 1 : 0, payload.cost_price_access ? 1 : 0,
            payload.profit_margin_access ? 1 : 0, payload.price_modify ? 1 : 0,
            payload.dashboard_access ? 1 : 0, payload.invoice_post_access ? 1 : 0,
            payload.privileges ? JSON.stringify(payload.privileges) : JSON.stringify([])
        ]);
        res.json({ success: true, message: "User successfully created natively." });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "Username natively already exists." });
        }
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection.release) connection.release();
    }
});

// PUT /api/users/:id
router.put("/:id", async (req, res) => {
    const payload = req.body;
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        await connection.query(`
            UPDATE users SET
                full_name = ?, mobile = ?, email = ?, role_id = ?, username = ?,
                login_time = ?, logout_time = ?, company_name = ?,
                credit_limit_auth = ?, credit_limit_modify = ?, max_disc_modify = ?,
                all_location_access = ?, authority = ?, cost_price_access = ?,
                profit_margin_access = ?, price_modify = ?, dashboard_access = ?, invoice_post_access = ?, privileges = ?
            WHERE id = ?
        `, [
            payload.full_name, payload.mobile || null, payload.email || null, payload.role_id, payload.username,
            payload.login_time, payload.logout_time, payload.company_name,
            payload.credit_limit_auth ? 1 : 0, payload.credit_limit_modify ? 1 : 0, payload.max_disc_modify ? 1 : 0,
            payload.all_location_access ? 1 : 0, payload.authority ? 1 : 0, payload.cost_price_access ? 1 : 0,
            payload.profit_margin_access ? 1 : 0, payload.price_modify ? 1 : 0,
            payload.dashboard_access ? 1 : 0, payload.invoice_post_access ? 1 : 0,
            payload.privileges ? JSON.stringify(payload.privileges) : JSON.stringify([]),
            req.params.id
        ]);

        // Optional password reset dynamically
        if (payload.password) {
            const hashedPassword = hashPassword(payload.password);
            await connection.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedPassword, req.params.id]);
        }

        res.json({ success: true, message: "User securely updated natively." });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "Username natively already exists." });
        }
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection.release) connection.release();
    }
});

export default router;
