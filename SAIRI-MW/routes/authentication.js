var express = require("express");
var bcrypt = require("bcrypt");
const router = express.Router();
var Sequelize = require("sequelize");
const nodemailer = require("nodemailer");
const { Op } = require("sequelize");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// ===== MULTER SETUP =====
const uploadDir = path.join(__dirname, "../profile");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Invalid file type"));
  },
});
// ========================

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

const { DataTypes } = Sequelize;

const USERS = db.define(
  "users_master",
  {
    id_master: { type: DataTypes.INTEGER, primaryKey: true },
    user_id: { type: DataTypes.STRING, unique: true },
    user_name: { type: DataTypes.STRING },
    emp_firstname: { type: DataTypes.STRING },
    emp_lastname: { type: DataTypes.STRING },
    emp_email: { type: DataTypes.STRING },
    emp_group: { type: DataTypes.STRING },
    emp_role: { type: DataTypes.STRING },
    emp_department: { type: DataTypes.STRING },
    emp_position: { type: DataTypes.STRING },
    pass_word: { type: DataTypes.STRING },
    created_by: { type: DataTypes.STRING },
    created_at: { type: DataTypes.STRING },
    updated_by: { type: DataTypes.STRING },
    updated_at: { type: DataTypes.STRING },
    is_active: { type: DataTypes.STRING },
    is_oic: { type: DataTypes.INTEGER }, // ✅ ADDED
  },
  {
    freezeTableName: false,
    timestamps: false,
    createdAt: false,
    updatedAt: false,
    tableName: "users_master",
  },
);

function generateUserId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `USR${randomPart}`;
}

router.get("/test", async function (req, res) {
  try {
    const test = await knex("users_master").select("*");
    res.json(test);
  } catch (err) {
    console.log("INTERNAL ERROR: ", err);
  }
});

router.get("/get-all-users", async (req, res, next) => {
  try {
    const getAllUsers = await knex("users_master").select("*");
    res.json(getAllUsers);
    console.log("@@@ TRIGGERED /get-all-users");
  } catch (err) {
    console.log("Unable to fetch all users");
  }
});

router.get("/get-user-by-username", async (req, res) => {
  try {
    const getByUsername = await USERS.findAll({
      where: {
        user_name: req.query.user_name,
      },
    });
    res.json(getByUsername);
  } catch (err) {
    console.log("UNABLE TO FETCH USER: ", err);
  }
});

router.post("/login", async function (req, res, next) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ msg: "Username and password are required." });
  }

  try {
    console.log(`Login attempt for user: ${username}`);

    const user = await knex("users_master")
      .where({ user_name: username })
      .first();

    if (!user) {
      return res.status(404).json({ msg: "User not found. Try again." });
    }

    const passwordMatch = await bcrypt.compare(password, user.pass_word);
    if (!passwordMatch) {
      return res.status(401).json({ msg: "Incorrect password. Try again." });
    }

    await knex("users_master")
      .where({ user_id: user.user_id })
      .update({ is_active: 1 });

    const result = {
      id_master: user.id_master,
      user_id: user.user_id,
      is_active: user.is_active,
      is_oic: user.is_oic, // ✅ ADDED
      emp_firstname: user.emp_firstname,
      emp_lastname: user.emp_lastname,
      user_name: user.user_name,
      emp_role: user.emp_role,
      emp_email: user.emp_email,
      emp_group: user.emp_group,
      emp_department: user.emp_department,
      emp_position: user.emp_position,
      emp_location: user.emp_location,
      created_by: user.created_by,
      created_at: user.created_at,
      updated_by: user.updated_by,
      updated_at: user.updated_at,
    };

    console.log(`@@@ User ${username} logged in`);
    res.status(200).json(result);
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ msg: "Server error. Please try again." });
  }
});

