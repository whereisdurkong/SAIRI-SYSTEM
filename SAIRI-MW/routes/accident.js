var express = require("express");
var bcrypt = require("bcrypt");
const router = express.Router();
var Sequelize = require("sequelize");
const nodemailer = require("nodemailer");
const { DataTypes } = Sequelize;
require("dotenv").config();

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const os = require("os");

var knex = require("knex")({
  client: "mssql",
  connection: {
    user: process.env.USER,
    password: process.env.PASSWORD,
    server: process.env.SERVER,
    database: process.env.DATABASE,
    port: parseInt(process.env.APP_SERVER_PORT),
    options: {
      enableArithAbort: true,
    },
  },
});

var db = new Sequelize(
  process.env.DATABASE,
  process.env.USER,
  process.env.PASSWORD,
  {
    host: process.env.SERVER,
    dialect: "mssql",
    port: parseInt(process.env.APP_SERVER_PORT),
  },
);
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const ACCIDENT = db.define(
  "accident_master",
  {
    id_master: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    accident_id: {
      type: DataTypes.STRING,
    },
    is_active: {
      type: DataTypes.STRING,
    },
    ac_status: {
      type: DataTypes.STRING,
    },
    created_by: {
      type: DataTypes.STRING,
    },
    created_at: {
      type: DataTypes.STRING,
    },
    updated_by: {
      type: DataTypes.STRING,
    },
    updated_at: {
      type: DataTypes.STRING,
    },
    is_active: {
      type: DataTypes.STRING,
    },
  },
  {
    freezeTableName: false,
    timestamps: false,
    createdAt: false,
    updatedAt: false,
    tableName: "accident_master",
  },
);

const SECTION1 = db.define(
  "accident_section_one_master",
  {
    id_master: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    accident_id: {
      type: DataTypes.STRING,
    },
    is_active: {
      type: DataTypes.STRING,
    },
    data_for: {
      type: DataTypes.STRING,
    },
    work_related: {
      // ← ADD THIS
      type: DataTypes.STRING,
    },
    goverment_notification_required: {
      type: DataTypes.STRING,
    },
    accident_incident_subtype: {
      type: DataTypes.STRING,
    },
    employer: {
      type: DataTypes.STRING,
    },
    name: {
      type: DataTypes.STRING,
    },
    chapa_number: {
      type: DataTypes.STRING,
    },
    job_designation: {
      type: DataTypes.STRING,
    },
    date_of_event: {
      type: DataTypes.STRING,
    },

    time_of_event: {
      type: DataTypes.STRING,
    },
    shift: {
      type: DataTypes.STRING,
    },

    date_reported: {
      type: DataTypes.STRING,
    },
    time_reported: {
      type: DataTypes.STRING,
    },

    location: {
      type: DataTypes.STRING,
    },

    specific_location: {
      type: DataTypes.STRING,
    },
    level: {
      type: DataTypes.STRING,
    },

    reported_by: {
      type: DataTypes.STRING,
    },
    supervisor_reported_to: {
      type: DataTypes.STRING,
    },
    group: {
      type: DataTypes.STRING,
    },
    department: {
      type: DataTypes.STRING,
    },
    section: {
      type: DataTypes.STRING,
    },
    group_head: {
      type: DataTypes.STRING,
    },
    department_head: {
      type: DataTypes.STRING,
    },
    section_head: {
      type: DataTypes.STRING,
    },
    immediate_supervisor: {
      // ← add this
      type: DataTypes.STRING,
    },
    date_hired: {
      type: DataTypes.STRING,
    },
    date_hired: {
      type: DataTypes.STRING,
    },
    date_of_birth: {
      type: DataTypes.STRING,
    },
    age: {
      type: DataTypes.STRING,
    },
    home_address: {
      type: DataTypes.STRING,
    },

    status: {
      type: DataTypes.STRING,
    },
    number_of_dependents: {
      type: DataTypes.STRING,
    },

    length_of_service: {
      type: DataTypes.STRING,
    },

    expereince_at_occupation: {
      type: DataTypes.STRING,
    },

    working_area: {
      type: DataTypes.STRING,
    },
    incident_accident_brief_description: {
      type: DataTypes.STRING,
    },
    immediate_actions_taken: {
      type: DataTypes.STRING,
    },
    participants: {
      type: DataTypes.STRING,
    },
    prepared_by: {
      type: DataTypes.STRING,
    },
    date_and_time: {
      type: DataTypes.STRING,
    },
    created_by: {
      type: DataTypes.STRING,
    },
    created_at: {
      type: DataTypes.STRING,
    },
    updated_by: {
      type: DataTypes.STRING,
    },
    updated_at: {
      type: DataTypes.STRING,
    },
  },
  {
    freezeTableName: false,
    timestamps: false,
    createdAt: false,
    updatedAt: false,
    tableName: "accident_section_one_master",
  },
);

//Unique ID Generation

//Unique ID Generation

function generateAccidentId(siriRefType, existingIds) {
  // Determine prefix based on siriRefType (case-insensitive)
  const normalizedType = String(siriRefType || "").toLowerCase();
  let sitePrefix;
  if (normalizedType === "underground") {
    sitePrefix = "SUG-AIRI-";
  } else if (normalizedType === "surface") {
    sitePrefix = "SSF-AIRI-";
  } else {
    // Default fallback
    sitePrefix = "ACC-";
  }

  // Last 2 digits of the current year, e.g. "25" for 2025
  const yearSuffix = String(new Date().getFullYear()).slice(-2);

  // Full prefix now includes the year, e.g. "SUG-AIRI-25-"
  // This naturally resets the counter each year, since prior years'
  // IDs won't match this year's prefix.
  const fullPrefix = `${sitePrefix}${yearSuffix}-`;

  // Get all existing IDs with the same site+year prefix
  const existingNumbers = existingIds
    .filter((id) => id.startsWith(fullPrefix))
    .map((id) => {
      const numberPart = id.slice(fullPrefix.length);
      return parseInt(numberPart, 10);
    })
    .filter((num) => !isNaN(num));

  // Find the next available number (fills gaps, otherwise increments)
  let nextNumber = 1;
  if (existingNumbers.length > 0) {
    const sortedNumbers = existingNumbers.sort((a, b) => a - b);
    for (let i = 0; i < sortedNumbers.length; i++) {
      if (sortedNumbers[i] !== i + 1) {
        nextNumber = i + 1;
        break;
      }
      nextNumber = sortedNumbers.length + 1;
    }
  }

  // Zero-pad to 3 digits: 1 -> "001", 42 -> "042", 999 stays "999"
  const paddedNumber = String(nextNumber).padStart(3, "0");

  return `${fullPrefix}${paddedNumber}`;
}

const uploadProofAttachment = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const rand = String(Math.floor(Math.random() * 90) + 10);
      const ext = path.extname(file.originalname);
      cb(null, `pf${datePart}${timePart}${rand}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type."));
  },
});

router.post(
  "/upload-proof-attachment-file",
  (req, res, next) => {
    uploadProofAttachment.single("file")(req, res, (err) => {
      if (err) {
        if (
          err instanceof multer.MulterError &&
          err.code === "LIMIT_FILE_SIZE"
        ) {
          return res.status(413).json({
            error: "File is too large. Maximum allowed size is 20 MB.",
          });
        }
        return res.status(400).json({ error: err.message || "Upload failed." });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { accident_id, uploaded_by } = req.body;

      if (!req.file)
        return res.status(400).json({ error: "No file uploaded." });
      if (!accident_id)
        return res.status(400).json({ error: "accident_id is required." });

      const targetDir = path.join(__dirname, "../ProofAttachment", accident_id);
      fs.mkdirSync(targetDir, { recursive: true });

      const targetPath = path.join(targetDir, req.file.filename);
      fs.copyFileSync(req.file.path, targetPath);
      fs.unlinkSync(req.file.path);

      const filePath = `ProofAttachment/${accident_id}/${req.file.filename}`;

      const newFile = {
        file_name: req.file.filename,
        original_name: req.file.originalname,
        file_path: filePath,
        uploaded_at: new Date().toISOString(),
      };

      const changes_made = `${uploaded_by || "System"} attached proof of completion: "${req.file.originalname}"`;
      try {
        // await knex('accident_section_logs_master').insert({
        //     accident_id,
        //     changes_made,
        //     section: 'section_eight',
        //     created_by: uploaded_by || 'System',
        //     created_at: new Date(),
        // });
      } catch (logErr) {
        console.log("UNABLE TO LOG PROOF ATTACHMENT UPLOAD:", logErr);
      }

      res.status(200).json({
        message: "Proof attachment uploaded successfully.",
        file: newFile,
      });
    } catch (err) {
      if (req.file?.path && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      console.log("UNABLE TO UPLOAD PROOF ATTACHMENT:", err);
      res.status(500).json({
        error: "Failed to upload proof attachment.",
        details: err.message,
      });
    }
  },
);

router.delete("/delete-proof-attachment-file", async (req, res) => {
  try {
    const { accident_id, file_name, deleted_by } = req.body;

    const targetPath = path.join(
      __dirname,
      "../ProofAttachment",
      accident_id,
      file_name,
    );
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);

    // const changes_made = `${deleted_by || 'System'} removed proof of completion: "${file_name}"`;
    try {
      // await knex('accident_section_logs_master').insert({
      //     accident_id,
      //     changes_made,
      //     section: 'section_eight',
      //     created_by: deleted_by || 'System',
      //     created_at: new Date(),
      // });
    } catch (logErr) {
      console.log("UNABLE TO LOG PROOF ATTACHMENT DELETE:", logErr);
    }

    res.status(200).json({ message: "Proof attachment deleted successfully." });
  } catch (err) {
    console.log("UNABLE TO DELETE PROOF ATTACHMENT:", err);
    res.status(500).json({
      error: "Failed to delete proof attachment.",
      details: err.message,
    });
  }
});

router.get("/proof-attachment-file/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const baseDir = path.join(__dirname, "../ProofAttachment");

    if (!fs.existsSync(baseDir)) {
      return res
        .status(404)
        .json({ error: "No proof attachments directory found." });
    }

    const subDirs = fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    let filePath = null;
    for (const dir of subDirs) {
      const candidate = path.join(baseDir, dir, filename);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }

    if (!filePath) return res.status(404).json({ error: "File not found." });

    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(baseDir);
    if (!resolvedPath.startsWith(resolvedBase + path.sep)) {
      return res.status(403).json({ error: "Access denied." });
    }

    res.sendFile(resolvedPath);
  } catch (err) {
    console.log("UNABLE TO SERVE PROOF ATTACHMENT FILE:", err);
    res
      .status(500)
      .json({ error: "Failed to serve file.", details: err.message });
  }
});

// ── CHANGE-LOG HELPERS ──────────────────────────────────────────────────────
// Normalises a raw DB/payload value into a comparable, printable string.
function normaliseValue(v) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    if (
      v.getUTCFullYear() === 1970 &&
      v.getUTCMonth() === 0 &&
      v.getUTCDate() === 1
    ) {
      const hh = String(v.getUTCHours()).padStart(2, "0");
      const mm = String(v.getUTCMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const sLower = s.toLowerCase();
  if (["1", "true", "yes"].includes(sLower)) return "1";
  if (["0", "false", "no"].includes(sLower)) return "0";
  const isoDateOnly = s.match(/^(\d{4}-\d{2}-\d{2})[T ]/i);
  if (isoDateOnly) return isoDateOnly[1];
  const epochTime = s.match(/^1970-01-01[T ](\d{2}):(\d{2})/i);
  if (epochTime) return `${epochTime[1]}:${epochTime[2]}`;
  const timeMatch = s.match(/^(\d{2}):(\d{2}):\d{2}$/);
  if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;
  return sLower;
}

const JSON_ARRAY_OR_OBJECT_FIELDS = new Set([
  "other_attachements",
  "corrective_table",
]);
const isEmptyJsonString = (v) =>
  v === "" || v === "[]" || v === "{}" || v === "null";

function buildSectionEightChangeLog({
  user,
  isCreate,
  accident_id,
  fieldLabels,
  existing,
  newPayload,
}) {
  const entries = [];

  for (const [col, label] of Object.entries(fieldLabels)) {
    if (col === "corrective_table") {
      let oldArr = [];
      let newArr = [];
      try {
        oldArr = existing?.[col] ? JSON.parse(existing[col]) : [];
      } catch {
        oldArr = [];
      }
      try {
        newArr = newPayload[col] ? JSON.parse(newPayload[col]) : [];
      } catch {
        newArr = [];
      }

      const itemLabel = (it, idx) =>
        it?.recommendation ? `#${idx + 1} ` : `#${idx + 1}`;

      const diffAttachments = (oldAtt = [], newAtt = []) => {
        const oldNames = new Set(
          oldAtt.map((a) => a.original_name || a.file_name),
        );
        const newNames = new Set(
          newAtt.map((a) => a.original_name || a.file_name),
        );
        const added = newAtt.filter(
          (a) => !oldNames.has(a.original_name || a.file_name),
        );
        const removed = oldAtt.filter(
          (a) => !newNames.has(a.original_name || a.file_name),
        );
        const parts = [];
        if (added.length)
          parts.push(
            `added ${added.map((a) => `"${a.original_name}"`).join(", ")}`,
          );
        if (removed.length)
          parts.push(
            `removed ${removed.map((a) => `"${a.original_name}"`).join(", ")}`,
          );
        return parts.join("; ");
      };

      const maxLen = Math.max(oldArr.length, newArr.length);
      const itemFieldLabels = {
        recommendation: "Recommendation",
        responsible_department: "Responsible Department",
        responsible_person: "Responsible Person",
        due_date: "Due Date",
        completion_responsible_person: "Completion Responsible Person",
        dept_head: "Dept Head",
        status: "Status",
        remarks: "Remarks",
      };

      for (let i = 0; i < maxLen; i++) {
        const oldIt = oldArr[i];
        const newIt = newArr[i];

        if (oldIt && !newIt) {
          entries.push(
            `${user} removed Corrective Action Item ${itemLabel(oldIt, i)}`,
          );
          continue;
        }
        if (!oldIt && newIt) {
          entries.push(
            `${user} added Corrective Action Item ${itemLabel(newIt, i)}`,
          );
          continue;
        }
        if (!oldIt && !newIt) continue;

        const itemChanges = [];
        for (const [fkey, flabel] of Object.entries(itemFieldLabels)) {
          const ov = normaliseValue(oldIt[fkey]);
          const nv = normaliseValue(newIt[fkey]);
          if (ov !== nv)
            itemChanges.push(
              `${flabel}: "${ov || "empty"}" → "${nv || "empty"}"`,
            );
        }

        const attDiff = diffAttachments(
          oldIt.proof_attachments,
          newIt.proof_attachments,
        );

        const otherFieldChanges = itemChanges; // recommendation/dept/etc. diffs collected above
        if (otherFieldChanges.length > 0) {
          entries.push(
            `${user} updated Corrective Action Item ${itemLabel(newIt, i)} — ${otherFieldChanges.join("; ")}`,
          );
        }
        if (attDiff) {
          entries.push(
            `${user} updated Proof Attachments on Corrective Action Item ${itemLabel(newIt, i)} — ${attDiff}`,
          );
        }
      }

      continue;
    }

    // Other fields: normal empty-aware diff
    let oldVal = existing ? normaliseValue(existing[col]) : "";
    let newVal = normaliseValue(newPayload[col]);
    if (JSON_ARRAY_OR_OBJECT_FIELDS.has(col)) {
      if (isEmptyJsonString(oldVal)) oldVal = "";
      if (isEmptyJsonString(newVal)) newVal = "";
    }
    if (oldVal === newVal) continue;

    entries.push(
      isCreate
        ? `${user} created and change ${label}: from "${oldVal || "empty"}" to "${newVal || "empty"}"`
        : `${user} updated and change ${label}: from "${oldVal || "empty"}" to "${newVal || "empty"}"`,
    );
  }

  if (entries.length === 0) {
    return isCreate
      ? `${user} created Section 8 for AIRI number: ${accident_id} with no fields filled.`
      : `${user} updated Section 8 for ${accident_id} with no detected field changes.`;
  }

  return entries.join("\n");
}

function buildChangeLog({
  user,
  isCreate,
  fieldLabels,
  existing,
  newPayload,
  onlyFilledOnCreate = true,
}) {
  const verb = isCreate ? "created" : "updated";
  const lines = [];

  for (const [col, label] of Object.entries(fieldLabels)) {
    let oldVal = existing ? normaliseValue(existing[col]) : "";
    let newVal = normaliseValue(newPayload[col]);

    if (JSON_ARRAY_OR_OBJECT_FIELDS.has(col)) {
      if (isEmptyJsonString(oldVal)) oldVal = "";
      if (isEmptyJsonString(newVal)) newVal = "";
    }

    if (isCreate) {
      if (onlyFilledOnCreate && newVal === "") continue;

      // Special case: recurrent_injury_illness stores 1/0, show as Yes/No in logs
      if (col === "recurrent_injury_illness") {
        const toYesNo = (v) =>
          v === "1" ? "Yes" : v === "0" ? "No" : v || "empty";
        lines.push(
          `${user} ${verb} and change ${label}: from "${toYesNo(oldVal)}" to "${toYesNo(newVal)}"`,
        );
        continue;
      }

      lines.push(
        `${user} ${verb} and change ${label}: from "${oldVal || "empty"}" to "${newVal || "empty"}"`,
      );
    } else {
      if (oldVal === newVal) continue;

      // Special case: recurrent_injury_illness stores 1/0, show as Yes/No in logs
      if (col === "recurrent_injury_illness") {
        const toYesNo = (v) =>
          v === "1" ? "Yes" : v === "0" ? "No" : v || "empty";
        lines.push(
          `${user} ${verb} and change ${label}: from "${toYesNo(oldVal)}" to "${toYesNo(newVal)}"`,
        );
        continue;
      }

      lines.push(
        `${user} ${verb} and change ${label}: from "${oldVal || "empty"}" to "${newVal || "empty"}"`,
      );
    }
  }

  if (lines.length === 0) {
    return null; // signal: nothing changed, skip logging
  }

  return lines.join("\n");
}

