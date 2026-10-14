
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const db = require("./database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !JWT_SECRET) {
    throw new Error(
        "Missing ADMIN_EMAIL, ADMIN_PASSWORD, or JWT_SECRET in .env"
    );
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "20kb" }));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false
}));

// Consistent error response
function sendError(res, statusCode, message, errors = []) {
    return res.status(statusCode).json({
        status: "error",
        message,
        errors
    });
}

/* =====================================================
   ADMIN AUTHENTICATION MIDDLEWARE
===================================================== */

function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return sendError(res, 401, "Admin authentication required");
    }

    const token = authHeader.slice(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (
            decoded.role !== "admin" ||
            decoded.email !== ADMIN_EMAIL.trim().toLowerCase()
        ) {
            return sendError(res, 403, "Admin access denied");
        }

        req.admin = decoded;
        next();
    } catch (error) {
        return sendError(res, 401, "Invalid or expired token");
    }
}

// Validate internship input
function validateInternship(body, partial = false) {
    const errors = [];
    const required = [
        "title", "domain", "mode", "location",
        "duration", "skills", "openings"
    ];

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return ["Request body must be a JSON object"];
    }

    if (!partial) {
        for (const field of required) {
            if (body[field] === undefined) {
                errors.push(`${field} is required`);
            }
        }
    }

    const fields = ["title", "domain", "mode", "location", "duration"];

    for (const field of fields) {
        if (body[field] !== undefined) {
            if (typeof body[field] !== "string" || !body[field].trim()) {
                errors.push(`${field} must be a non-empty string`);
            } else if (body[field].trim().length > 150) {
                errors.push(`${field} must be 150 characters or fewer`);
            }
        }
    }

    if (body.stipend !== undefined &&
        (typeof body.stipend !== "string" || body.stipend.length > 100)) {
        errors.push("stipend must be a string of at most 100 characters");
    }

    if (body.mode !== undefined &&
        !["Remote", "Hybrid", "On-site"].includes(body.mode)) {
        errors.push("mode must be Remote, Hybrid, or On-site");
    }

    if (body.skills !== undefined &&
        (!Array.isArray(body.skills) ||
         body.skills.length > 30 ||
         !body.skills.every(skill =>
             typeof skill === "string" &&
             skill.trim().length > 0 &&
             skill.length <= 60
         ))) {
        errors.push("skills must be an array of non-empty strings (maximum 30)");
    }

    if (body.openings !== undefined &&
        (!Number.isInteger(body.openings) ||
         body.openings < 0 ||
         body.openings > 10000)) {
        errors.push("openings must be an integer between 0 and 10000");
    }

    if (body.applications_open !== undefined &&
        ![0, 1, true, false].includes(body.applications_open)) {
        errors.push("applications_open must be a boolean or 0/1");
    }

    return errors;
}

function formatInternship(row) {
    return {
        ...row,
        skills: JSON.parse(row.skills),
        applications_open: Boolean(row.applications_open)
    };
}

function getInternship(id) {
    const row = db.prepare(
        "SELECT * FROM internships WHERE id = ?"
    ).get(id);

    return row ? formatInternship(row) : null;
}

/* =====================================================
   ADMIN LOGIN API
===================================================== */

app.post("/api/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return sendError(
                res,
                400,
                "Email and password are required"
            );
        }

        const validEmail =
            email.trim().toLowerCase() ===
            ADMIN_EMAIL.trim().toLowerCase();

        // Support a bcrypt-hashed password if configured.
        const validPassword = ADMIN_PASSWORD.startsWith("$2")
            ? await bcrypt.compare(password, ADMIN_PASSWORD)
            : password === ADMIN_PASSWORD;

        if (!validEmail || !validPassword) {
            return sendError(res, 401, "Invalid email or password");
        }

        const token = jwt.sign(
            {
                role: "admin",
                email: ADMIN_EMAIL.trim().toLowerCase()
            },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.json({
            status: "success",
            message: "Admin login successful",
            data: {
                token,
                admin: {
                    email: ADMIN_EMAIL.trim().toLowerCase(),
                    role: "admin"
                }
            }
        });
    } catch (error) {
        console.error("Admin login error:", error.message);
        return sendError(res, 500, "Unable to log in");
    }
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "success",
        message: "InternBoard API is running",
        data: { database: db.open ? "connected" : "disconnected" }
    });
});

