const crypto = require("crypto");
const path = require("path");

const admin = require("firebase-admin");
const { Timestamp, FieldValue } = require("firebase-admin/firestore");
const busboy = require("busboy");
const cors = require("cors");
const express = require("express");
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

if (process.env.FUNCTIONS_EMULATOR === "true") {
  try {
    require("dotenv").config({ path: path.join(__dirname, ".env") });
  } catch (_) {
    /* optional */
  }
}

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

function corsOptionsDelegate() {
  return cors({
    origin: (origin, cb) => {
      const allowed = process.env.CORS_ORIGINS;
      if (!allowed || allowed === "*") {
        cb(null, true);
        return;
      }
      const list = allowed.split(",").map((s) => s.trim());
      if (!origin || list.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"));
      }
    },
    methods: ["POST", "OPTIONS", "GET"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function normalizeTeamName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getPublicSiteUrl() {
  return (
    process.env.PUBLIC_SITE_URL ||
    "http://127.0.0.1:5000"
  ).replace(/\/$/, "");
}

function getTokenTtlMs() {
  const days = parseInt(process.env.STAGE2_TOKEN_TTL_DAYS || "30", 10);
  return Math.max(1, days) * 24 * 60 * 60 * 1000;
}

async function sendCompletionEmail(to, rawToken) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "HTQ <onboarding@resend.dev>";
  const site = getPublicSiteUrl();
  const link = `${site}/complete.html?t=${encodeURIComponent(rawToken)}`;

  if (!key) {
    console.warn(
      "RESEND_API_KEY not set; skipping email. Completion link (dev only):",
      link
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "HTQ 2026 — Complete your registration (payment)",
      html: `<p>Thank you for registering for HTQ 2026.</p>
<p>When payment is ready, use the link below to confirm your team name and upload your payment receipt.</p>
<p><a href="${link}">${link}</a></p>
<p>This link is private — do not share it. If you did not register, you can ignore this email.</p>`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend failed: ${res.status} ${text}`);
  }
}

const submitStage1App = express();
submitStage1App.use(corsOptionsDelegate());
submitStage1App.use(express.json({ limit: "512kb" }));

submitStage1App.post("/", async (req, res) => {
  try {
    const body = req.body || {};

      const registration = body.registration || {};
      const members = Array.isArray(body.members) ? body.members : [];

      const teamName = String(registration.teamName || "").trim();
      const leaderEmail = String(registration.leaderEmail || "").trim().toLowerCase();
      const leaderFullName = String(registration.leaderFullName || "").trim();
      const university = String(registration.university || "").trim();
      const teamSize = parseInt(registration.teamSize, 10);

      if (!teamName || !leaderEmail || !leaderFullName || !university) {
        res.status(400).json({ error: "Missing required registration fields" });
        return;
      }
      if (!Number.isFinite(teamSize) || teamSize < 3 || teamSize > 6) {
        res.status(400).json({ error: "Invalid team size" });
        return;
      }
      if (members.length !== teamSize) {
        res
          .status(400)
          .json({ error: "Members array length must match team size" });
        return;
      }

      for (const m of members) {
        if (
          !String(m.fullName || "").trim() ||
          !String(m.nationalId || "").trim()
        ) {
          res.status(400).json({ error: "Each member needs fullName and nationalId" });
          return;
        }
      }

      const ieeeMember = registration.ieeeMember === "yes" ? "yes" : "no";
      let ieeeMembershipId = String(registration.ieeeMembershipId || "").trim();
      if (ieeeMember === "no") {
        ieeeMembershipId = "";
      } else if (!ieeeMembershipId) {
        res.status(400).json({ error: "IEEE membership ID required when IEEE member" });
        return;
      }

      const rawToken = randomToken();
      const tokenHash = sha256Hex(rawToken);
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(
        Date.now() + getTokenTtlMs()
      );

      const docRef = db.collection("teams").doc();
      await docRef.set({
        status: "stage1_complete",
        registration: {
          teamName,
          leaderFullName,
          leaderEmail,
          university,
          ieeeMember,
          ieeeMembershipId,
          csMember: registration.csMember === "yes" ? "yes" : "no",
          teamSize,
          comments: String(registration.comments || "").trim(),
        },
        members: members.map((m) => ({
          fullName: String(m.fullName).trim(),
          nationalId: String(m.nationalId).trim(),
        })),
        stage2TokenHash: tokenHash,
        stage2TokenExpiresAt: expiresAt,
        stage2TokenUsed: false,
        paymentReceipt: null,
        createdAt: now,
        updatedAt: now,
      });

      try {
        await sendCompletionEmail(leaderEmail, rawToken);
      } catch (emailErr) {
        console.error(emailErr);
        await docRef.delete();
        res.status(502).json({
          error: "Could not send email. Check RESEND_API_KEY and RESEND_FROM.",
        });
        return;
      }

      res.status(200).json({
        ok: true,
        teamId: docRef.id,
        message:
          "Registration saved. Check the team leader email for the payment link.",
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

exports.submitStage1 = onRequest(
  { cors: false, memory: "256MiB" },
  submitStage1App
);

exports.completeStage2 = onRequest(
  { cors: false, memory: "512MiB" },
  (req, res) => {
    const corsHandler = corsOptionsDelegate();
    corsHandler(req, res, async () => {
      try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      const contentType = req.headers["content-type"] || "";
      if (!contentType.includes("multipart/form-data")) {
        res.status(400).json({ error: "Expected multipart/form-data" });
        return;
      }

      const fields = {};
      let fileBuffer = null;
      let fileMime = "application/octet-stream";
      let fileName = "receipt";

      if (!req.rawBody) {
        req.rawBody = req.body;
      }

      await new Promise((resolve, reject) => {
        const bb = busboy({ headers: req.headers });
        bb.on("file", (name, file, info) => {
          const chunks = [];
          fileMime = info.mimeType || fileMime;
          fileName = info.filename || fileName;
          file.on("data", (d) => chunks.push(d));
          file.on("end", () => {
            fileBuffer = Buffer.concat(chunks);
          });
        });
        bb.on("field", (name, val) => {
          fields[name] = val;
        });
        bb.on("error", reject);
        bb.on("close", resolve);
        
        if (req.rawBody) {
          bb.end(req.rawBody);
        } else {
          req.pipe(bb);
        }
      });

      const rawToken = String(fields.token || "").trim();
      const teamNameConfirmed = String(fields.teamName || "").trim();

      if (!rawToken || !teamNameConfirmed) {
        res.status(400).json({ error: "token and teamName are required" });
        return;
      }
      if (!fileBuffer || fileBuffer.length === 0) {
        res.status(400).json({ error: "Payment image file is required" });
        return;
      }

      const maxBytes = 5 * 1024 * 1024;
      if (fileBuffer.length > maxBytes) {
        res.status(400).json({ error: "File too large (max 5MB)" });
        return;
      }
      if (!String(fileMime).startsWith("image/")) {
        res.status(400).json({ error: "Only image uploads are allowed" });
        return;
      }

      const tokenHash = sha256Hex(rawToken);
      const snap = await db
        .collection("teams")
        .where("stage2TokenHash", "==", tokenHash)
        .limit(1)
        .get();

      if (snap.empty) {
        res.status(404).json({ error: "Invalid or expired link" });
        return;
      }

      const doc = snap.docs[0];
      const data = doc.data();
      const now = Timestamp.now();

      if (data.stage2TokenUsed === true) {
        res.status(410).json({ error: "This link has already been used" });
        return;
      }

      const exp = data.stage2TokenExpiresAt;
      if (exp && exp.toMillis && exp.toMillis() < Date.now()) {
        res.status(410).json({ error: "This link has expired" });
        return;
      }

      const storedName = normalizeTeamName(
        data.registration && data.registration.teamName
      );
      if (storedName !== normalizeTeamName(teamNameConfirmed)) {
        res.status(403).json({ error: "Team name does not match our records" });
        return;
      }

      const ext = path.extname(fileName) || ".jpg";
      const safeExt = ext.match(/^\.\w{1,8}$/) ? ext : ".jpg";
      const storagePath = `teams/${doc.id}/payment-receipt${safeExt}`;

      const storageFile = bucket.file(storagePath);
      await storageFile.save(fileBuffer, {
        metadata: {
          contentType: fileMime,
          cacheControl: "private, max-age=0",
        },
      });

      await doc.ref.update({
        status: "complete",
        paymentReceipt: {
          storagePath,
          contentType: fileMime,
          uploadedAt: now,
        },
        stage2TokenUsed: true,
        stage2TokenHash: FieldValue.delete(),
        stage2TokenExpiresAt: FieldValue.delete(),
        updatedAt: now,
      });

      res.status(200).json({
        ok: true,
        message: "Payment receipt uploaded. Your registration is complete.",
      });
      } catch (err) {
        console.error(err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Server error" });
        }
      }
    });
  }
);