router.post("/register", async function (req, res) {
  const currentTimestamp = new Date();

  const {
    firstName,
    secondName,
    username,
    email,
    group,
    department,
    position,
    role,
    emp_location,
    password,
    created_by,
    is_oic,
  } = req.body;

  // ---------- Basic validation ----------
  if (
    !firstName ||
    !secondName ||
    !username ||
    !email ||
    !group ||
    !position ||
    !role ||
    !emp_location ||
    !password
  ) {
    return res.status(400).json({ msg: "All fields are required." });
  }

  if (username.length < 3) {
    return res
      .status(400)
      .json({ msg: "Username must be at least 3 characters." });
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return res.status(400).json({
      msg: "Username may only contain letters, numbers, dots, hyphens, and underscores.",
    });
  }

  if (!email.endsWith("@lepantomining.com")) {
    return res.status(400).json({ msg: "Email must use @lepantomining.com." });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ msg: "Password must be at least 8 characters." });
  }

  const VALID_ROLES = ["admin", "user"];
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ msg: "Invalid role selected." });
  }

  const VALID_LOCATIONS = ["surface", "underground"];
  if (!VALID_LOCATIONS.includes(emp_location)) {
    return res.status(400).json({ msg: "Invalid location selected." });
  }

  // Only these positions can be flagged as OIC
  const OIC_POSITIONS = ["department-reviewer", "group-reviewer"];
  const oicValue =
    OIC_POSITIONS.includes(position) && Number(is_oic) === 1 ? 1 : 0;

  try {
    // ---------- Group validation (same source as /setup/all) ----------
    const groupRow = await knex("group_master")
      .where({ group: group.trim() })
      .first();

    if (!groupRow) {
      return res.status(400).json({ msg: "Invalid group selected." });
    }

    // ---------- Department validation (must belong to the group) ----------
    if (department) {
      const deptRow = await knex("department_master")
        .where({ gd_id: groupRow.gd_id, department: department.trim() })
        .first();

      if (!deptRow) {
        return res
          .status(400)
          .json({ msg: "Invalid department for the selected group." });
      }
    }

    // ---------- Duplicate checks ----------
    const existingUser = await knex("users_master")
      .where({ user_name: username.trim() })
      .first();
    if (existingUser) {
      return res
        .status(400)
        .json({ msg: `Username "${username}" is already taken.` });
    }

    const existingEmail = await knex("users_master")
      .where({ emp_email: email.trim() })
      .first();
    if (existingEmail) {
      return res
        .status(400)
        .json({ msg: `Email "${email}" is already registered.` });
    }

    // ---------- Unique user ID ----------
    const userIds = await knex("users_master").pluck("user_id");
    const existingIdSet = new Set(userIds);
    let user_id;
    let attempts = 0;
    do {
      user_id = generateUserId();
      if (++attempts > 10) {
        return res.status(500).json({
          msg: "Failed to generate a unique User ID. Please try again.",
        });
      }
    } while (existingIdSet.has(user_id));

    // ---------- Insert ----------
    const hashedPassword = await bcrypt.hash(password, 12);

    await knex("users_master").insert({
      user_id,
      emp_firstname: firstName.trim(),
      emp_lastname: secondName.trim(),
      user_name: username.trim(),
      pass_word: hashedPassword,
      emp_email: email.trim(),
      emp_group: group.trim(),
      emp_department: department ? department.trim() : null,
      emp_position: position,
      emp_role: role,
      emp_location,
      created_by: created_by ?? null,
      created_at: currentTimestamp,
      is_active: 1,
      is_oic: oicValue,
    });

    console.log(`@@@ /register — ${username} (${role}, ${group})`);

    return res.status(201).json({
      message: "success", // the frontend checks for this exact value
      details: `${firstName} has been registered successfully.`,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res
      .status(500)
      .json({ msg: "Unable to register user: " + username });
  }
});

router.put("/update/:id_master", async (req, res) => {
  const { id_master } = req.params;
  const {
    firstName,
    secondName,
    username,
    email,
    group,
    department,
    position,
    role,
    emp_location,
    is_active,
    password,
    updated_by,
    is_oic, // ✅ ADDED
  } = req.body;

  if (
    !firstName ||
    !secondName ||
    !username ||
    !email ||
    !group ||
    !position ||
    !role
  ) {
    return res
      .status(400)
      .json({ message: "error", details: "All fields are required." });
  }

  try {
    const dup = await knex("users_master")
      .where({ user_name: username })
      .andWhereNot({ id_master })
      .first();
    if (dup)
      return res.status(400).json({
        message: "error",
        details: `Username "${username}" is already taken.`,
      });

    const updatePayload = {
      emp_firstname: firstName,
      emp_lastname: secondName,
      user_name: username,
      emp_email: email,
      emp_group: group,
      emp_department: department ?? null,
      emp_position: position,
      emp_role: role,
      emp_location,
      is_active: is_active,
      is_oic: is_oic ?? 0, // ✅ ADDED
      updated_by: updated_by ?? null,
      updated_at: new Date(),
    };

    if (password && password.trim().length > 0) {
      updatePayload.pass_word = await bcrypt.hash(password, 12);
    }

    await knex("users_master").where({ id_master }).update(updatePayload);
    res.json({ message: "success" });
  } catch (err) {
    console.error("Update user error:", err);
    res
      .status(500)
      .json({ message: "error", details: "Unable to update user." });
  }
});

router.delete("/delete/:id_master", async (req, res) => {
  try {
    await knex("users_master").where({ id_master: req.params.id_master }).del();
    res.json({ message: "success" });
  } catch (err) {
    console.error("Delete user error:", err);
    res
      .status(500)
      .json({ message: "error", details: "Unable to delete user." });
  }
});

router.get("/get-users-by-group-and-department", async (req, res) => {
  const { emp_group, emp_department } = req.query;

  if (!emp_group || !emp_department) {
    return res.status(400).json({
      message: "error",
      details: "emp_group and emp_department are required.",
    });
  }

  try {
    const users = await knex("users_master")
      .select(
        "user_name",
        "emp_firstname",
        "emp_lastname",
        "emp_position",
        "emp_department",
        "emp_group",
        "is_oic",
      ) // ✅ ADDED is_oic
      .where({ emp_group, emp_department })
      .orderBy("emp_firstname", "asc");

    res.json(users);
  } catch (err) {
    console.error("Unable to fetch users by group and department:", err);
    res
      .status(500)
      .json({ message: "error", details: "Unable to fetch users." });
  }
});

router.get("/get-user-by-username", async (req, res) => {
  try {
    const fetch = await USERS.findAll({
      where: {
        user_name: req.query.user_name,
      },
    });
    res.json(fetch[0]);
  } catch (err) {
    console.log("Unable to fetch users data: ", err);
  }
});

module.exports = router;