// READ: List internships with pagination and filters
app.get("/api/internships", (req, res) => {
    try {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 10);

        if (!Number.isInteger(page) || page < 1 ||
            !Number.isInteger(limit) || limit < 1 || limit > 50) {
            return sendError(res, 400, "Invalid pagination parameters");
        }

        const conditions = [];
        const params = {};

        if (req.query.domain) {
            conditions.push("domain = @domain");
            params.domain = req.query.domain;
        }

        if (req.query.mode) {
            conditions.push("mode = @mode");
            params.mode = req.query.mode;
        }

        if (req.query.search) {
            conditions.push(
                "(title LIKE @search OR domain LIKE @search OR location LIKE @search)"
            );
            params.search = `%${req.query.search.slice(0, 100)}%`;
        }

        const where = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        const total = db.prepare(
            `SELECT COUNT(*) AS total FROM internships ${where}`
        ).get(params).total;

        const rows = db.prepare(`
            SELECT * FROM internships
            ${where}
            ORDER BY created_at DESC, id ASC
            LIMIT @limit OFFSET @offset
        `).all({ ...params, limit, offset: (page - 1) * limit });

        res.json({
            status: "success",
            data: rows.map(formatInternship),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("List internships error:", error.message);
        sendError(res, 500, "Unable to retrieve internships");
    }
});

// READ: Single internship
app.get("/api/internships/:id", (req, res) => {
    try {
        const internship = getInternship(req.params.id);

        if (!internship) {
            return sendError(res, 404, "Internship not found");
        }

        res.json({ status: "success", data: internship });
    } catch (error) {
        console.error("Get internship error:", error.message);
        sendError(res, 500, "Unable to retrieve internship");
    }
});

// CREATE: New internship
app.post("/api/internships", requireAdmin,(req, res) => {
    const errors = validateInternship(req.body);

    if (errors.length) {
        return sendError(res, 400, "Validation failed", errors);
    }

    const id = typeof req.body.id === "string" &&
        /^[A-Za-z0-9_-]{1,50}$/.test(req.body.id)
        ? req.body.id
        : `INT-${Date.now()}`;

    const data = {
        id,
        title: req.body.title.trim(),
        domain: req.body.domain.trim(),
        mode: req.body.mode,
        location: req.body.location.trim(),
        stipend: typeof req.body.stipend === "string"
            ? req.body.stipend.trim()
            : "Not specified",
        duration: req.body.duration.trim(),
        skills: JSON.stringify(req.body.skills),
        openings: req.body.openings,
        applications_open: req.body.applications_open === undefined
            ? 1
            : Number(Boolean(req.body.applications_open))
    };

    try {
        db.prepare(`
            INSERT INTO internships (
                id, title, domain, mode, location, stipend,
                duration, skills, openings, applications_open
            ) VALUES (
                @id, @title, @domain, @mode, @location, @stipend,
                @duration, @skills, @openings, @applications_open
            )
        `).run(data);

        res.status(201).json({
            status: "success",
            message: "Internship created",
            data: getInternship(id)
        });
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_PRIMARYKEY" ||
            error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return sendError(res, 409, "Internship ID already exists");
        }

        console.error("Create internship error:", error.message);
        sendError(res, 500, "Unable to create internship");
    }
});

// UPDATE: Full or partial update
app.put("/api/internships/:id",requireAdmin, (req, res) => {
    const errors = validateInternship(req.body, true);

    if (errors.length) {
        return sendError(res, 400, "Validation failed", errors);
    }

    try {
        const current = db.prepare(
            "SELECT * FROM internships WHERE id = ?"
        ).get(req.params.id);

        if (!current) {
            return sendError(res, 404, "Internship not found");
        }

        const merged = {
            title: current.title,
            domain: current.domain,
            mode: current.mode,
            location: current.location,
            stipend: current.stipend,
            duration: current.duration,
            skills: JSON.parse(current.skills),
            openings: current.openings,
            applications_open: current.applications_open,
            ...req.body
        };

        const mergedErrors = validateInternship(merged);

        if (mergedErrors.length) {
            return sendError(res, 400, "Validation failed", mergedErrors);
        }

        const data = {
            title: merged.title.trim(),
            domain: merged.domain.trim(),
            mode: merged.mode,
            location: merged.location.trim(),
            stipend: merged.stipend,
            duration: merged.duration.trim(),
            skills: JSON.stringify(merged.skills),
            openings: merged.openings,
            applications_open: Number(Boolean(merged.applications_open)),
            id: req.params.id
        };

        db.prepare(`
            UPDATE internships SET
                title = @title,
                domain = @domain,
                mode = @mode,
                location = @location,
                stipend = @stipend,
                duration = @duration,
                skills = @skills,
                openings = @openings,
                applications_open = @applications_open,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `).run(data);

        res.json({
            status: "success",
            message: "Internship updated",
            data: getInternship(req.params.id)
        });
    } catch (error) {
        console.error("Update internship error:", error.message);
        sendError(res, 500, "Unable to update internship");
    }
});

