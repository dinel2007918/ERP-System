import promiseDb from './dataBase.js';

export const authenticateToken = async (req, res, next) => {
    // Allows completely unauthenticated requests to bypass if specified (e.g. login)
    // Note: Since mounted on /api, req.path strips /api natively.
    if (req.path === '/users/login' || req.path === '/users/register') {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, message: "Access Denied: Missing Authentication Bearer Token." });
    }

    const token = authHeader.split(' ')[1]; // Format: "Bearer <token>"
    if (!token) {
        return res.status(401).json({ success: false, message: "Access Denied: Malformed Authentication Token." });
    }

    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        const [sessions] = await connection.query(`
            SELECT s.user_id, u.username, u.invoice_post_access, u.privileges, r.permissions
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE s.session_token = ? AND s.expires_at > NOW()
        `, [token]);

        if (sessions.length === 0) {
            return res.status(401).json({ success: false, message: "Session expired or invalid. Please strictly log in again." });
        }

        // Token dynamically validated successfully. Bind identity safely to the request layer:
        const session = sessions[0];
        req.user = {
            id: session.user_id,
            username: session.username,
            permissions: session.permissions ? JSON.parse(session.permissions) : [],
            invoice_post_access: !!session.invoice_post_access,
            privileges: session.privileges ? (typeof session.privileges === 'string' ? JSON.parse(session.privileges) : session.privileges) : []
        };

        next();
    } catch (e) {
        console.error("Middleware Check Failure:", e);
        res.status(500).json({ success: false, message: "Internal Auth Middleware Failure." });
    } finally {
        if (connection.release) connection.release();
    }
};