const parseTimeForSQL = (val) => {
  if (!val) return null;
  if (/^\d{2}:\d{2}$/.test(val)) return `${val}:00`;
  if (/^\d{2}:\d{2}:\d{2}/.test(val)) return val;
  return null;
};

function buildSectionOneChangeLog({
  user,
  isCreate,
  accident_id,
  fieldLabels,
  existing,
  newPayload,
}) {
  if (isCreate) {
    return `${user} created ${accident_id}`;
  }

  const entries = [];
  for (const [col, label] of Object.entries(fieldLabels)) {
    const oldVal = existing ? normaliseValue(existing[col]) : "";
    const newVal = normaliseValue(newPayload[col]);

    if (oldVal === newVal) continue;

    if (col === "goverment_notification_required") {
      const toYesNo = (v) =>
        v === "1" ? "Yes" : v === "0" ? "No" : v || "empty";
      entries.push(
        `${user} updated ${label} from ${toYesNo(oldVal)} to ${toYesNo(newVal)}`,
      );
      continue;
    }

    if (col === "participants") {
      let oldArr = [];
      let newArr = [];
      try {
        oldArr = existing?.[col] ? JSON.parse(existing[col]) : [];
      } catch {
        oldArr = [];
      }
      try {
        newArr = newPayload[col] ? JSON.parse(newPayload[col]) : [];
      } catch {
        newArr = [];
      }

      const stringifyP = (p) =>
        JSON.stringify({
          name: p.name || "",
          department: p.department || "",
          involvementType: p.involvementType || "",
        });

      const oldSet = new Set(oldArr.map(stringifyP));
      const newSet = new Set(newArr.map(stringifyP));

      const added = newArr.filter((p) => !oldSet.has(stringifyP(p)));
      const removed = oldArr.filter((p) => !newSet.has(stringifyP(p)));

      if (
        added.length > 0 &&
        removed.length > 0 &&
        added.length === removed.length
      ) {
        // Same number added and removed = treat as edit(s), pair them up
        for (let i = 0; i < added.length; i++) {
          entries.push(
            `${user} updated participants from ${JSON.stringify([removed[i]])} to ${JSON.stringify([added[i]])}`,
          );
        }
      } else {
        if (added.length > 0) {
          entries.push(
            `${user} updated participants added ${JSON.stringify(added)}`,
          );
        }
        if (removed.length > 0) {
          entries.push(
            `${user} updated participants removed ${JSON.stringify(removed)}`,
          );
        }
      }

      if (added.length === 0 && removed.length === 0 && oldVal !== newVal) {
        entries.push(`${user} updated participants`);
      }
      continue;
    }

    entries.push(
      `${user} updated ${label} from ${oldVal || "empty"} to ${newVal || "empty"}`,
    );
  }
  if (entries.length === 0) {
    return `${user} updated ${accident_id} with no detected field changes`;
  }

  // Wrap as {"entry1","entry2",...}
  const quoted = entries.map((e) => `"${e.replace(/"/g, '\\"')}"`).join(",");
  return `{${quoted}}`;
}

function getFileType(filename) {
  if (!filename) return "unknown";
  const ext = path.extname(filename).toLowerCase();
  const typeMap = {
    ".pdf": "PDF",
    ".doc": "Word Document",
    ".docx": "Word Document",
    ".xls": "Excel Spreadsheet",
    ".xlsx": "Excel Spreadsheet",
    ".jpg": "Image",
    ".jpeg": "Image",
    ".png": "Image",
    ".gif": "Image",
    ".webp": "Image",
  };
  return typeMap[ext] || "File";
}

const uploadTreatment = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Use OS temp dir — accident_id not yet available here
      cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const rand = String(Math.floor(Math.random() * 90) + 10);
      const ext = path.extname(file.originalname);
      cb(null, `tp${datePart}${timePart}${rand}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else
      cb(
        new Error(
          "Invalid file type. Only PDF, Word, Excel, and images are allowed.",
        ),
      );
  },
});

const uploadAttachment = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const rand = String(Math.floor(Math.random() * 90) + 10);
      const ext = path.extname(file.originalname);
      cb(null, `att${datePart}${timePart}${rand}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type."));
  },
});

router.post(
  "/upload-attachment-file",
  (req, res, next) => {
    uploadAttachment.single("file")(req, res, (err) => {
      if (err) {
        if (
          err instanceof multer.MulterError &&
          err.code === "LIMIT_FILE_SIZE"
        ) {
          return res.status(413).json({
            error: "File is too large. Maximum allowed size is 20 MB.",
          });
        }
        return res.status(400).json({ error: err.message || "Upload failed." });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { accident_id, uploaded_by } = req.body;

      if (!req.file)
        return res.status(400).json({ error: "No file uploaded." });
      if (!accident_id)
        return res.status(400).json({ error: "accident_id is required." });

      const targetDir = path.join(__dirname, "../Attachments", accident_id);
      fs.mkdirSync(targetDir, { recursive: true });

      const targetPath = path.join(targetDir, req.file.filename);
      fs.copyFileSync(req.file.path, targetPath);
      fs.unlinkSync(req.file.path);

      const filePath = `Attachments/${accident_id}/${req.file.filename}`;

      const existing = await knex("accident_section_eight_master")
        .where("accident_id", accident_id)
        .first();

      let currentAttachments = [];
      try {
        if (existing?.other_attachements) {
          currentAttachments = JSON.parse(existing.other_attachements);
        }
      } catch {
        currentAttachments = [];
      }

      const newFile = {
        file_name: req.file.filename,
        original_name: req.file.originalname,
        file_path: filePath,
        uploaded_at: new Date().toISOString(),
      };

      currentAttachments.push(newFile);

      const fileType = getFileType(req.file.originalname);
      const changes_made = `${uploaded_by || "System"} attached file: "${req.file.originalname}"`;
      await knex.transaction(async (trx) => {
        if (existing) {
          await trx("accident_section_eight_master")
            .where("accident_id", accident_id)
            .update({
              other_attachements: JSON.stringify(currentAttachments),
              updated_by: uploaded_by,
              updated_at: new Date(),
            });
        } else {
          await trx("accident_section_eight_master").insert({
            accident_id,
            other_attachements: JSON.stringify(currentAttachments),
            created_by: uploaded_by,
            created_at: new Date(),
          });
        }

        await trx("accident_section_logs_master").insert({
          accident_id,
          changes_made,
          section: "section_eight",
          created_by: uploaded_by || "System",
          created_at: new Date(),
        });
      });

      res
        .status(200)
        .json({ message: "Attachment uploaded successfully.", file: newFile });
    } catch (err) {
      if (req.file?.path && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      console.log("UNABLE TO UPLOAD ATTACHMENT:", err);
      res
        .status(500)
        .json({ error: "Failed to upload attachment.", details: err.message });
    }
  },
);

router.delete("/delete-attachment-file", async (req, res) => {
  try {
    const { accident_id, file_name, deleted_by } = req.body;

    const existing = await knex("accident_section_eight_master")
      .where("accident_id", accident_id)
      .first();

    let currentAttachments = [];
    let removedFile = null;

    try {
      if (existing?.other_attachements) {
        currentAttachments = JSON.parse(existing.other_attachements);
        removedFile = currentAttachments.find((f) => f.file_name === file_name);
      }
    } catch {
      currentAttachments = [];
    }

    if (removedFile) {
      const absPath = path.join(__dirname, "..", removedFile.file_path);
      if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
    }

    const updatedAttachments = currentAttachments.filter(
      (f) => f.file_name !== file_name,
    );

    const fileType = getFileType(removedFile?.original_name || file_name);
    const changes_made = `${deleted_by || "System"} removed file: "${removedFile?.original_name || file_name}"`;
    await knex.transaction(async (trx) => {
      await trx("accident_section_eight_master")
        .where("accident_id", accident_id)
        .update({
          other_attachements: JSON.stringify(updatedAttachments),
          updated_by: deleted_by,
          updated_at: new Date(),
        });

      await trx("accident_section_logs_master").insert({
        accident_id,
        changes_made,
        section: "section_eight",
        created_by: deleted_by || "System",
        created_at: new Date(),
      });
    });

    res.status(200).json({ message: "Attachment deleted successfully." });
  } catch (err) {
    console.log("UNABLE TO DELETE ATTACHMENT:", err);
    res
      .status(500)
      .json({ error: "Failed to delete attachment.", details: err.message });
  }
});

// Serve attachment files
router.get("/attachment-file/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const baseDir = path.join(__dirname, "../Attachments");

    if (!fs.existsSync(baseDir)) {
      return res.status(404).json({ error: "No attachments directory found." });
    }

    const subDirs = fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    let filePath = null;
    for (const dir of subDirs) {
      const candidate = path.join(baseDir, dir, filename);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }

    if (!filePath) return res.status(404).json({ error: "File not found." });

    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(baseDir);
    if (!resolvedPath.startsWith(resolvedBase + path.sep)) {
      return res.status(403).json({ error: "Access denied." });
    }

    res.sendFile(resolvedPath);
  } catch (err) {
    console.log("UNABLE TO SERVE ATTACHMENT FILE:", err);
    res
      .status(500)
      .json({ error: "Failed to serve file.", details: err.message });
  }
});

// ── SECTION 1 SPECIFIC CHANGE-LOG FORMAT ────────────────────────────────────

router.get("/treatment-file/:filename", async (req, res) => {
  try {
    const { filename } = req.params;

    // Search for the file across all accident subdirectories
    const baseDir = path.join(__dirname, "../TreatmentProvided");

    if (!fs.existsSync(baseDir)) {
      return res
        .status(404)
        .json({ error: "No treatment files directory found." });
    }

    // Walk accident_id subdirectories to find the file
    const subDirs = fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    let filePath = null;
    for (const dir of subDirs) {
      const candidate = path.join(baseDir, dir, filename);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({ error: "File not found." });
    }

    // Security check: make sure the resolved path stays inside TreatmentProvided
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(baseDir);
    if (!resolvedPath.startsWith(resolvedBase + path.sep)) {
      return res.status(403).json({ error: "Access denied." });
    }

    res.sendFile(resolvedPath);
  } catch (err) {
    console.log("UNABLE TO SERVE TREATMENT FILE:", err);
    res
      .status(500)
      .json({ error: "Failed to serve file.", details: err.message });
  }
});

router.post(
  "/upload-treatment-file",
  (req, res, next) => {
    uploadTreatment.single("file")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
              error: "File is too large. Maximum allowed size is 20 MB.",
            });
          }
          return res.status(400).json({ error: err.message });
        }
        // e.g. thrown from fileFilter ("Invalid file type...")
        return res.status(400).json({ error: err.message || "Upload failed." });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { accident_id, uploaded_by } = req.body;

      if (!req.file)
        return res.status(400).json({ error: "No file uploaded." });
      if (!accident_id)
        return res.status(400).json({ error: "accident_id is required." });

      const targetDir = path.join(
        __dirname,
        "../TreatmentProvided",
        accident_id,
      );
      fs.mkdirSync(targetDir, { recursive: true });

      const targetPath = path.join(targetDir, req.file.filename);
      fs.copyFileSync(req.file.path, targetPath);
      fs.unlinkSync(req.file.path);

      const filePath = `TreatmentProvided/${accident_id}/${req.file.filename}`;

      const newFile = {
        file_name: req.file.filename,
        original_name: req.file.originalname,
        file_path: filePath,
        uploaded_at: new Date().toISOString(),
      };

      const fileType = getFileType(req.file.originalname);
      const changes_made = `${uploaded_by || "System"} uploaded ${fileType} file: "${req.file.originalname}"`;

      await knex.transaction(async (trx) => {
        // Re-read inside the transaction for consistency
        const existing = await trx("accident_section_three_master")
          .where("accident_id", accident_id)
          .first();

        let currentFiles = [];
        try {
          if (existing?.files_of_treatment_provided) {
            currentFiles = JSON.parse(existing.files_of_treatment_provided);
            if (!Array.isArray(currentFiles)) currentFiles = [];
          }
        } catch {
          currentFiles = [];
        }

        currentFiles.push(newFile);
        const updatedJson = JSON.stringify(currentFiles);

        if (existing) {
          await trx("accident_section_three_master")
            .where("accident_id", accident_id)
            .update({
              files_of_treatment_provided: updatedJson,
              updated_by: uploaded_by,
              updated_at: new Date(),
            });
        } else {
          // Row doesn't exist yet — create a minimal stub so files aren't lost
          await trx("accident_section_three_master").insert({
            accident_id,
            files_of_treatment_provided: updatedJson,
            created_by: uploaded_by,
            created_at: new Date(),
          });
        }

        await trx("accident_section_logs_master").insert({
          accident_id,
          changes_made,
          section: "section_three",
          created_by: uploaded_by || "System",
          created_at: new Date(),
        });
      });

      res
        .status(200)
        .json({ message: "File uploaded successfully.", file: newFile });
    } catch (err) {
      if (req.file?.path && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      console.log("UNABLE TO UPLOAD TREATMENT FILE:", err);
      res
        .status(500)
        .json({ error: "Failed to upload file.", details: err.message });
    }
  },
);

router.delete("/delete-treatment-file", async (req, res) => {
  try {
    const { accident_id, file_name, deleted_by } = req.body; // Add deleted_by to the request payload

    const existing = await knex("accident_section_three_master")
      .where("accident_id", accident_id)
      .first();

    let currentFiles = [];
    let removedFile = null;

    try {
      if (existing?.files_of_treatment_provided) {
        currentFiles = JSON.parse(existing.files_of_treatment_provided);
        removedFile = currentFiles.find((f) => f.file_name === file_name);
      }
    } catch {
      currentFiles = [];
    }

    if (removedFile) {
      const absPath = path.join(__dirname, "..", removedFile.file_path);
      if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
    }

    const updatedFiles = currentFiles.filter((f) => f.file_name !== file_name);

    // ── Prepare log message ──
    const fileType = getFileType(removedFile?.original_name || file_name);
    const changes_made = `${deleted_by || "System"} removed ${fileType} file: "${removedFile?.original_name || file_name}" (${file_name})`;

    await knex.transaction(async (trx) => {
      await trx("accident_section_three_master")
        .where("accident_id", accident_id)
        .update({
          files_of_treatment_provided: JSON.stringify(updatedFiles),
          updated_by: deleted_by,
          updated_at: new Date(),
        });

      // ── INSERT LOG ENTRY ──
      await trx("accident_section_logs_master").insert({
        accident_id,
        changes_made,
        section: "section_three",
        created_by: deleted_by || "System",
        created_at: new Date(),
      });
    });

    res.status(200).json({ message: "File deleted successfully." });
  } catch (err) {
    console.log("UNABLE TO DELETE TREATMENT FILE:", err);
    res
      .status(500)
      .json({ error: "Failed to delete file.", details: err.message });
  }
});