// DELETE: Remove internship
app.delete("/api/internships/:id",requireAdmin, (req, res) => {
    try {
        const result = db.prepare(
            "DELETE FROM internships WHERE id = ?"
        ).run(req.params.id);

        if (result.changes === 0) {
            return sendError(res, 404, "Internship not found");
        }

        res.json({
            status: "success",
            message: "Internship deleted",
            data: { id: req.params.id }
        });
    } catch (error) {
        console.error("Delete internship error:", error.message);
        sendError(res, 500, "Unable to delete internship");
    }
});

// CREATE: Apply for an internship
app.post("/api/internships/:id/applications", (req, res) => {
    const { id } = req.params;
    const body = req.body;

    // Validate request body
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return sendError(res, 400, "Request body must be a JSON object");
    }

    const errors = [];

    if (
        typeof body.applicant_name !== "string" ||
        !body.applicant_name.trim()
    ) {
        errors.push("applicant_name is required");
    } else if (body.applicant_name.trim().length > 100) {
        errors.push("applicant_name must be 100 characters or fewer");
    }

    if (
        typeof body.applicant_email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.applicant_email.trim()) ||
        body.applicant_email.trim().length > 254
    ) {
        errors.push("A valid applicant_email is required");
    }

    if (
        body.portfolio_url !== undefined &&
        body.portfolio_url !== ""
    ) {
        try {
            const url = new URL(body.portfolio_url);

            if (
                !["https:", "http:"].includes(url.protocol) ||
                !url.hostname.includes(".")
            ) {
                errors.push("portfolio_url must be a valid HTTP or HTTPS URL");
            }
        } catch {
            errors.push("portfolio_url must be a valid URL");
        }
    }

    if (
        body.cover_message !== undefined &&
        (
            typeof body.cover_message !== "string" ||
            body.cover_message.length > 2000
        )
    ) {
        errors.push("cover_message must be a string of at most 2000 characters");
    }

    if (errors.length) {
        return sendError(res, 400, "Validation failed", errors);
    }

    try {
        const internship = db.prepare(
            "SELECT id, applications_open, openings FROM internships WHERE id = ?"
        ).get(id);

        if (!internship) {
            return sendError(res, 404, "Internship not found");
        }

        if (!internship.applications_open || internship.openings <= 0) {
            return sendError(res, 409, "Applications are closed for this internship");
        }

        const applicantName = body.applicant_name.trim();
        const applicantEmail = body.applicant_email.trim().toLowerCase();

        const result = db.prepare(`
            INSERT INTO applications (
                internship_id,
                applicant_name,
                applicant_email,
                portfolio_url,
                cover_message
            ) VALUES (?, ?, ?, ?, ?)
        `).run(
            id,
            applicantName,
            applicantEmail,
            body.portfolio_url ? body.portfolio_url.trim() : null,
            body.cover_message ? body.cover_message.trim() : null
        );

        return res.status(201).json({
            status: "success",
            message: "Application submitted successfully",
            data: {
                application_id: result.lastInsertRowid,
                internship_id: id,
                applicant_name: applicantName,
                applicant_email: applicantEmail
            }
        });
    } catch (error) {
        if (
            error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
            error.code === "SQLITE_CONSTRAINT_PRIMARYKEY"
        ) {
            return sendError(
                res,
                409,
                "You have already applied for this internship"
            );
        }

        console.error("Create application error:", error.message);
        return sendError(res, 500, "Unable to submit application");
    }
});

/* =====================================================
   ADMIN: VIEW ALL APPLICATIONS
===================================================== */

app.get("/api/admin/applications", requireAdmin, (req, res) => {
    try {
        const applications = db.prepare(`
            SELECT
                a.id,
                a.internship_id,
                a.applicant_name,
                a.applicant_email,
                a.portfolio_url,
                a.cover_message,
                a.created_at,
                i.title AS internship_title,
                i.domain AS internship_domain
            FROM applications a
            JOIN internships i ON i.id = a.internship_id
            ORDER BY a.created_at DESC, a.id DESC
        `).all();

        return res.json({
            status: "success",
            data: applications,
            total: applications.length
        });
    } catch (error) {
        console.error("Admin applications error:", error.message);
        return sendError(res, 500, "Unable to retrieve applications");
    }
});



// Unknown routes
app.use((req, res) => {
    sendError(res, 404, "Route not found");
});

// Malformed JSON / unexpected errors
app.use((error, req, res, next) => {
    if (error.type === "entity.parse.failed") {
        return sendError(res, 400, "Invalid JSON body");
    }

    console.error("Request error:", error.message);

    if (res.headersSent) return next(error);

    sendError(res, 500, "Internal server error");
});

app.listen(PORT, () => {
    console.log(`InternBoard API running at http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});