router.post("/add-report", async (req, res) => {
  try {
    const currentTimestamp = new Date();
    const {
      siriRefType,
      dataFor,
      workRelated,
      govtNotification,
      subtypes,
      employer,
      name,
      chapaNo,
      jobDesignation,
      dateOfEvent,
      timeOfEvent,
      shift,
      dateReported,
      timeReported,
      location,
      specificLocation,
      level,
      reportedBy,
      reportedTo,
      group,
      department,
      section,
      dateHired,
      dateOfBirth,
      age,
      homeAddress,
      status,
      noOfDependents,
      lengthOfService,
      experienceAtOccupation,
      workingAreas,
      othersArea,
      incidentDescription,
      immediateActions,
      participants,
      preparedBy,
      preparedDateTime,
      created_by,
      created_by_position,
      group_head,
      department_head,
      section_head,
      immediateSupervisorOnDuty,
    } = req.body;
    console.log("----------------------------------------------------------");
    console.log(req.body);

    // Get all existing IDs from the database
    const existingIds = await knex("accident_master").pluck("accident_id");

    // Generate a unique ID based on siriRefType
    const accident_id = generateAccidentId(siriRefType, existingIds);

    // Format participants for storage - store as JSON string
    // Filter out empty participants (all fields empty)
    const filteredParticipants = participants.filter(
      (p) =>
        p.name?.trim() || p.department?.trim() || p.involvementType?.trim(),
    );

    // Transform participants to store only name, department, involvementType
    const formattedParticipants = filteredParticipants.map((p) => ({
      name: p.name || "",
      department: p.department || "",
      involvementType: p.involvementType || "",
    }));

    const newPayload = {
      goverment_notification_required: govtNotification === "YES" ? 1 : 0,
      data_for: dataFor,
      work_related: workRelated,
      accident_incident_subtype: subtypes,
      employer,
      name,
      chapa_number: chapaNo,
      job_designation: jobDesignation,
      date_of_event: dateOfEvent,
      time_of_event: timeOfEvent,
      shift,
      date_reported: dateReported,
      time_reported: timeReported,
      location,
      specific_location: specificLocation,
      level,
      reported_by: reportedBy,
      supervisor_reported_to: reportedTo,
      group,
      department,
      section,
      group_head: group_head || null,
      department_head: department_head || null,
      section_head: section_head || null,
      immediate_supervisor: immediateSupervisorOnDuty || null,
      date_hired: dateHired,
      date_of_birth: dateOfBirth,
      age,
      home_address: homeAddress,
      status,
      number_of_dependents: noOfDependents,
      length_of_service: lengthOfService,
      expereince_at_occupation: experienceAtOccupation,
      working_area: workingAreas,
      incident_accident_brief_description: incidentDescription,
      immediate_actions_taken: immediateActions,
      participants: JSON.stringify(formattedParticipants),
      prepared_by: preparedBy,
      date_and_time: preparedDateTime,
    };

    const fieldLabels = {
      goverment_notification_required: "Government Notification Required",
      data_for: "Data For",
      work_related: "Work Related",
      accident_incident_subtype: "Accident/Incident Subtype",
      employer: "Employer",
      name: "Name",
      chapa_number: "Chapa No.",
      job_designation: "Job Designation",
      date_of_event: "Date of Event",
      time_of_event: "Time of Event",
      shift: "Shift",
      date_reported: "Date Reported",
      time_reported: "Time Reported",
      location: "Location",
      specific_location: "Specific Location",
      level: "Level",
      reported_by: "Reported By",
      supervisor_reported_to: "Supervisor Reported To",
      group: "Group",
      department: "Department",
      section: "Section",
      group_head: "Group Head",
      department_head: "Department Head",
      section_head: "Section Head",
      immediate_supervisor: "Immediate Supervisor on Duty",
      date_hired: "Date Hired",
      date_of_birth: "Date of Birth",
      age: "Age",
      home_address: "Home Address",
      status: "Status",
      number_of_dependents: "No. of Dependents",
      length_of_service: "Length of Service",
      expereince_at_occupation: "Experience at Occupation",
      working_area: "Working Area",
      incident_accident_brief_description:
        "Incident/Accident Brief Description",
      immediate_actions_taken: "Immediate Actions Taken",
      participants: "Participants",
      prepared_by: "Prepared By",
      date_and_time: "Date & Time",
    };

    const changes_made = buildSectionOneChangeLog({
      user: created_by,
      isCreate: true,
      accident_id,
      fieldLabels,
      existing: null,
      newPayload,
    });

    // Start a transaction to ensure data consistency
    await knex.transaction(async (trx) => {
      await trx("accident_master").insert({
        accident_id,
        is_active: true,
        created_by: created_by,
        created_at: currentTimestamp,
        ac_status: "Pending Review for Safety/Medical",
      });

      await trx("accident_section_one_master").insert({
        accident_id,
        is_active: true,
        ...newPayload,
        created_by: created_by,
        created_at: currentTimestamp,
      });

      await trx("accident_section_logs_master").insert({
        accident_id,
        changes_made,
        section: "section_one",
        created_by,
        created_at: currentTimestamp,
      });
    });

    //EMAIL FUNCTION------------------------------------------------------------------------------------------------------------
    try {
      if (dataFor === "active_data") {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          secure: false,
          auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASS,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        const safety_reviewers = await knex("users_master")
          .where("emp_location", siriRefType)
          .where("emp_position", "safety-reviewer");

        const safety_reviewers_email = safety_reviewers.map(
          (email) => email.emp_email,
        );
        //safety start
        var start =
          `Good day,<br><br>` +
          "This is to inform you that a <b>Safety Accident/Incident Report and Investigation (SAIRI) Form</b> " +
          `(<b>${siriRefType}</b>) has been created and is now available for completion.<br><br>` +
          "Please log in to the Safety Management System to review the report and complete the remaining required details. " +
          "You may access the report directly using the link below:<br><br>" +
          `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">` +
          "View SAIRI Report</a><br><br>" +
          "<b>SAIRI Form Details</b><br>" +
          `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
          `<b>Status:</b> Pending review for safety/medical<br>` +
          `<b>Work Related:</b> ${workRelated === "work_related" ? "Work Related" : "Not Work Related"}<br>` +
          `<b>Name:</b> ${name}<br>` +
          `<b>Group:</b> ${group}<br>` +
          `<b>Department:</b> ${department}<br>` +
          `<b>Prepared by:</b> ${preparedBy}<br>` +
          `<b>Date and Time:</b> ${preparedDateTime}<br><br>`;

        // safety Footer
        var footer =
          "Your prompt attention to this report is appreciated to ensure that the necessary " +
          "safety information, investigation details, and corrective actions are properly documented.<br><br>" +
          "If you have any questions or require further clarification regarding this report, " +
          "please contact the Safety Department through the appropriate official channels.<br><br>" +
          "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
          "Best regards,<br><br>" +
          "<b>SAIRI Monitoring System</b><br>" +
          "Safety Department";

        // No-reply Disclaimer
        var norep =
          '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
          '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
          "<b>Automated Notification</b><br>" +
          "This is an automatically generated email from the SAIRI Monitoring System. " +
          "Please do not reply directly to this email, as this mailbox is not monitored.<br><br>" +
          "For technical assistance or questions regarding this notification, please contact " +
          "the Safety Department through the official support channels.<br><br>" +
          "&copy; " +
          "2026" +
          " SAIRI Monitoring System. All rights reserved." +
          "</div>";

        var email = start + footer + norep;

        /*-----------------------------------------------------------------------------*/

        const section3Approver = await knex("section_permissions").select("*");
        console.log("section3Approver:", section3Approver);

        const section3Departments = section3Approver
          .map((dept) => dept.department_ids)
          .filter(Boolean);
        console.log("section3Departments:", section3Departments);

        const medDepartments = await knex("department_master").whereIn(
          "id_master",
          section3Departments,
        );
        console.log("medDepartments:", medDepartments);

        const deptName = medDepartments.map((dept) => dept.department);
        console.log("deptName:", deptName);

        const MedicalUsers = await knex("users_master").whereIn(
          "emp_department",
          deptName,
        );
        const MedicalUsersEmails = MedicalUsers.map((u) => u.emp_email);

        //medical start
        var Medstart =
          `Good day,<br><br>` +
          "This is to inform you that a <b>Safety Accident/Incident Report and Investigation (SAIRI) Form</b> " +
          `(<b>${siriRefType}</b>) is pending your review for medical evaluation and approval.<br><br>` +
          "Please log in to the Safety Management System to complete <b>Section 3: Medical Evaluation</b> and approve the report. " +
          "You may access the report directly using the link below:<br><br>" +
          `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">` +
          "View SAIRI Report</a><br><br>" +
          "<b>SAIRI Form Details</b><br>" +
          `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
          `<b>Status:</b> Pending Medical Evaluation and Approval<br>` +
          `<b>Work Related:</b> ${workRelated === "work_related" ? "Work Related" : "Not Work Related"}<br>` +
          `<b>Name:</b> ${name}<br>` +
          `<b>Group:</b> ${group}<br>` +
          `<b>Department:</b> ${department}<br>` +
          `<b>Prepared by:</b> ${preparedBy}<br>` +
          `<b>Date and Time:</b> ${preparedDateTime}<br><br>`;

        var medfooter =
          "Your prompt attention to this report is appreciated to ensure that the required medical evaluation " +
          "and corrective actions are properly documented.<br><br>" +
          "If you have any questions or require further clarification regarding this report, " +
          "please contact the Safety Department or Medical Team through the appropriate official channels.<br><br>" +
          "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
          "Best regards,<br><br>" +
          "<b>SAIRI Monitoring System</b><br>" +
          "Safety Department";

        var MedEmail = Medstart + medfooter + norep;

        const mailOption = {
          from: process.env.EMAIL,
          to: safety_reviewers_email,
          subject: `SAIRI-${siriRefType} Report was Created - Reference No. ${accident_id}`,
          html: email,
        };

        const MedmailOption = {
          from: process.env.EMAIL,
          to: MedicalUsersEmails,
          subject: `SAIRI-${siriRefType} Pending Completion/Approval - Reference No. ${accident_id}`,
          html: MedEmail,
        };
        await transporter.sendMail(mailOption);
        await transporter.sendMail(MedmailOption);

        console.log(
          "/////////////////////////////////////////////////////////// EMAIL SENT FOR ADD REPORT",
        );
      }
    } catch (err) {
      console.log("UNABLE TO SEND EMAIL /add-report", err);
    }

    res.status(200).json({
      message: "success",
      accident_id,
    });
  } catch (err) {
    console.log("UNABLE TO POST REPORT: ", err);
    res.status(500).json({
      error: "Failed to create accident report",
      details: err.message,
    });
  }
});

router.post("/add-section3-report", async (req, res) => {
  try {
    const currentTimestamp = new Date();
    const {
      accident_id,
      recurrentInjury,
      dateTimeProvided,
      extentOfDisability,
      natureOfInjury,
      natureOfInjuryOther,
      mechanismOfInjury,
      mechanismOfInjuryOther,
      contactExposure,
      contactExposureOther,
      agencyOfInjury,
      agencyOfInjuryOther,
      partsBodyInjured,
      partsBodyInjuredOther,
      medicalDiagnosis,
      vitals,
      rehabilitationPlan,
      rehabLightWorkDays,
      rehabFurtherEval,
      detailsOfTreatment,
      attendingPhysician,
      dateTime,
      created_by,
    } = req.body;

    const natureFinal = [
      ...natureOfInjury,
      ...(natureOfInjuryOther ? [natureOfInjuryOther] : []),
    ].join("|");
    const mechanismFinal = [
      ...mechanismOfInjury,
      ...(mechanismOfInjuryOther ? [mechanismOfInjuryOther] : []),
    ].join("|");
    const contactFinal = [
      ...contactExposure,
      ...(contactExposureOther ? [contactExposureOther] : []),
    ].join("|");
    const agencyFinal = [
      ...agencyOfInjury,
      ...(agencyOfInjuryOther ? [agencyOfInjuryOther] : []),
    ].join("|");
    const bodyPartsFinal = [
      ...partsBodyInjured,
      ...(partsBodyInjuredOther ? [partsBodyInjuredOther] : []),
    ].join("|");
    const rehabFinal = [
      ...rehabilitationPlan,
      ...(rehabLightWorkDays ? [`Light Work: ${rehabLightWorkDays} days`] : []),
      ...(rehabFurtherEval ? [`Further Evaluation: ${rehabFurtherEval}`] : []),
    ].join(",");

    const newPayload = {
      recurrent_injury_illness: recurrentInjury === "YES" ? 1 : 0,
      date_and_time_treatment_provided: dateTimeProvided,
      extent_of_disability: extentOfDisability.join(","),
      nature_of_injury: natureFinal,
      mechanism_of_injury: mechanismFinal,
      contact_with_or_exposure_to: contactFinal,
      agency_of_injury: agencyFinal,
      parts_of_the_body_injured: bodyPartsFinal,
      medical_diagnosis: medicalDiagnosis,
      vital_signs_temperature: vitals?.temperature || null,
      blood_preassure: vitals?.bloodPressure || null,
      pulse_rate: vitals?.pulseRate || null,
      blood_urine_alcohol_concentration_level: vitals?.bloodAlcohol || null,
      rehabilitation_plan: rehabFinal,
      details_of_treatment_provided: detailsOfTreatment,
      attending_physicians_name_and_signature: attendingPhysician,
      date_and_time: dateTime ? new Date(dateTime) : null,
      files_of_treatment_provided: req.body.treatmentFilesJson || undefined,
    };

    // Human-readable labels for diffing
    const fieldLabels = {
      recurrent_injury_illness: "Recurrent Injury/Illness",
      date_and_time_treatment_provided: "Date & Time Treatment Provided",
      extent_of_disability: "Extent of Disability",
      nature_of_injury: "Nature of Injury",
      mechanism_of_injury: "Mechanism of Injury",
      contact_with_or_exposure_to: "Contact With / Exposure To",
      agency_of_injury: "Agency of Injury",
      parts_of_the_body_injured: "Parts of Body Injured",
      medical_diagnosis: "Medical Diagnosis",
      vital_signs_temperature: "Temperature",
      blood_preassure: "Blood Pressure",
      pulse_rate: "Pulse Rate",
      blood_urine_alcohol_concentration_level: "Blood/Urine Alcohol Level",
      rehabilitation_plan: "Rehabilitation Plan",
      details_of_treatment_provided: "Details of Treatment",
      attending_physicians_name_and_signature: "Attending Physician",
      date_and_time: "Date/Time",
    };

    const existing = await knex("accident_section_three_master")
      .where("accident_id", accident_id)
      .first();

    const changes_made = buildChangeLog({
      user: created_by,
      isCreate: !existing,
      fieldLabels,
      existing,
      newPayload,
    });
    await knex.transaction(async (trx) => {
      if (existing) {
        await trx("accident_section_three_master")
          .where("accident_id", accident_id)
          .update({
            ...newPayload,
            updated_by: created_by,
            updated_at: currentTimestamp,
          });
      } else {
        await trx("accident_section_three_master").insert({
          accident_id,
          ...newPayload,
          created_by,
          created_at: currentTimestamp,
        });
      }

      // ── ADD THIS BLOCK ──
      const physicianSigned =
        !!newPayload.attending_physicians_name_and_signature &&
        newPayload.attending_physicians_name_and_signature.trim() !== "";

      if (physicianSigned) {
        await trx("accident_master").where("accident_id", accident_id).update({
          ac_status: "Pending review for safety",
          updated_by: created_by,
          updated_at: currentTimestamp,
        });

        const accident1 = await knex("accident_section_one_master")
          .where("accident_id", accident_id)
          .first();

        // Guard: don't let a missing/blank location crash the whole save.
        // Section 3 has already been persisted above — a notification failure
        // should never roll that back.
        if (!accident1?.location) {
          console.log(
            `SKIPPING SAFETY REVIEWER EMAIL for ${accident_id}: no location on section 1 record.`,
          );
        } else {
          try {
            const safety_reviewers = await knex("users_master")
              .where("emp_location", accident1.location)
              .where("emp_position", "safety-reviewer");

            const safety_reviewers_email = safety_reviewers.map(
              (u) => u.emp_email,
            );

            var start =
              `Good day,<br><br>` +
              "This is to inform you that the <b>medical evaluation</b> for the Safety Accident/Incident Report and Investigation (SAIRI) Form " +
              `(<b>${accident1.location}</b>) has been approved by the Attending Physician ${newPayload.attending_physicians_name_and_signature}.<br><br>` +
              "Please log in to the Safety Management System to review the updated report and proceed with the next steps. " +
              "You may access the report directly using the link below:<br><br>" +
              `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">` +
              "View SAIRI Report</a><br><br>" +
              "<b>SAIRI Form Details</b><br>" +
              `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
              `<b>Status:</b> Medical evaluation approved<br>` +
              `<b>Name:</b> ${accident1.name}<br>` +
              `<b>Group:</b> ${accident1.group}<br>` +
              `<b>Department:</b> ${accident1.department}<br>` +
              `Attending Physician: ${newPayload.attending_physicians_name_and_signature}<br>` +
              `<b>Date and Time:</b> ${accident1.date_and_time}<br><br>`;

            var footer =
              "Your prompt attention to this report is appreciated to ensure that the necessary " +
              "safety information, investigation details, and corrective actions are properly documented.<br><br>" +
              "If you have any questions or require further clarification regarding this report, " +
              "please contact the Safety Department through the appropriate official channels.<br><br>" +
              "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
              "Best regards,<br><br>" +
              "<b>SAIRI Monitoring System</b><br>" +
              "Safety Department";

            var norep =
              '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
              '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
              "<b>Automated Notification</b><br>" +
              "This is an automatically generated email from the SAIRI Monitoring System. " +
              "Please do not reply directly to this email, as this mailbox is not monitored.<br><br>" +
              "For technical assistance or questions regarding this notification, please contact " +
              "the Safety Department through the official support channels.<br><br>" +
              "&copy; 2026 SAIRI Monitoring System. All rights reserved." +
              "</div>";

            var email = start + footer + norep;

            if (safety_reviewers_email.length > 0) {
              const mailOption = {
                from: process.env.EMAIL,
                to: safety_reviewers_email,
                subject: `SAIRI-${accident1.location} Report Update - Reference No. ${accident_id}`,
                html: email,
              };
              await transporter.sendMail(mailOption);
              console.log(
                "/////////////////////////////////////////////////////////// EMAIL SENT FOR UPDATE SECTION 3 - medical approved",
              );
            } else {
              console.log(
                `No safety-reviewer users found for location "${accident1.location}" — skipping email.`,
              );
            }
          } catch (mailErr) {
            console.log(
              "UNABLE TO SEND EMAIL /update-section3-report:",
              mailErr,
            );
          }
        }
      }

      // ── END BLOCK ──

      // ✅ Only log if there are actual changes
      if (changes_made) {
        await trx("accident_section_logs_master").insert({
          accident_id,
          changes_made,
          section: "section_three",
          created_by,
          created_at: currentTimestamp,
        });
        console.log({
          accident_id,
          changes_made,
          section: "section_three",
          created_by,
          created_at: currentTimestamp,
        });
      }
    });

    res.status(200).json({ message: "Section 3 saved successfully." });
  } catch (err) {
    console.log("UNABLE TO SAVE SECTION 3:", err);
    res
      .status(500)
      .json({ error: "Failed to save Section 3.", details: err.message });
  }
});

router.post("/add-section46-report", async (req, res) => {
  try {
    const currentTimestamp = new Date();
    const {
      accident_id,
      injurySubType,
      illnesses,
      equipmentApplicable,
      equipmentName,
      operatorName,
      equipmentId,
      damageCost,
      remarks,
      severity,
      likelihood,
      created_by,
    } = req.body;

    const LTA_VALUES = ["Fatal Accident", "Non-Fatal Accident"];
    const NON_LTA_VALUES = ["Minor Injury", "First Aid Case"];
    const lostTimeAccident = injurySubType
      .filter((v) => LTA_VALUES.includes(v))
      .join(",");
    const nonLostTimeAccident = injurySubType
      .filter((v) => NON_LTA_VALUES.includes(v))
      .join(",");
    const notApplicable = equipmentApplicable.includes("Not Applicable");

    const newPayload = {
      lost_time_accident: lostTimeAccident || null,
      non_lost_time_accident: nonLostTimeAccident || null,
      illnesses: illnesses.join(","),
      equipment: equipmentApplicable.join(","),
      equipment_id: notApplicable ? null : equipmentId || null,
      equipment_name: notApplicable ? null : equipmentName || null,
      damage_cost_php: notApplicable ? null : damageCost || null,
      operator_name: notApplicable ? null : operatorName || null,
      remarks: notApplicable ? null : remarks || null,
      severity,
      likelihood,
    };

    const fieldLabels = {
      lost_time_accident: "Lost Time Accident",
      non_lost_time_accident: "Non-Lost Time Accident",
      illnesses: "Illnesses",
      equipment: "Equipment",
      equipment_id: "Equipment ID",
      equipment_name: "Equipment Name",
      damage_cost_php: "Damage Cost (PhP)",
      operator_name: "Operator Name",
      remarks: "Remarks",
      severity: "Severity",
      likelihood: "Likelihood",
    };

    const existing = await knex("accident_section_four_six_master")
      .where("accident_id", accident_id)
      .first();

    const changes_made = buildChangeLog({
      user: created_by,
      isCreate: !existing,
      fieldLabels,
      existing,
      newPayload,
    });
    await knex.transaction(async (trx) => {
      if (existing) {
        await trx("accident_section_four_six_master")
          .where("accident_id", accident_id)
          .update({
            ...newPayload,
            updated_by: created_by,
            updated_at: currentTimestamp,
          });
      } else {
        await trx("accident_section_four_six_master").insert({
          accident_id,
          ...newPayload,
          created_by,
          created_at: currentTimestamp,
        });
      }

      if (changes_made) {
        await trx("accident_section_logs_master").insert({
          accident_id,
          changes_made,
          section: "section_four_six",
          created_by,
          created_at: currentTimestamp,
        });
      }
    });

    res.status(200).json({ message: "Section 4-6 saved successfully." });
  } catch (err) {
    console.log("UNABLE TO SAVE SECTION 4-6:", err);
    res
      .status(500)
      .json({ error: "Failed to save Section 4-6.", details: err.message });
  }
});

router.post("/add-section7-report", async (req, res) => {
  try {
    const currentTimestamp = new Date();
    const {
      accident_id,
      teamLeader,
      startDate,
      closeOutDate,
      sequenceOfEvents,
      factsAndFindings,
      personalFactors,
      personalFactorsOther,
      jobFactors,
      jobFactorsOther,
      unsafeActs,
      unsafeActsSopOther,
      unsafeActsTrafficOther,
      unsafeActsOther,
      unsafeConditions,
      unsafeConditionsOther,
      created_by,
    } = req.body;

    const personalFactorsFinal = [
      ...personalFactors,
      ...(personalFactorsOther ? [personalFactorsOther] : []),
    ].join(",");
    const jobFactorsFinal = [
      ...jobFactors,
      ...(jobFactorsOther ? [jobFactorsOther] : []),
    ].join(",");
    const unsafeActsFinal = [
      ...unsafeActs,
      ...(unsafeActsSopOther
        ? [`Not following SOP: ${unsafeActsSopOther}`]
        : []),
      ...(unsafeActsTrafficOther
        ? [`Not following Traffic Rules: ${unsafeActsTrafficOther}`]
        : []),
      ...(unsafeActsOther ? [unsafeActsOther] : []),
    ].join(",");
    const unsafeConditionsFinal = [
      ...unsafeConditions,
      ...(unsafeConditionsOther ? [unsafeConditionsOther] : []),
    ].join(",");

    const newPayload = {
      team_leader: teamLeader,
      start_date: startDate || null,
      close_out_date: closeOutDate || null,
      sequence_of_events: sequenceOfEvents,
      facts_and_findings: factsAndFindings,
      personal_factors: personalFactorsFinal || null,
      job_factors: jobFactorsFinal || null,
      substandard_unsafe_acts: unsafeActsFinal || null,
      substandard_unsafe_conditions: unsafeConditionsFinal || null,
    };

    const fieldLabels = {
      team_leader: "Team Leader",
      start_date: "Start Date",
      close_out_date: "Close Out Date",
      sequence_of_events: "Sequence of Events",
      facts_and_findings: "Facts and Findings",
      personal_factors: "Personal Factors",
      job_factors: "Job Factors",
      substandard_unsafe_acts: "Substandard/Unsafe Acts",
      substandard_unsafe_conditions: "Substandard/Unsafe Conditions",
    };

    const existing = await knex("accident_section_seven_master")
      .where("accident_id", accident_id)
      .first();

    const changes_made = buildChangeLog({
      user: created_by,
      isCreate: !existing,
      fieldLabels,
      existing,
      newPayload,
    });

    await knex.transaction(async (trx) => {
      if (existing) {
        await trx("accident_section_seven_master")
          .where("accident_id", accident_id)
          .update({
            ...newPayload,
            updated_by: created_by,
            updated_at: currentTimestamp,
          });
      } else {
        await trx("accident_section_seven_master").insert({
          accident_id,
          ...newPayload,
          created_by,
          created_at: currentTimestamp,
        });
      }

      if (changes_made) {
        await trx("accident_section_logs_master").insert({
          accident_id,
          changes_made,
          section: "section_four_six",
          created_by,
          created_at: currentTimestamp,
        });
      }
    });

    res.status(200).json({ message: "Section 7 saved successfully." });
  } catch (err) {
    console.log("UNABLE TO SAVE SECTION 7:", err);
    res
      .status(500)
      .json({ error: "Failed to save Section 7.", details: err.message });
  }
});

router.post("/add-section8-report", async (req, res) => {
  try {
    const currentTimestamp = new Date();
    const {
      accident_id,
      actionItems,
      additionalNotes,
      concernedDeptName,
      concernedDeptDate,
      groupManagerName,
      groupManagerDate,
      safetyManagerName,
      safetyManagerDate,
      concernedDeptRemarks,
      groupManagerRemarks,
      safetyManagerRemarks, // ← ADD
      dataManagement,
      created_by,
      attachments,
    } = req.body;

    const correctiveTable = actionItems
      .filter(
        (it) =>
          it.recommendation ||
          it.responsibleDept ||
          it.responsiblePerson ||
          it.dueDate ||
          it.remarks,
      )
      .map((it) => {
        const lastExtension = (it.extensionRequests || []).at(-1) || null;
        return {
          recommendation: it.recommendation,
          responsible_department: it.responsibleDept,
          responsible_person: it.responsiblePerson,
          due_date: it.dueDate,
          completion_date: it.completionDate || null, // ← add this
          completion_responsible_person: it.completionResponsiblePerson,
          dept_head: it.completionDeptHead,
          status: it.status || "Open",
          proof_attachments: it.proofAttachments || [],
          remarks: it.remarks || "",
          extension_requests: it.extensionRequests || [],
          extension_request_date: lastExtension
            ? lastExtension.newDueDate
            : null,
          extension_request_remarks: lastExtension
            ? lastExtension.reason
            : null,
        };
      });

    const formattedAttachments = attachments.map((option) => ({
      option,
      file_path: "",
    }));

    const newPayload = {
      corrective_table: JSON.stringify(correctiveTable),
      concerned_department_name: concernedDeptName,
      concerned_date: concernedDeptDate || null,
      concerned_department_remarks: concernedDeptRemarks || null, // ← ADD
      group_manager_name: groupManagerName,
      group_manager_date: groupManagerDate || null,
      group_manager_remarks: groupManagerRemarks || null, // ← ADD
      safety_manager_name: safetyManagerName,
      safety_manager_date: safetyManagerDate || null,
      safety_manager_remarks: safetyManagerRemarks || null, // ← ADD
      data_management: dataManagement.join(","),
      other_attachements: JSON.stringify(formattedAttachments),
      additional_notes: additionalNotes,
    };

    const fieldLabels = {
      corrective_table: "Corrective Action Items",
      concerned_department_name: "Concerned Department Name",
      concerned_date: "Concerned Department Date",
      concerned_department_remarks: "Concerned Department Remarks", // ← ADD
      group_manager_name: "Group Manager Name",
      group_manager_date: "Group Manager Date",
      group_manager_remarks: "Group Manager Remarks", // ← ADD
      safety_manager_name: "Safety Manager Name",
      safety_manager_date: "Safety Manager Date",
      safety_manager_remarks: "Safety Manager Remarks", // ← ADD
      data_management: "Data Management",
      additional_notes: "Additional Notes",
    };

    const existing = await knex("accident_section_eight_master")
      .where("accident_id", accident_id)
      .first();

    const changes_made = buildSectionEightChangeLog({
      user: created_by, // use updated_by in the update route
      isCreate: !existing, // update route: isCreate: false
      accident_id,
      fieldLabels,
      existing,
      newPayload,
    });

    await knex.transaction(async (trx) => {
      if (existing) {
        await trx("accident_section_eight_master")
          .where("accident_id", accident_id)
          .update({
            ...newPayload,
            updated_by: created_by,
            updated_at: currentTimestamp,
          });
      } else {
        await trx("accident_section_eight_master").insert({
          accident_id,
          ...newPayload,
          created_by,
          created_at: currentTimestamp,
        });
      }

      const hasRealChanges =
        changes_made &&
        !changes_made.includes("with no detected field changes") &&
        !changes_made.includes("with no fields filled");

      if (hasRealChanges) {
        await trx("accident_section_logs_master").insert({
          accident_id,
          changes_made,
          section: "section_eight",
          created_by,
          created_at: currentTimestamp,
        });
      }
    });

    res.status(200).json({ message: "Section 8 saved successfully." });
  } catch (err) {
    console.log("UNABLE TO SAVE SECTION 8:", err);
    res
      .status(500)
      .json({ error: "Failed to save Section 8.", details: err.message });
  }
});

// ── GET ROUTES ────────────────────────────────────────────────────────────────

router.get("/get-all-report", async (req, res) => {
  try {
    const fetch = await knex("accident_master").select("*");
    res.json(fetch);
  } catch (err) {
    console.log("UNABLE TO GET ALL REPORTS: ", err);
  }
});

router.get("/get-all-section1", async (req, res) => {
  try {
    const data = await knex("accident_section_one_master")
      .select(
        "accident_id",
        "name",
        "chapa_number",
        "expereince_at_occupation",
        "accident_incident_subtype",
        "shift",
        "supervisor_reported_to",
        "department",
        "group",
        "section", // ← ADD
        "location",
        "date_of_event",
        "time_of_event", // ← ADD
        "level", // ← ADD
        "department_head", // ← ADD
        "section_head", // ← ADD
        "prepared_by", // ← ADD
        "working_area",
        "reported_by",
        "data_for",
        "immediate_actions_taken",
        "incident_accident_brief_description",
      )
      .where("is_active", true);

    res.json(data);
  } catch (err) {
    console.log("UNABLE TO GET ALL SECTION 1:", err);
    res.status(500).json({
      error: "Failed to fetch section 1 records.",
      details: err.message,
    });
  }
});

router.get("/get-all-section3", async (req, res) => {
  try {
    const data = await knex("accident_section_three_master").select(
      "accident_id",
      "mechanism_of_injury",
    );
    res.json(data);
  } catch (err) {
    console.log("UNABLE TO GET ALL SECTION 3:", err);
    res.status(500).json({
      error: "Failed to fetch section 3 records.",
      details: err.message,
    });
  }
});
router.get("/get-all-section46-equipment", async (req, res) => {
  try {
    const data = await knex("accident_section_four_six_master").select(
      "accident_id",
      "equipment_name",
    );
    res.json(data);
  } catch (err) {
    console.log("UNABLE TO GET SECTION 4-6 EQUIPMENT LIST:", err);
    res.status(500).json({
      error: "Failed to fetch section 4-6 equipment list.",
      details: err.message,
    });
  }
});

router.get("/get-section-by-review-approval-by-id", async (req, res) => {
  try {
    const data = await knex("accident_master")
      .where("accident_id", req.query.accident_id)
      .first();
    res.json(data || null);
  } catch (err) {
    console.log("UNABLE TO FETCH ACCIDENT REPORT DETAILS: ", err);
  }
});

router.get("/get-section1-by-id", async (req, res) => {
  try {
    const getById = await SECTION1.findAll({
      where: {
        accident_id: req.query.accident_id,
      },
    });
    res.json(getById);
  } catch (err) {
    console.log("UNABLE TO GET REPORT BY ID: ", err);
  }
});

router.get("/get-section3-by-id", async (req, res) => {
  try {
    const data = await knex("accident_section_three_master")
      .where("accident_id", req.query.accident_id)
      .first();
    res.json(data || null);
  } catch (err) {
    console.log("UNABLE TO GET SECTION 3:", err);
    res
      .status(500)
      .json({ error: "Failed to get Section 3.", details: err.message });
  }
});

router.get("/get-section46-by-id", async (req, res) => {
  try {
    const data = await knex("accident_section_four_six_master")
      .where("accident_id", req.query.accident_id)
      .first();
    res.json(data || null);
  } catch (err) {
    console.log("UNABLE TO GET SECTION 4-6:", err);
    res
      .status(500)
      .json({ error: "Failed to get Section 4-6.", details: err.message });
  }
});

router.get("/get-section7-by-id", async (req, res) => {
  try {
    const data = await knex("accident_section_seven_master")
      .where("accident_id", req.query.accident_id)
      .first();
    res.json(data || null);
  } catch (err) {
    console.log("UNABLE TO GET SECTION 7:", err);
    res
      .status(500)
      .json({ error: "Failed to get Section 7.", details: err.message });
  }
});

router.get("/get-section8-by-id", async (req, res) => {
  try {
    const data = await knex("accident_section_eight_master")
      .where("accident_id", req.query.accident_id)
      .first();
    res.json(data || null);
  } catch (err) {
    console.log("UNABLE TO GET SECTION 8:", err);
    res
      .status(500)
      .json({ error: "Failed to get Section 8.", details: err.message });
  }
});

// ── UPDATE ROUTES ─────────────────────────────────────────────────────────────

router.put("/update-section1-report", async (req, res) => {
  try {
    const currentTimestamp = new Date();
    const {
      accident_id,
      goverment_notification_required,
      data_for,
      work_related,
      accident_incident_subtype,
      employer,
      name,
      chapa_number,
      job_designation,
      date_of_event,
      time_of_event,
      shift,
      date_reported,
      time_reported,
      location,
      specific_location,
      level,
      reported_by,
      supervisor_reported_to,
      group,
      department,
      section,
      date_hired,
      date_of_birth,
      age,
      home_address,
      status,
      number_of_dependents,
      length_of_service,
      expereince_at_occupation,
      workingAreas,
      othersAreaChecked,
      others_area,
      incident_accident_brief_description,
      immediate_actions_taken,
      participants,
      prepared_by,
      date_and_time,
      updated_by,
      group_head,
      department_head,
      section_head,
      immediate_supervisor,
      supervisor,
    } = req.body;

    const workingAreaFinal = [
      ...(Array.isArray(workingAreas) ? workingAreas : []),
      ...(othersAreaChecked && others_area ? [others_area] : []),
    ].join(",");

    const filteredParticipants = (participants || [])
      .filter(
        (p) =>
          p.name?.trim() || p.department?.trim() || p.involvementType?.trim(),
      )
      .map((p) => ({
        name: p.name || "",
        department: p.department || "",
        involvementType: p.involvementType || "",
      }));

    const newPayload = {
      goverment_notification_required:
        goverment_notification_required === "YES" ? 1 : 0,
      data_for,
      work_related,
      accident_incident_subtype: Array.isArray(accident_incident_subtype)
        ? accident_incident_subtype.join(",")
        : accident_incident_subtype,
      employer,
      name,
      chapa_number,
      job_designation,
      date_of_event,
      time_of_event: parseTimeForSQL(time_of_event),
      shift,
      date_reported,
      time_reported: parseTimeForSQL(time_reported),
      location,
      specific_location,
      level,
      reported_by,
      supervisor_reported_to,
      group,
      department,
      section,
      group_head: group_head || null,
      department_head: department_head || null,
      section_head: section_head || null,
      immediate_supervisor: immediate_supervisor || null,
      date_hired,
      date_of_birth,
      age,
      home_address,
      status,
      number_of_dependents,
      length_of_service,
      expereince_at_occupation,
      working_area: workingAreaFinal,
      incident_accident_brief_description,
      immediate_actions_taken,
      participants: JSON.stringify(filteredParticipants),
      prepared_by,
      date_and_time: date_and_time ? new Date(date_and_time) : null,
    };

    const fieldLabels = {
      goverment_notification_required: "Government Notification Required",
      data_for: "Data For",
      work_related: "Work Related",
      accident_incident_subtype: "Accident/Incident Subtype",
      employer: "Employer",
      name: "Name",
      chapa_number: "Chapa No.",
      job_designation: "Job Designation",
      date_of_event: "Date of Event",
      time_of_event: "Time of Event",
      shift: "Shift",
      date_reported: "Date Reported",
      time_reported: "Time Reported",
      location: "Location",
      specific_location: "Specific Location",
      level: "Level",
      reported_by: "Reported By",
      supervisor_reported_to: "Supervisor Reported To",
      group: "Group",
      department: "Department",
      section: "Section",
      group_head: "Group Head",
      department_head: "Department Head",
      section_head: "Section Head",
      immediate_supervisor: "Immediate Supervisor on Duty",
      date_hired: "Date Hired",
      date_of_birth: "Date of Birth",
      age: "Age",
      home_address: "Home Address",
      status: "Status",
      number_of_dependents: "No. of Dependents",
      length_of_service: "Length of Service",
      expereince_at_occupation: "Experience at Occupation",
      working_area: "Working Area",
      incident_accident_brief_description:
        "Incident/Accident Brief Description",
      immediate_actions_taken: "Immediate Actions Taken",
      participants: "Participants",
      prepared_by: "Prepared By",
      date_and_time: "Date & Time",
    };

    const existing = await knex("accident_section_one_master")
      .where("accident_id", accident_id)
      .first();

    const changes_made = buildSectionOneChangeLog({
      user: updated_by,
      isCreate: false,
      accident_id,
      fieldLabels,
      existing,
      newPayload,
    });

    await knex.transaction(async (trx) => {
      await trx("accident_section_one_master")
        .where("accident_id", accident_id)
        .update({
          ...newPayload,
          updated_by,
          updated_at: currentTimestamp,
        });

      await trx("accident_section_logs_master").insert({
        accident_id,
        changes_made,
        section: "section_one",
        created_by: updated_by,
        created_at: currentTimestamp,
      });
    });

    res.status(200).json({ message: "Section 1 updated successfully." });
  } catch (err) {
    console.log("UNABLE TO UPDATE SECTION 1:", err);
    res
      .status(500)
      .json({ error: "Failed to update Section 1.", details: err.message });
  }
});

router.put("/update-section3-report", async (req, res) => {
  try {
    const currentTimestamp = new Date();
    const {
      accident_id,
      recurrentInjury,
      dateTimeProvided,
      extentOfDisability,
      natureOfInjury,
      natureOfInjuryOther,
      mechanismOfInjury,
      mechanismOfInjuryOther,
      contactExposure,
      contactExposureOther,
      agencyOfInjury,
      agencyOfInjuryOther,
      partsBodyInjured,
      partsBodyInjuredOther,
      medicalDiagnosis,
      vitals,
      rehabilitationPlan,
      rehabLightWorkDays, // ← ADD
      rehabFurtherEval, // ← ADD
      detailsOfTreatment,
      attendingPhysician,
      dateTime,
      updated_by,
    } = req.body;

    const natureFinal = [
      ...natureOfInjury,
      ...(natureOfInjuryOther ? [natureOfInjuryOther] : []),
    ].join("|");

    const mechanismFinal = [
      ...mechanismOfInjury,
      ...(mechanismOfInjuryOther ? [mechanismOfInjuryOther] : []),
    ].join("|");

    const contactFinal = [
      ...contactExposure,
      ...(contactExposureOther ? [contactExposureOther] : []),
    ].join("|");

    const agencyFinal = [
      ...agencyOfInjury,
      ...(agencyOfInjuryOther ? [agencyOfInjuryOther] : []),
    ].join("|");

    const bodyPartsFinal = [
      ...partsBodyInjured,
      ...(partsBodyInjuredOther ? [partsBodyInjuredOther] : []),
    ].join("|");

    const rehabFinal = [
      ...rehabilitationPlan,
      ...(rehabLightWorkDays ? [`Light Work: ${rehabLightWorkDays} days`] : []),
      ...(rehabFurtherEval ? [`Further Evaluation: ${rehabFurtherEval}`] : []),
    ].join(",");

    const newPayload = {
      recurrent_injury_illness: recurrentInjury === "YES" ? 1 : 0,
      date_and_time_treatment_provided: dateTimeProvided,
      extent_of_disability: extentOfDisability.join(","),
      nature_of_injury: natureFinal,
      mechanism_of_injury: mechanismFinal,
      contact_with_or_exposure_to: contactFinal,
      agency_of_injury: agencyFinal,
      parts_of_the_body_injured: bodyPartsFinal,
      medical_diagnosis: medicalDiagnosis,
      vital_signs_temperature: vitals?.temperature || null,
      blood_preassure: vitals?.bloodPressure || null,
      pulse_rate: vitals?.pulseRate || null,
      blood_urine_alcohol_concentration_level: vitals?.bloodAlcohol || null,
      rehabilitation_plan: rehabFinal,
      details_of_treatment_provided: detailsOfTreatment,
      attending_physicians_name_and_signature: attendingPhysician,
      date_and_time: dateTime ? new Date(dateTime) : null,
      files_of_treatment_provided: req.body.treatmentFilesJson || undefined,
    };

    // Fetch existing row to diff against
    const existing = await knex("accident_section_three_master")
      .where("accident_id", accident_id)
      .first();

    // Human-readable labels for each DB column
    const fieldLabels = {
      recurrent_injury_illness: "Recurrent Injury/Illness",
      date_and_time_treatment_provided: "Date & Time Treatment Provided",
      extent_of_disability: "Extent of Disability",
      nature_of_injury: "Nature of Injury",
      mechanism_of_injury: "Mechanism of Injury",
      contact_with_or_exposure_to: "Contact With / Exposure To",
      agency_of_injury: "Agency of Injury",
      parts_of_the_body_injured: "Parts of Body Injured",
      medical_diagnosis: "Medical Diagnosis",
      vital_signs_temperature: "Temperature",
      blood_preassure: "Blood Pressure",
      pulse_rate: "Pulse Rate",
      blood_urine_alcohol_concentration_level: "Blood/Urine Alcohol Level",
      rehabilitation_plan: "Rehabilitation Plan",
      details_of_treatment_provided: "Details of Treatment",
      attending_physicians_name_and_signature: "Attending Physician",
      date_and_time: "Date/Time",
    };

    const changes_made = buildChangeLog({
      user: updated_by,
      isCreate: false,
      fieldLabels,
      existing,
      newPayload,
    });

    await knex.transaction(async (trx) => {
      await trx("accident_section_three_master")
        .where("accident_id", accident_id)
        .update({
          ...newPayload,
          updated_by,
          updated_at: currentTimestamp,
        });
      const physicianSigned =
        !!newPayload.attending_physicians_name_and_signature &&
        newPayload.attending_physicians_name_and_signature.trim() !== "";

      if (physicianSigned) {
        await trx("accident_master").where("accident_id", accident_id).update({
          ac_status: "Pending review for safety",
          updated_by,
          updated_at: currentTimestamp,
        });

        const accident1 = await knex("accident_section_one_master")
          .where("accident_id", accident_id)
          .first();

        // Guard: don't let a missing/blank location crash the whole save.
        // Section 3 has already been persisted above — a notification failure
        // should never roll that back.
        if (!accident1?.location) {
          console.log(
            `SKIPPING SAFETY REVIEWER EMAIL for ${accident_id}: no location on section 1 record.`,
          );
        } else {
          try {
            const safety_reviewers = await knex("users_master")
              .where("emp_location", accident1.location)
              .where("emp_position", "safety-reviewer");

            const safety_reviewers_email = safety_reviewers.map(
              (u) => u.emp_email,
            );

            var start =
              `Good day,<br><br>` +
              "This is to inform you that the <b>medical evaluation</b> for the Safety Accident/Incident Report and Investigation (SAIRI) Form " +
              `(<b>${accident1.location}</b>) has been approved by the Attending Physician ${newPayload.attending_physicians_name_and_signature}.<br><br>` +
              "Please log in to the Safety Management System to review the updated report and proceed with the next steps. " +
              "You may access the report directly using the link below:<br><br>" +
              `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">` +
              "View SAIRI Report</a><br><br>" +
              "<b>SAIRI Form Details</b><br>" +
              `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
              `<b>Status:</b> Medical evaluation approved<br>` +
              `<b>Name:</b> ${accident1.name}<br>` +
              `<b>Group:</b> ${accident1.group}<br>` +
              `<b>Department:</b> ${accident1.department}<br>` +
              `<b>Attending Physician:</b> ${newPayload.attending_physicians_name_and_signature}<br>` +
              `<b>Date and Time:</b> ${accident1.date_and_time}<br><br>`;

            var footer =
              "Your prompt attention to this report is appreciated to ensure that the necessary " +
              "safety information, investigation details, and corrective actions are properly documented.<br><br>" +
              "If you have any questions or require further clarification regarding this report, " +
              "please contact the Safety Department through the appropriate official channels.<br><br>" +
              "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
              "Best regards,<br><br>" +
              "<b>SAIRI Monitoring System</b><br>" +
              "Safety Department";

            var norep =
              '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
              '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
              "<b>Automated Notification</b><br>" +
              "This is an automatically generated email from the SAIRI Monitoring System. " +
              "Please do not reply directly to this email, as this mailbox is not monitored.<br><br>" +
              "For technical assistance or questions regarding this notification, please contact " +
              "the Safety Department through the official support channels.<br><br>" +
              "&copy; 2026 SAIRI Monitoring System. All rights reserved." +
              "</div>";

            var email = start + footer + norep;

            if (safety_reviewers_email.length > 0) {
              const mailOption = {
                from: process.env.EMAIL,
                to: safety_reviewers_email,
                subject: `SAIRI-${accident1.location} Report Update - Reference No. ${accident_id}`,
                html: email,
              };
              await transporter.sendMail(mailOption);
              console.log(
                "/////////////////////////////////////////////////////////// EMAIL SENT FOR UPDATE SECTION 3 - medical approved",
              );
            } else {
              console.log(
                `No safety-reviewer users found for location "${accident1.location}" — skipping email.`,
              );
            }
          } catch (mailErr) {
            console.log(
              "UNABLE TO SEND EMAIL /update-section3-report:",
              mailErr,
            );
          }
        }
      }

      if (changes_made) {
        await trx("accident_section_logs_master").insert({
          accident_id,
          changes_made,
          section: "section_four_six",
          created_by: updated_by,
          created_at: currentTimestamp,
        });
      }
    });

    res.status(200).json({ message: "Section 3 updated successfully." });
  } catch (err) {
    console.log("UNABLE TO UPDATE SECTION 3:", err);
    res
      .status(500)
      .json({ error: "Failed to update Section 3.", details: err.message });
  }
});

router.put("/update-section46-report", async (req, res) => {
  try {
    const currentTimestamp = new Date();
    const {
      accident_id,
      injurySubType,
      illnesses,
      equipmentApplicable,
      equipmentName,
      operatorName,
      equipmentId,
      damageCost,
      remarks,
      severity,
      likelihood,
      updated_by,
    } = req.body;

    const LTA_VALUES = ["Fatal Accident", "Non-Fatal Accident"];
    const NON_LTA_VALUES = ["Minor Injury", "First Aid Case"];

    const lostTimeAccident = injurySubType
      .filter((v) => LTA_VALUES.includes(v))
      .join(",");
    const nonLostTimeAccident = injurySubType
      .filter((v) => NON_LTA_VALUES.includes(v))
      .join(",");
    const notApplicable = equipmentApplicable.includes("Not Applicable");

    const newPayload = {
      lost_time_accident: lostTimeAccident || null,
      non_lost_time_accident: nonLostTimeAccident || null,
      illnesses: illnesses.join(","),
      equipment: equipmentApplicable.join(","),
      equipment_id: notApplicable ? null : equipmentId || null,
      equipment_name: notApplicable ? null : equipmentName || null,
      damage_cost_php: notApplicable ? null : damageCost || null,
      operator_name: notApplicable ? null : operatorName || null,
      remarks: notApplicable ? null : remarks || null,
      severity,
      likelihood,
    };

    const fieldLabels = {
      lost_time_accident: "Lost Time Accident",
      non_lost_time_accident: "Non-Lost Time Accident",
      illnesses: "Illnesses",
      equipment: "Equipment",
      equipment_id: "Equipment ID",
      equipment_name: "Equipment Name",
      damage_cost_php: "Damage Cost (PhP)",
      operator_name: "Operator Name",
      remarks: "Remarks",
      severity: "Severity",
      likelihood: "Likelihood",
    };

    const existing = await knex("accident_section_four_six_master")
      .where("accident_id", accident_id)
      .first();

    const changes_made = buildChangeLog({
      user: updated_by,
      isCreate: false,
      fieldLabels,
      existing,
      newPayload,
    });

    await knex.transaction(async (trx) => {
      await trx("accident_section_four_six_master")
        .where("accident_id", accident_id)
        .update({
          ...newPayload,
          updated_by,
          updated_at: currentTimestamp,
        });

      if (changes_made) {
        await trx("accident_section_logs_master").insert({
          accident_id,
          changes_made,
          section: "section_four_six",
          created_by: updated_by,
          created_at: currentTimestamp,
        });
      }
    });

    res.status(200).json({ message: "Section 4-6 updated successfully." });
  } catch (err) {
    console.log("UNABLE TO UPDATE SECTION 4-6:", err);
    res
      .status(500)
      .json({ error: "Failed to update Section 4-6.", details: err.message });
  }
});

router.put("/update-section7-report", async (req, res) => {
  try {
    const currentTimestamp = new Date();
    const {
      accident_id,
      teamLeader,
      startDate,
      closeOutDate,
      sequenceOfEvents,
      factsAndFindings,
      personalFactors,
      personalFactorsOther,
      jobFactors,
      jobFactorsOther,
      unsafeActs,
      unsafeActsSopOther,
      unsafeActsTrafficOther,
      unsafeActsOther,
      unsafeConditions,
      unsafeConditionsOther,
      updated_by,
    } = req.body;

    const personalFactorsFinal = [
      ...personalFactors,
      ...(personalFactorsOther ? [personalFactorsOther] : []),
    ].join(",");
    const jobFactorsFinal = [
      ...jobFactors,
      ...(jobFactorsOther ? [jobFactorsOther] : []),
    ].join(",");
    const unsafeActsFinal = [
      ...unsafeActs,
      ...(unsafeActsSopOther
        ? [`Not following SOP: ${unsafeActsSopOther}`]
        : []),
      ...(unsafeActsTrafficOther
        ? [`Not following Traffic Rules: ${unsafeActsTrafficOther}`]
        : []),
      ...(unsafeActsOther ? [unsafeActsOther] : []),
    ].join(",");
    const unsafeConditionsFinal = [
      ...unsafeConditions,
      ...(unsafeConditionsOther ? [unsafeConditionsOther] : []),
    ].join(",");

    const newPayload = {
      team_leader: teamLeader,
      start_date: startDate || null,
      close_out_date: closeOutDate || null,
      sequence_of_events: sequenceOfEvents,
      facts_and_findings: factsAndFindings,
      personal_factors: personalFactorsFinal || null,
      job_factors: jobFactorsFinal || null,
      substandard_unsafe_acts: unsafeActsFinal || null,
      substandard_unsafe_conditions: unsafeConditionsFinal || null,
    };

    const fieldLabels = {
      team_leader: "Team Leader",
      start_date: "Start Date",
      close_out_date: "Close Out Date",
      sequence_of_events: "Sequence of Events",
      facts_and_findings: "Facts and Findings",
      personal_factors: "Personal Factors",
      job_factors: "Job Factors",
      substandard_unsafe_acts: "Substandard/Unsafe Acts",
      substandard_unsafe_conditions: "Substandard/Unsafe Conditions",
    };

    const existing = await knex("accident_section_seven_master")
      .where("accident_id", accident_id)
      .first();

    const changes_made = buildChangeLog({
      user: updated_by,
      isCreate: false,
      fieldLabels,
      existing,
      newPayload,
    });

    await knex.transaction(async (trx) => {
      await trx("accident_section_seven_master")
        .where("accident_id", accident_id)
        .update({ ...newPayload, updated_by, updated_at: currentTimestamp });

      if (changes_made) {
        await trx("accident_section_logs_master").insert({
          accident_id,
          changes_made,
          section: "section_four_six",
          created_by: updated_by,
          created_at: currentTimestamp,
        });
      }
    });

    res.status(200).json({ message: "Section 7 updated successfully." });
  } catch (err) {
    console.log("UNABLE TO UPDATE SECTION 7:", err);
    res
      .status(500)
      .json({ error: "Failed to update Section 7.", details: err.message });
  }
});
router.put("/update-section8-report", async (req, res) => {
  try {
    const currentTimestamp = new Date();
    const {
      accident_id,
      actionItems,
      additionalNotes,
      concernedDeptName,
      concernedDeptDate,
      groupManagerName,
      groupManagerDate,
      safetyManagerName,
      safetyManagerDate,
      concernedDeptRemarks,
      groupManagerRemarks,
      safetyManagerRemarks, // ← ADD
      dataManagement,
      attachments,
      updated_by,
    } = req.body;

    const correctiveTable = actionItems
      .filter(
        (it) =>
          it.recommendation ||
          it.responsibleDept ||
          it.responsiblePerson ||
          it.dueDate ||
          it.remarks,
      )
      .map((it) => {
        const lastExtension = (it.extensionRequests || []).at(-1) || null;
        return {
          recommendation: it.recommendation,
          responsible_department: it.responsibleDept,
          responsible_person: it.responsiblePerson,
          due_date: it.dueDate,
          completion_date: it.completionDate || null, // ← add this line
          completion_responsible_person: it.completionResponsiblePerson,
          dept_head: it.completionDeptHead,
          status: it.status || "Open",
          proof_attachments: it.proofAttachments || [],
          remarks: it.remarks || "",
          extension_requests: it.extensionRequests || [],
          extension_request_date: lastExtension
            ? lastExtension.newDueDate
            : null,
          extension_request_remarks: lastExtension
            ? lastExtension.reason
            : null,
        };
      });
    // const formattedAttachments = attachments.map(option => ({ option, file_path: '' }));
    const newPayload = {
      corrective_table: JSON.stringify(correctiveTable),
      concerned_department_name: concernedDeptName,
      concerned_date: concernedDeptDate || null,
      concerned_department_remarks: concernedDeptRemarks || null, // ← ADD
      group_manager_name: groupManagerName,
      group_manager_date: groupManagerDate || null,
      group_manager_remarks: groupManagerRemarks || null, // ← ADD
      safety_manager_name: safetyManagerName,
      safety_manager_date: safetyManagerDate || null,
      safety_manager_remarks: safetyManagerRemarks || null, // ← ADD
      data_management: dataManagement.join(","),
      attachment_checklist: Array.isArray(attachments)
        ? attachments.join(",")
        : "",
      additional_notes: additionalNotes,
    };

    const fieldLabels = {
      corrective_table: "Corrective Action Items",
      concerned_department_name: "Concerned Department Name",
      concerned_date: "Concerned Department Date",
      concerned_department_remarks: "Concerned Department Remarks", // ← ADD
      group_manager_name: "Group Manager Name",
      group_manager_date: "Group Manager Date",
      group_manager_remarks: "Group Manager Remarks", // ← ADD
      safety_manager_name: "Safety Manager Name",
      safety_manager_date: "Safety Manager Date",
      safety_manager_remarks: "Safety Manager Remarks", // ← ADD
      data_management: "Data Management",
      attachment_checklist: "Attachment Checklist",
      additional_notes: "Additional Notes",
    };

    const existing = await knex("accident_section_eight_master")
      .where("accident_id", accident_id)
      .first();

    const changes_made = buildSectionEightChangeLog({
      user: updated_by, // use updated_by in the update route
      isCreate: !existing, // update route: isCreate: false
      accident_id,
      fieldLabels,
      existing,
      newPayload,
    });

    await knex.transaction(async (trx) => {
      await trx("accident_section_eight_master")
        .where("accident_id", accident_id)
        .update({ ...newPayload, updated_by, updated_at: currentTimestamp });

      const hasRealChanges =
        changes_made &&
        !changes_made.includes("with no detected field changes") &&
        !changes_made.includes("with no fields filled");

      if (hasRealChanges) {
        await trx("accident_section_logs_master").insert({
          accident_id,
          changes_made,
          section: "section_eight",
          created_by: updated_by,
          created_at: currentTimestamp,
        });
      }
    });

    res.status(200).json({ message: "Section 8 updated successfully." });
  } catch (err) {
    console.log("UNABLE TO UPDATE SECTION 8:", err);
    res
      .status(500)
      .json({ error: "Failed to update Section 8.", details: err.message });
  }
});

router.put("/submit-for-review", async (req, res) => {
  try {
    const { accident_id, safety_personnel, remarks, role } = req.body;
    if (!accident_id || !safety_personnel) {
      return res
        .status(400)
        .json({ error: "accident_id and safety_personnel are required." });
    }

    const currentTimestamp = new Date();

    //--------------------------------DEPARTMENT REVIEWER ----------------------------------------------------------------
    if (role === "department_reviewer") {
      await knex("accident_master").where("accident_id", accident_id).update({
        is_concerned_department: true,
        concerned_department: safety_personnel,
        concerned_department_at: currentTimestamp,
        concerned_department_remarks: remarks,
        updated_at: currentTimestamp,
        ac_status: "Pending review for Group Manager",
      });

      await knex("accident_section_logs_master").insert({
        accident_id,
        changes_made: `${safety_personnel} (Department Reviewer) submitted remarks. Remarks: "${remarks || "none"}"`,
        section: "review",
        created_by: safety_personnel,
        created_at: currentTimestamp,
      });

      try {
        // Fetch the single section-one row
        const accidentOne = await knex("accident_section_one_master")
          .where("accident_id", accident_id)
          .first(); // ← single object

        // Find department reviewers whose group AND department match the report
        const matchedUsers = await knex("users_master")
          .where("emp_group", accidentOne.group)
          .where("emp_position", "group-reviewer")
          .whereNotNull("emp_email")
          .pluck("emp_email"); // ← returns string[] directly

        const emailBody =
          `Good day,<br><br>` +
          "This is to inform you that a <b>Safety Accident/Incident Report and Investigation (SAIRI) Form</b> " +
          `(<b>${accidentOne.location}</b>) is currently pending your group review and approval.<br><br>` +
          "Please log in to the Safety Management System to evaluate the report and take the necessary action. " +
          "You may access the report directly using the link below:<br><br>" +
          `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">View SAIRI Report</a><br><br>` +
          "<b>SAIRI Form Details</b><br>" +
          `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
          `<b>Status:</b> Pending Review and Approval<br>` +
          `<b>Name:</b> ${accidentOne.name}<br>` +
          `<b>Group:</b> ${accidentOne.group}<br>` +
          `<b>Department:</b> ${accidentOne.department}<br>` +
          `<b>Prepared by:</b> ${accidentOne.prepared_by}<br>` +
          `<b>Date and Time:</b> ${accidentOne.date_and_time}<br><br>` +
          "Your prompt attention to this report is appreciated to ensure that the necessary " +
          "safety information, investigation details, and corrective actions are properly documented.<br><br>" +
          "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
          "Best regards,<br><br>" +
          "<b>SAIRI Monitoring System</b><br>" +
          "Safety Department" +
          '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
          '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
          "<b>Automated Notification</b><br>" +
          "This is an automatically generated email. Please do not reply directly to this email.<br><br>" +
          "&copy; 2026 SAIRI Monitoring System. All rights reserved." +
          "</div>";

        if (matchedUsers.length > 0) {
          await transporter.sendMail({
            from: process.env.EMAIL,
            to: matchedUsers,
            subject: `SAIRI-${accidentOne.location} Pending Group Review/Approval - Reference No. ${accident_id}`,
            html: emailBody,
          });
        }

        console.log(
          "/////////////////////////////////////////////////// EMAIL SENT //submit review from DEPT to GROUP",
        );
      } catch (err) {
        console.log("UNABLE TO SEND EMAIL FROM DEPT TO GROUP: ", err);
      }
    }
    //--------------------------------GROUP REVIEWER--------------------------------------------------------------------------
    else if (role === "group_reviewer") {
      // Same pattern as department_reviewer above, but for the
      // Concerned Group Manager stage.
      await knex("accident_master")
        .where("accident_id", accident_id)
        .update({
          is_group_manager: true,
          group_manager: safety_personnel,
          group_manager_at: currentTimestamp,
          group_manager_remarks: remarks || "",
          updated_at: currentTimestamp,
          ac_status: "Pending review for Safety DH",
        });

      await knex("accident_section_logs_master").insert({
        accident_id,
        changes_made: `${safety_personnel} (Group Reviewer) submitted remarks. Remarks: "${remarks || "none"}"`,
        section: "review",
        created_by: safety_personnel,
        created_at: currentTimestamp,
      });

      try {
        // Fetch the single section-one row
        const accidentOne = await knex("accident_section_one_master")
          .where("accident_id", accident_id)
          .first(); // ← single object

        // Find department reviewers whose group AND department match the report
        const matchedUsers = await knex("users_master")
          .where("emp_position", "safety-head")
          .whereNotNull("emp_email")
          .pluck("emp_email"); // ← returns string[] directly

        const emailBody =
          `Good day,<br><br>` +
          "This is to inform you that a <b>Safety Accident/Incident Report and Investigation (SAIRI) Form</b> " +
          `(<b>${accidentOne.location}</b>) is currently pending your safety deparment head review and approval.<br><br>` +
          "Please log in to the Safety Management System to evaluate the report and take the necessary action. " +
          "You may access the report directly using the link below:<br><br>" +
          `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">View SAIRI Report</a><br><br>` +
          "<b>SAIRI Form Details</b><br>" +
          `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
          `<b>Status:</b> Pending Review and Approval<br>` +
          `<b>Name:</b> ${accidentOne.name}<br>` +
          `<b>Group:</b> ${accidentOne.group}<br>` +
          `<b>Department:</b> ${accidentOne.department}<br>` +
          `<b>Prepared by:</b> ${accidentOne.prepared_by}<br>` +
          `<b>Date and Time:</b> ${accidentOne.date_and_time}<br><br>` +
          "Your prompt attention to this report is appreciated to ensure that the necessary " +
          "safety information, investigation details, and corrective actions are properly documented.<br><br>" +
          "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
          "Best regards,<br><br>" +
          "<b>SAIRI Monitoring System</b><br>" +
          "Safety Department" +
          '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
          '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
          "<b>Automated Notification</b><br>" +
          "This is an automatically generated email. Please do not reply directly to this email.<br><br>" +
          "&copy; 2026 SAIRI Monitoring System. All rights reserved." +
          "</div>";

        if (matchedUsers.length > 0) {
          await transporter.sendMail({
            from: process.env.EMAIL,
            to: matchedUsers,
            subject: `SAIRI-${accidentOne.location} Pending Safety Department Head Review/Approval - Reference No. ${accident_id}`,
            html: emailBody,
          });
        }

        console.log(
          "/////////////////////////////////////////////////// EMAIL SENT //submit review from DEPT to SAFETY DH",
        );
      } catch (err) {
        console.log("UNABLE TO SEND EMAIL FROM GROUP TO SAFETY DH: ", err);
      }
    }
    //---------------------------------------SAFETY DEPARTMENT HEAD ------------------------------------------------------
    else if (role === "safety_head") {
      const accident8Data = await knex("accident_section_eight_master")
        .where("accident_id", accident_id)
        .first();

      let correctiveTable = [];
      try {
        correctiveTable = accident8Data?.corrective_table
          ? JSON.parse(accident8Data.corrective_table)
          : [];
      } catch {
        correctiveTable = [];
      }

      // Determine ac_status based on corrective action item statuses
      const CLOSED_STATUSES = ["completed", "cancelled"];
      const allClosedOrCancelled =
        correctiveTable.length > 0 &&
        correctiveTable.every((item) =>
          CLOSED_STATUSES.includes((item.status || "").toLowerCase().trim()),
        );
      const newStatus = allClosedOrCancelled
        ? "Pending department closure"
        : "Pending Corrective and Preventive";

      await knex("accident_master")
        .where("accident_id", accident_id)
        .update({
          is_safety_dh: true,
          safety_dh: safety_personnel,
          safety_dh_at: currentTimestamp,
          safety_dh_remarks: remarks || "",
          updated_at: currentTimestamp,
          ac_status: newStatus,
        });

      await knex("accident_section_logs_master").insert({
        accident_id,
        changes_made: `${safety_personnel} (Safety DH) submitted remarks. Remarks: "${remarks || "none"}"`,
        section: "review",
        created_by: safety_personnel,
        created_at: currentTimestamp,
      });

      try {
        // Fetch the single section-one row
        const accidentOne = await knex("accident_section_one_master")
          .where("accident_id", accident_id)
          .first(); // ← single object

        const emailBody1 =
          `Good day,<br><br>` +
          "This is to inform you that a <b>Safety Accident/Incident Report and Investigation (SAIRI) Form</b> " +
          `(<b>${accidentOne.location}</b>) is currently pending your department closure approval.<br><br>` +
          "Please log in to the Safety Management System to evaluate the report and take the necessary action. " +
          "You may access the report directly using the link below:<br><br>" +
          `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">View SAIRI Report</a><br><br>` +
          "<b>SAIRI Form Details</b><br>" +
          `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
          `<b>Status:</b> Pending Review and Approval<br>` +
          `<b>Name:</b> ${accidentOne.name}<br>` +
          `<b>Group:</b> ${accidentOne.group}<br>` +
          `<b>Department:</b> ${accidentOne.department}<br>` +
          `<b>Prepared by:</b> ${accidentOne.prepared_by}<br>` +
          `<b>Date and Time:</b> ${accidentOne.date_and_time}<br><br>` +
          "Your prompt attention to this report is appreciated to ensure that the necessary " +
          "safety information, investigation details, and corrective actions are properly documented.<br><br>" +
          "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
          "Best regards,<br><br>" +
          "<b>SAIRI Monitoring System</b><br>" +
          "Safety Department" +
          '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
          '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
          "<b>Automated Notification</b><br>" +
          "This is an automatically generated email. Please do not reply directly to this email.<br><br>" +
          "&copy; 2026 SAIRI Monitoring System. All rights reserved." +
          "</div>";

        const emailBody2 =
          `Good day,<br><br>` +
          "This is to inform you that a <b>Safety Accident/Incident Report and Investigation (SAIRI) Form</b> " +
          `(<b>${accidentOne.location}</b>) is currently pending for the corrective and preventive action plan.<br><br>` +
          "Please log in to the Safety Management System to evaluate the report and take the necessary action. " +
          "You may access the report directly using the link below:<br><br>" +
          `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">View SAIRI Report</a><br><br>` +
          "<b>SAIRI Form Details</b><br>" +
          `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
          `<b>Status:</b> Pending Review and Approval<br>` +
          `<b>Name:</b> ${accidentOne.name}<br>` +
          `<b>Group:</b> ${accidentOne.group}<br>` +
          `<b>Department:</b> ${accidentOne.department}<br>` +
          `<b>Prepared by:</b> ${accidentOne.prepared_by}<br>` +
          `<b>Date and Time:</b> ${accidentOne.date_and_time}<br><br>` +
          "Your prompt attention to this report is appreciated to ensure that the necessary " +
          "safety information, investigation details, and corrective actions are properly documented.<br><br>" +
          "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
          "Best regards,<br><br>" +
          "<b>SAIRI Monitoring System</b><br>" +
          "Safety Department" +
          '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
          '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
          "<b>Automated Notification</b><br>" +
          "This is an automatically generated email. Please do not reply directly to this email.<br><br>" +
          "&copy; 2026 SAIRI Monitoring System. All rights reserved." +
          "</div>";

        if (newStatus === "Pending department closure") {
          const matched1Users = await knex("users_master")
            .where("emp_group", accidentOne.group)
            .where("emp_department", accidentOne.department)
            .where("emp_position", "department-reviewer")
            .whereNotNull("emp_email")
            .pluck("emp_email"); // ← returns string[] directly

          await transporter.sendMail({
            from: process.env.EMAIL,
            to: matched1Users,
            subject: `SAIRI-${accidentOne.location} Pending Department Closure - Reference No. ${accident_id}`,
            html: emailBody1,
          });
          console.log(
            "//////////////////////////////////////////////////////////////////////////////EMAIL SENT TO DEPARTMENT FOR CLOSURE",
          );
        } else if (newStatus === "Pending Corrective and Preventive") {
          const dept = await knex("users_master")
            .where("emp_group", accidentOne.group)
            .where("emp_department", accidentOne.department)
            .where("emp_position", "department-reviewer")
            .whereNotNull("emp_email")
            .pluck("emp_email");

          const safety_reviewers = await knex("users_master")
            .where("emp_location", accidentOne.location)
            .where("emp_position", "safety-reviewer");

          const safety_reviewers_email = safety_reviewers.map(
            (email) => email.emp_email,
          );

          const group = await knex("users_master")
            .where("emp_group", accidentOne.group)
            .where("emp_position", "group-reviewer")
            .whereNotNull("emp_email")
            .pluck("emp_email");

          const safetyDH = await knex("users_master")
            .where("emp_position", "safety-head")
            .whereNotNull("emp_email")
            .pluck("emp_email");

          await transporter.sendMail({
            from: process.env.EMAIL,
            to: [...safety_reviewers_email, ...dept, ...group, ...safetyDH],
            subject: `SAIRI-${accidentOne.location} Pending Corrective & Prevention action plan - Reference No. ${accident_id}`,
            html: emailBody2,
          });
        } else {
        }

        console.log(
          "/////////////////////////////////////////////////// EMAIL SENT //submit review from DEPT to SAFETY DH",
        );
      } catch (err) {
        console.log("UNABLE TO SEND EMAIL FROM GROUP TO SAFETY DH: ", err);
      }
    }
    //------------------------------------------------ SAFETY REVIEWR-----------------------------------------------------------
    else {
      // Safety reviewer stage
      await knex("accident_master")
        .where("accident_id", accident_id)
        .update({
          is_safety_personnel: true,
          safety_personnel,
          safety_personnel_remarks: remarks || "",
          safety_personnel_at: currentTimestamp,
          updated_at: currentTimestamp,
          ac_status: "Pending review for Department",
        });

      await knex("accident_section_logs_master").insert({
        accident_id,
        changes_made: `${safety_personnel} submitted report for review. Remarks: "${remarks || "none"}"`,
        section: "review",
        created_by: safety_personnel,
        created_at: currentTimestamp,
      });

      try {
        // Fetch the single section-one row
        const accidentOne = await knex("accident_section_one_master")
          .where("accident_id", accident_id)
          .first(); // ← single object

        // Find department reviewers whose group AND department match the report
        const matchedUsers = await knex("users_master")
          .where("emp_group", accidentOne.group)
          .where("emp_department", accidentOne.department)
          .where("emp_position", "department-reviewer")
          .whereNotNull("emp_email")
          .pluck("emp_email"); // ← returns string[] directly

        const groupmatchedUsers = await knex("users_master")
          .where("emp_group", accidentOne.group)
          .where("emp_position", "group-reviewer")
          .whereNotNull("emp_email")
          .pluck("emp_email"); // ← returns string[] directly

        const emailBody =
          `Good day,<br><br>` +
          "This is to inform you that a <b>Safety Accident/Incident Report and Investigation (SAIRI) Form</b> " +
          `(<b>${accidentOne.location}</b>) is currently pending your department review and approval.<br><br>` +
          "Please log in to the Safety Management System to evaluate the report and take the necessary action. " +
          "You may access the report directly using the link below:<br><br>" +
          `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">View SAIRI Report</a><br><br>` +
          "<b>SAIRI Form Details</b><br>" +
          `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
          `<b>Status:</b> Pending Review and Approval<br>` +
          `<b>Name:</b> ${accidentOne.name}<br>` +
          `<b>Group:</b> ${accidentOne.group}<br>` +
          `<b>Department:</b> ${accidentOne.department}<br>` +
          `<b>Prepared by:</b> ${accidentOne.prepared_by}<br>` +
          `<b>Date and Time:</b> ${accidentOne.date_and_time}<br><br>` +
          "Your prompt attention to this report is appreciated to ensure that the necessary " +
          "safety information, investigation details, and corrective actions are properly documented.<br><br>" +
          "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
          "Best regards,<br><br>" +
          "<b>SAIRI Monitoring System</b><br>" +
          "Safety Department" +
          '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
          '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
          "<b>Automated Notification</b><br>" +
          "This is an automatically generated email. Please do not reply directly to this email.<br><br>" +
          "&copy; 2026 SAIRI Monitoring System. All rights reserved." +
          "</div>";

        if (matchedUsers.length > 0) {
          await transporter.sendMail({
            from: process.env.EMAIL,
            to: matchedUsers,
            cc: groupmatchedUsers,
            subject: `SAIRI-${accidentOne.location} Pending Department Review/Approval - Reference No. ${accident_id}`,
            html: emailBody,
          });
        }

        console.log(
          "/////////////////////////////////////////////////// EMAIL SENT //submit review from SR to dept",
        );
      } catch (err) {
        console.log("UNABLE TO SEND EMAIL FROM SR TO DEPT: ", err);
      }
    }
    res.status(200).json({ message: "Submitted successfully." });
  } catch (err) {
    console.log("UNABLE TO SUBMIT FOR REVIEW:", err);
    res.status(500).json({ error: "Failed to submit.", details: err.message });
  }
});

router.put("/request-extension", async (req, res) => {
  try {
    const { accident_id, item_index, new_due_date, reason, requested_by } =
      req.body;

    if (!accident_id || item_index === undefined || !new_due_date || !reason) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const existing = await knex("accident_section_eight_master")
      .where("accident_id", accident_id)
      .first();

    if (!existing) {
      return res
        .status(404)
        .json({ error: "Section 8 not found for this accident." });
    }

    let correctiveTable = [];
    try {
      correctiveTable = existing.corrective_table
        ? JSON.parse(existing.corrective_table)
        : [];
    } catch {
      correctiveTable = [];
    }

    const item = correctiveTable[item_index];
    if (!item) {
      return res
        .status(404)
        .json({ error: `Action item at index ${item_index} not found.` });
    }

    const extensionEntry = {
      requestedAt: new Date().toISOString(),
      requestedBy: requested_by,
      originalDueDate: item.due_date,
      newDueDate: new_due_date,
      reason,
      status: "pending",
    };

    if (!Array.isArray(item.extension_requests)) {
      item.extension_requests = [];
    }
    item.extension_requests.push(extensionEntry);
    item.extension_request_date = new_due_date;
    item.extension_request_remarks = reason;

    const changes_made = `${requested_by} requested a due date extension on Corrective Action Item #${item_index + 1}${item.recommendation ? ` (${item.recommendation})` : ""} — Original due date: "${item.due_date || "not set"}", Requested new due date: "${new_due_date}", Reason: "${reason}"`;

    await knex.transaction(async (trx) => {
      await trx("accident_section_eight_master")
        .where("accident_id", accident_id)
        .update({
          corrective_table: JSON.stringify(correctiveTable),
          updated_by: requested_by,
          updated_at: new Date(),
        });

      await trx("accident_section_logs_master").insert({
        accident_id,
        changes_made,
        section: "section_eight",
        created_by: requested_by,
        created_at: new Date(),
      });
    });

    res.status(200).json({ message: "Extension request saved successfully." });
  } catch (err) {
    console.log("UNABLE TO SAVE EXTENSION REQUEST:", err);
    res.status(500).json({
      error: "Failed to save extension request.",
      details: err.message,
    });
  }
});

router.put("/change-for-closure", async (req, res) => {
  try {
    const { accident_id, updated_by, status, resetSectionEightSignoffs } =
      req.body;

    if (!accident_id) {
      return res.status(400).json({ error: "accident_id is required." });
    }

    const currentTimestamp = new Date();

    // Fetch current status so we can log a meaningful from → to change,
    // consistent with how other routes in this file log diffs.
    const existingMaster = await knex("accident_master")
      .where("accident_id", accident_id)
      .first();

    const oldStatus = existingMaster?.ac_status || "";

    await knex.transaction(async (trx) => {
      await trx("accident_master").where("accident_id", accident_id).update({
        ac_status: status,
        updated_by: updated_by,
        updated_at: currentTimestamp,
      });

      if (oldStatus !== status) {
        await trx("accident_section_logs_master").insert({
          accident_id,
          changes_made: `${updated_by || "System"} changed report status from "${oldStatus || "empty"}" to "${status || "empty"}"`,
          section: "accident_master",
          created_by: updated_by || "System",
          created_at: currentTimestamp,
        });
      }

      if (resetSectionEightSignoffs) {
        const existingSection8 = await trx("accident_section_eight_master")
          .where("accident_id", accident_id)
          .first();

        await trx("accident_section_eight_master")
          .where("accident_id", accident_id)
          .update({
            concerned_department_name: null,
            concerned_date: null,
            concerned_department_remarks: null,
            group_manager_name: null,
            group_manager_date: null,
            group_manager_remarks: null,
            safety_manager_name: null,
            safety_manager_date: null,
            safety_manager_remarks: null,
            updated_by: updated_by,
            updated_at: currentTimestamp,
          });

        // Only note the fields that actually held a value before clearing,
        // so the log doesn't claim "cleared" for sign-offs that were already empty.
        const clearedFields = [];
        if (existingSection8?.concerned_department_name)
          clearedFields.push("Concerned Department");
        if (existingSection8?.group_manager_name)
          clearedFields.push("Group Manager");
        if (existingSection8?.safety_manager_name)
          clearedFields.push("Safety Manager");

        const changes_made =
          clearedFields.length > 0
            ? `${updated_by || "System"} reverted an action item to Open — cleared ${clearedFields.join(", ")} close-out sign-off(s) on Section 8 (name, date, and remarks).`
            : `${updated_by || "System"} reverted an action item to Open — no Section 8 close-out sign-offs were set, so nothing to clear.`;

        await trx("accident_section_logs_master").insert({
          accident_id,
          changes_made,
          section: "section_eight",
          created_by: updated_by || "System",
          created_at: currentTimestamp,
        });
      }
    });

    try {
      ////////////////////////////////////////////emaill
      const accidentOne = await knex("accident_section_one_master")
        .where("accident_id", accident_id)
        .first(); // ← single object

      const emailBody =
        `Good day,<br><br>` +
        "This is to inform you that a <b>Safety Accident/Incident Report and Investigation (SAIRI) Form</b> " +
        `(<b>${accidentOne.location}</b>) is currently pending for the corrective and preventive action plan.<br><br>` +
        "Please log in to the Safety Management System to evaluate the report and take the necessary action. " +
        "You may access the report directly using the link below:<br><br>" +
        `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">View SAIRI Report</a><br><br>` +
        "<b>SAIRI Form Details</b><br>" +
        `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
        `<b>Status:</b> Pending Review and Approval<br>` +
        `<b>Name:</b> ${accidentOne.name}<br>` +
        `<b>Group:</b> ${accidentOne.group}<br>` +
        `<b>Department:</b> ${accidentOne.department}<br>` +
        `<b>Prepared by:</b> ${accidentOne.prepared_by}<br>` +
        `<b>Date and Time:</b> ${accidentOne.date_and_time}<br><br>` +
        "Your prompt attention to this report is appreciated to ensure that the necessary " +
        "safety information, investigation details, and corrective actions are properly documented.<br><br>" +
        "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
        "Best regards,<br><br>" +
        "<b>SAIRI Monitoring System</b><br>" +
        "Safety Department" +
        '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
        '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
        "<b>Automated Notification</b><br>" +
        "This is an automatically generated email. Please do not reply directly to this email.<br><br>" +
        "&copy; 2026 SAIRI Monitoring System. All rights reserved." +
        "</div>";

      const emailBody1 =
        `Good day,<br><br>` +
        "This is to inform you that a <b>Safety Accident/Incident Report and Investigation (SAIRI) Form</b> " +
        `(<b>${accidentOne.location}</b>) is currently pending for the department head report closure.<br><br>` +
        "Please log in to the Safety Management System to evaluate the report and take the necessary action. " +
        "You may access the report directly using the link below:<br><br>" +
        `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">View SAIRI Report</a><br><br>` +
        "<b>SAIRI Form Details</b><br>" +
        `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
        `<b>Status:</b> Pending Review and Approval<br>` +
        `<b>Name:</b> ${accidentOne.name}<br>` +
        `<b>Group:</b> ${accidentOne.group}<br>` +
        `<b>Department:</b> ${accidentOne.department}<br>` +
        `<b>Prepared by:</b> ${accidentOne.prepared_by}<br>` +
        `<b>Date and Time:</b> ${accidentOne.date_and_time}<br><br>` +
        "Your prompt attention to this report is appreciated to ensure that the necessary " +
        "safety information, investigation details, and corrective actions are properly documented.<br><br>" +
        "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
        "Best regards,<br><br>" +
        "<b>SAIRI Monitoring System</b><br>" +
        "Safety Department" +
        '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
        '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
        "<b>Automated Notification</b><br>" +
        "This is an automatically generated email. Please do not reply directly to this email.<br><br>" +
        "&copy; 2026 SAIRI Monitoring System. All rights reserved." +
        "</div>";

      if (status === "Pending Department Closure") {
        const dept = await knex("users_master")
          .where("emp_group", accidentOne.group)
          .where("emp_department", accidentOne.department)
          .where("emp_position", "department-reviewer")
          .whereNotNull("emp_email")
          .pluck("emp_email");

        await transporter.sendMail({
          from: process.env.EMAIL,
          to: dept,
          subject: `SAIRI-${accidentOne.location} Pending Department Head For Close out of Report - Reference No. ${accident_id}`,
          html: emailBody1,
        });

        console.log(
          "/////////////------------------------------------------EMAIL SENT TO GROUP FOR GROUP CLOSURE",
        );
      } else if (status === "Pending Corrective and Preventive") {
        const dept = await knex("users_master")
          .where("emp_group", accidentOne.group)
          .where("emp_department", accidentOne.department)
          .where("emp_position", "department-reviewer")
          .whereNotNull("emp_email")
          .pluck("emp_email");

        const safety_reviewers = await knex("users_master")
          .where("emp_location", accidentOne.location)
          .where("emp_position", "safety-reviewer");

        const safety_reviewers_email = safety_reviewers.map(
          (email) => email.emp_email,
        );

        const group = await knex("users_master")
          .where("emp_group", accidentOne.group)
          .where("emp_position", "group-reviewer")
          .whereNotNull("emp_email")
          .pluck("emp_email");

        const safetyDH = await knex("users_master")
          .where("emp_position", "safety-head")
          .whereNotNull("emp_email")
          .pluck("emp_email");

        await transporter.sendMail({
          from: process.env.EMAIL,
          to: [...safety_reviewers_email, ...dept, ...group, ...safetyDH],
          subject: `SAIRI-${accidentOne.location} Pending Corrective & Prevention action plan - Reference No. ${accident_id}`,
          html: emailBody,
        });
      }
      console.log(
        "/////////////------------------------------------------EMAIL SENT TO SAFETY DEPARTMENT HEAD FOR SAFETY DEPARTMENT HEAD CLOSURE",
      );
    } catch (err) {
      console.log("//////////////////Unable to sent email");
    }

    res.status(200).json({ message: "Status updated successfully." });
  } catch (err) {
    console.log("Unable to Update status: ", err);
    res
      .status(500)
      .json({ error: "Failed to update status.", details: err.message });
  }
});

router.put("/change-closure-status", async (req, res) => {
  try {
    const { accident_id, updated_by, status } = req.body;

    await knex.transaction(async (trx) => {
      await trx("accident_master").where("accident_id", accident_id).update({
        ac_status: status,
        updated_by: updated_by,
        updated_at: new Date(),
      });
    });

    try {
      ////////////////////////////////////////////emaill
      const accidentOne = await knex("accident_section_one_master")
        .where("accident_id", accident_id)
        .first(); // ← single object

      const emailBody =
        `Good day,<br><br>` +
        "This is to inform you that a <b>Safety Accident/Incident Report and Investigation (SAIRI) Form</b> " +
        `(<b>${accidentOne.location}</b>) is currently pending for the group manager report closure.<br><br>` +
        "Please log in to the Safety Management System to evaluate the report and take the necessary action. " +
        "You may access the report directly using the link below:<br><br>" +
        `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">View SAIRI Report</a><br><br>` +
        "<b>SAIRI Form Details</b><br>" +
        `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
        `<b>Status:</b> Pending Review and Approval<br>` +
        `<b>Name:</b> ${accidentOne.name}<br>` +
        `<b>Group:</b> ${accidentOne.group}<br>` +
        `<b>Department:</b> ${accidentOne.department}<br>` +
        `<b>Prepared by:</b> ${accidentOne.prepared_by}<br>` +
        `<b>Date and Time:</b> ${accidentOne.date_and_time}<br><br>` +
        "Your prompt attention to this report is appreciated to ensure that the necessary " +
        "safety information, investigation details, and corrective actions are properly documented.<br><br>" +
        "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
        "Best regards,<br><br>" +
        "<b>SAIRI Monitoring System</b><br>" +
        "Safety Department" +
        '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
        '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
        "<b>Automated Notification</b><br>" +
        "This is an automatically generated email. Please do not reply directly to this email.<br><br>" +
        "&copy; 2026 SAIRI Monitoring System. All rights reserved." +
        "</div>";

      const emailBody1 =
        `Good day,<br><br>` +
        "This is to inform you that a <b>Safety Accident/Incident Report and Investigation (SAIRI) Form</b> " +
        `(<b>${accidentOne.location}</b>) is currently pending for the safety department head report closure.<br><br>` +
        "Please log in to the Safety Management System to evaluate the report and take the necessary action. " +
        "You may access the report directly using the link below:<br><br>" +
        `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">View SAIRI Report</a><br><br>` +
        "<b>SAIRI Form Details</b><br>" +
        `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
        `<b>Status:</b> Pending Review and Approval<br>` +
        `<b>Name:</b> ${accidentOne.name}<br>` +
        `<b>Group:</b> ${accidentOne.group}<br>` +
        `<b>Department:</b> ${accidentOne.department}<br>` +
        `<b>Prepared by:</b> ${accidentOne.prepared_by}<br>` +
        `<b>Date and Time:</b> ${accidentOne.date_and_time}<br><br>` +
        "Your prompt attention to this report is appreciated to ensure that the necessary " +
        "safety information, investigation details, and corrective actions are properly documented.<br><br>" +
        "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
        "Best regards,<br><br>" +
        "<b>SAIRI Monitoring System</b><br>" +
        "Safety Department" +
        '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
        '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
        "<b>Automated Notification</b><br>" +
        "This is an automatically generated email. Please do not reply directly to this email.<br><br>" +
        "&copy; 2026 SAIRI Monitoring System. All rights reserved." +
        "</div>";

      const emailBody3 =
        `Good day,<br><br>` +
        "This is to inform you that the <b>Safety Accident/Incident Report and Investigation (SAIRI) Form</b> " +
        `(<b>${accidentOne.location}</b>) has been successfully <b>completed</b>.<br><br>` +
        "All corrective and preventive action plans, investigation details, and safety evaluations have been finalized. " +
        "You may review the completed report using the link below:<br><br>" +
        `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">View SAIRI Report</a><br><br>` +
        "<b>SAIRI Form Details</b><br>" +
        `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
        `<b>Status:</b> Completed<br>` +
        `<b>Name:</b> ${accidentOne.name}<br>` +
        `<b>Group:</b> ${accidentOne.group}<br>` +
        `<b>Department:</b> ${accidentOne.department}<br>` +
        `<b>Prepared by:</b> ${accidentOne.prepared_by}<br>` +
        `<b>Date and Time:</b> ${accidentOne.date_and_time}<br><br>` +
        "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
        "Best regards,<br><br>" +
        "<b>SAIRI Monitoring System</b><br>" +
        "Safety Department" +
        '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
        '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
        "<b>Automated Notification</b><br>" +
        "This is an automatically generated email. Please do not reply directly to this email.<br><br>" +
        "&copy; 2026 SAIRI Monitoring System. All rights reserved." +
        "</div>";

      if (status === "Pending Group Closure") {
        const group = await knex("users_master")
          .where("emp_group", accidentOne.group)
          .where("emp_position", "group-reviewer")
          .whereNotNull("emp_email")
          .pluck("emp_email");

        await transporter.sendMail({
          from: process.env.EMAIL,
          to: group,
          subject: `SAIRI-${accidentOne.location} Pending Group Manager For Close out of Report - Reference No. ${accident_id}`,
          html: emailBody,
        });

        console.log(
          "/////////////------------------------------------------EMAIL SENT TO GROUP FOR GROUP CLOSURE",
        );
      } else if (status === "Pending Safety DH Closure") {
        const safetyDH = await knex("users_master")
          .where("emp_position", "safety-head")
          .whereNotNull("emp_email")
          .pluck("emp_email");
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: safetyDH,
          subject: `SAIRI-${accidentOne.location} Pending Safety Department Head For Close out of Report - Reference No. ${accident_id}`,
          html: emailBody1,
        });
      } else if (status === "Complete") {
        const dept = await knex("users_master")
          .where("emp_group", accidentOne.group)
          .where("emp_department", accidentOne.department)
          .where("emp_position", "department-reviewer")
          .whereNotNull("emp_email")
          .pluck("emp_email");

        const safety_reviewers = await knex("users_master")
          .where("emp_location", accidentOne.location)
          .where("emp_position", "safety-reviewer");

        const safety_reviewers_email = safety_reviewers.map(
          (email) => email.emp_email,
        );

        const group = await knex("users_master")
          .where("emp_group", accidentOne.group)
          .where("emp_position", "group-reviewer")
          .whereNotNull("emp_email")
          .pluck("emp_email");

        const safetyDH = await knex("users_master")
          .where("emp_position", "safety-head")
          .whereNotNull("emp_email")
          .pluck("emp_email");

        await transporter.sendMail({
          from: process.env.EMAIL,
          to: [...safety_reviewers_email, ...dept, ...group, ...safetyDH],
          subject: `SAIRI-${accidentOne.location} Report Complete - Reference No. ${accident_id}`,
          html: emailBody3,
        });
      }
      console.log(
        "/////////////------------------------------------------EMAIL SENT TO SAFETY DEPARTMENT HEAD FOR SAFETY DEPARTMENT HEAD CLOSURE",
      );
    } catch (err) {
      console.log("//////////////////Unable to sent email");
    }

    res.status(200).json({ message: "Status updated successfully." });
  } catch (err) {
    console.log("Internal Error: ", err);
  }
});

router.post("/notify-all-sr-complete", async (req, res) => {
  try {
    const { accident_id, created_by } = req.body;

    const accident1 = await knex("accident_section_one_master")
      .where("accident_id", accident_id)
      .first();

    const accident3 = await knex("accident_section_three_master")
      .where("accident_id", accident_id)
      .first();

    const accident = await knex("accident_master")
      .where("accident_id", accident_id)
      .first();

    if (!accident1?.location) {
      console.log(
        `SKIPPING SAFETY REVIEWER EMAIL for ${accident_id}: no location on section 1 record.`,
      );
    } else {
      if (!accident.safety_personnel)
        try {
          const safety_reviewers = await knex("users_master")
            .where("emp_location", accident1.location)
            .where("emp_position", "safety-reviewer");

          const safety_reviewers_email = safety_reviewers.map(
            (u) => u.emp_email,
          );

          var start =
            `Good day,<br><br>` +
            "This is to inform you that the Safety Accident/Incident Report and Investigation (SAIRI) Form " +
            `for <b>${accident1.location}</b> is now ready for your evaluation, review of any necessary corrections, and/or additional inputs. ` +
            `The medical evaluation has been approved by the Attending Physician ${accident3.attending_physicians_name_and_signature}.<br><br>` +
            "Please log in to the Safety Management System to review the report and provide your feedback or updates. " +
            "You may access the report directly using the link below:<br><br>" +
            `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">` +
            "View SAIRI Report</a><br><br>" +
            "<b>SAIRI Form Details</b><br>" +
            `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
            `<b>Status:</b> Ready for Evaluation & Review<br>` +
            `<b>Name:</b> ${accident1.name}<br>` +
            `<b>Group:</b> ${accident1.group}<br>` +
            `<b>Department:</b> ${accident1.department}<br>` +
            `<b>Attending Physician:</b> ${accident3.attending_physicians_name_and_signature}<br>` +
            `<b>Date and Time:</b> ${accident1.date_and_time}<br><br>`;

          var footer =
            "Your prompt evaluation is appreciated to ensure that all necessary safety information, investigation details, and corrective actions are accurately documented before final submission.<br><br>" +
            "If you have any questions or require further clarification regarding this report, " +
            "please contact the Safety Department through the appropriate official channels.<br><br>" +
            "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
            "Best regards,<br><br>" +
            "<b>SAIRI Monitoring System</b><br>" +
            "Safety Department";

          var norep =
            '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
            '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
            "<b>Automated Notification</b><br>" +
            "This is an automatically generated email from the SAIRI Monitoring System. " +
            "Please do not reply directly to this email, as this mailbox is not monitored.<br><br>" +
            "For technical assistance or questions regarding this notification, please contact " +
            "the Safety Department through the official support channels.<br><br>" +
            "&copy; 2026 SAIRI Monitoring System. All rights reserved." +
            "</div>";

          var email = start + footer + norep;

          if (safety_reviewers_email.length > 0) {
            const mailOption = {
              from: process.env.EMAIL,
              to: safety_reviewers_email,
              subject: `SAIRI-${accident1.location} Report Pending Review/Approval - Reference No. ${accident_id}`,
              html: email,
            };
            await transporter.sendMail(mailOption);
            console.log(
              "/////////////////////////////////////////////////////////// EMAIL SENT FOR ALL SR ONCE REPOR IS COMPLETE",
            );
          } else {
            console.log(
              `No safety-reviewer users found for location "${accident1.location}" — skipping email.`,
            );
          }
        } catch (mailErr) {
          console.log("UNABLE TO SEND EMAIL /notify-all-sr-complete", mailErr);
        }
    }

    res.status(200).json({ message: "Email sent successfully." });
  } catch (err) {
    console.log("Unable to notify all SR completed");
  }
});

// ── DEDICATED "NO VALIDATION" COMBINED REPORT ENDPOINT ──────────────────────
// Used only by the 2-tab (General Info + Medical Evaluation) quick-entry form.
// This is intentionally its own endpoint — it does NOT reuse /add-report or
// /add-section3-report — and it performs no required-field validation, so it
// will happily persist a report where every field is blank.
router.post("/add-report-combined", async (req, res) => {
  try {
    const currentTimestamp = new Date();
    const {
      // Section 1 / 2 fields
      siriRefType,
      dataFor,
      workRelated,
      govtNotification,
      subtypes,
      employer,
      name,
      chapaNo,
      jobDesignation,
      dateOfEvent,
      timeOfEvent,
      shift,
      dateReported,
      timeReported,
      location,
      specificLocation,
      level,
      reportedBy,
      reportedTo,
      group,
      department,
      section,
      dateHired,
      dateOfBirth,
      age,
      homeAddress,
      status,
      noOfDependents,
      lengthOfService,
      experienceAtOccupation,
      workingAreas,
      othersArea,
      incidentDescription,
      immediateActions,
      participants,
      preparedBy,
      preparedDateTime,
      created_by,
      created_by_position,
      // Section 3 fields
      recurrentInjury,
      dateTimeProvided,
      extentOfDisability,
      natureOfInjury,
      natureOfInjuryOther,
      mechanismOfInjury,
      mechanismOfInjuryOther,
      contactExposure,
      contactExposureOther,
      agencyOfInjury,
      agencyOfInjuryOther,
      partsBodyInjured,
      partsBodyInjuredOther,
      medicalDiagnosis,
      vitalsTemperature,
      vitalsBloodPressure,
      vitalsPulseRate,
      vitalsBloodAlcohol,
      rehabilitationPlan,
      rehabLightWorkDays,
      rehabFurtherEval,
      detailsOfTreatment,
      attendingPhysician,
      section3DateTime,
    } = req.body;

    // No validation on purpose — every field below is optional and may be
    // empty/undefined. Only a unique accident_id is generated.
    const existingIds = await knex("accident_master").pluck("accident_id");
    const accident_id = generateAccidentId(siriRefType, existingIds);

    const formattedParticipants = Array.isArray(participants)
      ? participants
        .filter(
          (p) =>
            p?.name?.trim() ||
            p?.department?.trim() ||
            p?.involvementType?.trim(),
        )
        .map((p) => ({
          name: p.name || "",
          department: p.department || "",
          involvementType: p.involvementType || "",
        }))
      : [];

    const section1Payload = {
      goverment_notification_required: govtNotification === "YES" ? 1 : 0,
      data_for: dataFor || null,
      // Fixed on purpose: this form only ever creates Not Work Related reports.
      work_related: "not_work_related",
      accident_incident_subtype: subtypes || null,
      employer: employer || null,
      name: name || null,
      chapa_number: chapaNo || null,
      job_designation: jobDesignation || null,
      date_of_event: dateOfEvent || null,
      time_of_event: timeOfEvent || null,
      shift: shift || null,
      date_reported: dateReported || null,
      time_reported: timeReported || null,
      location: location || null,
      specific_location: specificLocation || null,
      level: level || null,
      reported_by: reportedBy || null,
      supervisor_reported_to: reportedTo || null,
      group: group || null,
      department: department || null,
      section: section || null,
      date_hired: dateHired || null,
      date_of_birth: dateOfBirth || null,
      age: age || null,
      home_address: homeAddress || null,
      status: status || null,
      number_of_dependents: noOfDependents || null,
      length_of_service: lengthOfService || null,
      expereince_at_occupation: experienceAtOccupation || null,
      working_area: workingAreas || null,
      incident_accident_brief_description: incidentDescription || null,
      immediate_actions_taken: immediateActions || null,
      participants: JSON.stringify(formattedParticipants),
      prepared_by: preparedBy || null,
      date_and_time: preparedDateTime || new Date(),
    };

    const natureFinal = [
      ...(Array.isArray(natureOfInjury)
        ? natureOfInjury
        : (natureOfInjury || "").split(",").filter(Boolean)),
      ...(natureOfInjuryOther ? [natureOfInjuryOther] : []),
    ].join("|");

    const mechanismFinal = [
      ...(Array.isArray(mechanismOfInjury)
        ? mechanismOfInjury
        : (mechanismOfInjury || "").split(",").filter(Boolean)),
      ...(mechanismOfInjuryOther ? [mechanismOfInjuryOther] : []),
    ].join("|");

    const contactFinal = [
      ...(Array.isArray(contactExposure)
        ? contactExposure
        : (contactExposure || "").split(",").filter(Boolean)),
      ...(contactExposureOther ? [contactExposureOther] : []),
    ].join("|");

    const agencyFinal = [
      ...(Array.isArray(agencyOfInjury)
        ? agencyOfInjury
        : (agencyOfInjury || "").split(",").filter(Boolean)),
      ...(agencyOfInjuryOther ? [agencyOfInjuryOther] : []),
    ].join("|");

    const bodyPartsFinal = [
      ...(Array.isArray(partsBodyInjured)
        ? partsBodyInjured
        : (partsBodyInjured || "").split(",").filter(Boolean)),
      ...(partsBodyInjuredOther ? [partsBodyInjuredOther] : []),
    ].join("|");

    const rehabFinal = [
      ...(Array.isArray(rehabilitationPlan)
        ? rehabilitationPlan
        : (rehabilitationPlan || "").split(",").filter(Boolean)),
      ...(rehabLightWorkDays ? [`Light Work: ${rehabLightWorkDays} days`] : []),
      ...(rehabFurtherEval ? [`Further Evaluation: ${rehabFurtherEval}`] : []),
    ].join(",");

    const section3Payload = {
      recurrent_injury_illness: recurrentInjury === "YES" ? 1 : 0,
      date_and_time_treatment_provided: dateTimeProvided || null,
      extent_of_disability: extentOfDisability || null,
      nature_of_injury: natureFinal || null,
      mechanism_of_injury: mechanismFinal || null,
      contact_with_or_exposure_to: contactFinal || null,
      agency_of_injury: agencyFinal || null,
      parts_of_the_body_injured: bodyPartsFinal || null,
      medical_diagnosis: medicalDiagnosis || null,
      vital_signs_temperature: vitalsTemperature || null,
      blood_preassure: vitalsBloodPressure || null,
      pulse_rate: vitalsPulseRate || null,
      blood_urine_alcohol_concentration_level: vitalsBloodAlcohol || null,
      rehabilitation_plan: rehabFinal || null,
      details_of_treatment_provided: detailsOfTreatment || null,
      attending_physicians_name_and_signature: attendingPhysician || null,
      date_and_time: section3DateTime ? new Date(section3DateTime) : null,
    };

    await knex.transaction(async (trx) => {
      await trx("accident_master").insert({
        accident_id,
        is_active: true,
        created_by: created_by || null,
        created_at: currentTimestamp,
        ac_status: "Pending Review for Safety/Medical",
      });

      await trx("accident_section_one_master").insert({
        accident_id,
        is_active: true,
        ...section1Payload,
        created_by: created_by || null,
        created_at: currentTimestamp,
      });

      await trx("accident_section_three_master").insert({
        accident_id,
        ...section3Payload,
        created_by: created_by || null,
        created_at: currentTimestamp,
      });

      await trx("accident_section_logs_master").insert({
        accident_id,
        changes_made: `${created_by || "System"} created ${accident_id} via the combined (no-validation) report form.`,
        section: "section_one",
        created_by: created_by || "System",
        created_at: currentTimestamp,
      });
    });

    //EMAIL FUNCTION------------------------------------------------------------------------------------------------------------
    try {
      const safety_reviewers = await knex("users_master")
        .where("emp_location", siriRefType)
        .where("emp_position", "safety-reviewer");

      const safety_reviewers_email = safety_reviewers.map(
        (email) => email.emp_email,
      );
      //safety start
      var start =
        `Good day,<br><br>` +
        "This is to inform you that a <b>Safety Accident/Incident Report and Investigation (SAIRI) Form</b> " +
        `(<b>${siriRefType}</b>) has been created by medical and is now available for completion.<br><br>` +
        "Please log in to the Safety Management System to review the report and complete the remaining required details. " +
        "You may access the report directly using the link below:<br><br>" +
        `<b>Report Link:</b> <a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">` +
        "View SAIRI Report</a><br><br>" +
        "<b>SAIRI Form Details</b><br>" +
        `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
        `<b>Status:</b> Pending review for safety/medical<br>` +
        `<b>Work Related:</b> ${workRelated === "work_related" ? "Work Related" : "Not Work Related"}<br>` +
        `<b>Name:</b> ${name}<br>` +
        `<b>Group:</b> ${group}<br>` +
        `<b>Department:</b> ${department}<br>` +
        `<b>Prepared by:</b> ${preparedBy}<br>` +
        `<b>Date and Time:</b> ${preparedDateTime}<br><br>`;

      // safety Footer
      var footer =
        "Your prompt attention to this report is appreciated to ensure that the necessary " +
        "safety information, investigation details, and corrective actions are properly documented.<br><br>" +
        "If you have any questions or require further clarification regarding this report, " +
        "please contact the Safety Department through the appropriate official channels.<br><br>" +
        "Thank you for your cooperation and continued commitment to maintaining a safe work environment.<br><br>" +
        "Best regards,<br><br>" +
        "<b>SAIRI Monitoring System</b><br>" +
        "Safety Department";

      // No-reply Disclaimer
      var norep =
        '<br><hr style="border:0; border-top:1px solid #d3d3d3;"><br>' +
        '<div style="color:#808080; font-size:12px; font-family:Arial, sans-serif; line-height:1.5;">' +
        "<b>Automated Notification</b><br>" +
        "This is an automatically generated email from the SAIRI Monitoring System. " +
        "Please do not reply directly to this email, as this mailbox is not monitored.<br><br>" +
        "For technical assistance or questions regarding this notification, please contact " +
        "the Safety Department through the official support channels.<br><br>" +
        "&copy; " +
        "2026" +
        " SAIRI Monitoring System. All rights reserved." +
        "</div>";

      var email = start + footer + norep;

      const mailOption = {
        from: process.env.EMAIL,
        to: safety_reviewers_email,
        subject: `SAIRI-${siriRefType} Report was Created - Reference No. ${accident_id}`,
        html: email,
      };

      await transporter.sendMail(mailOption);

      console.log(
        "/////////////////////////////////////////////////////////// EMAIL SENT FOR ADD REPORT - BY MEDICAL",
      );
    } catch (err) {
      console.log("UNABLE TO SEND EMAIL /add-report-medical-combine", err);
    }

    res.status(200).json({
      message: "success",
      accident_id,
    });
  } catch (err) {
    console.log("UNABLE TO POST COMBINED REPORT: ", err);
    res.status(500).json({
      error: "Failed to create combined accident report",
      details: err.message,
    });
  }
});
router.get("/get-all-section46", async (req, res) => {
  try {
    const data = await knex("accident_section_four_six_master").select(
      "accident_id",
      "severity",
      "likelihood",
      "damage_cost_php",
      "equipment",
      "equipment_name",
    );
    res.json(data);
  } catch (err) {
    console.log("UNABLE TO GET ALL SECTION 4-6:", err);
    res.status(500).json({
      error: "Failed to fetch section 4-6 records.",
      details: err.message,
    });
  }
});
module.exports = router;
