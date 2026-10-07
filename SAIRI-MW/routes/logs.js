var express = require("express");
var bcrypt = require("bcrypt");
const router = express.Router();
var Sequelize = require("sequelize");
const { DataTypes } = Sequelize;
require("dotenv").config();

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

//Unique ID Generation

function generateEmpId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `emp${randomPart}`;
}

function generateSickLeaveId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SL${randomPart}`;
}

const LOGS = db.define(
  "accident_section_logs_master",
  {
    id_master: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    accident_id: {
      type: DataTypes.STRING,
    },
    changes_made: {
      type: DataTypes.STRING,
    },
    section: {
      type: DataTypes.STRING,
    },
    created_by: {
      type: DataTypes.STRING,
    },
    created_at: {
      type: DataTypes.STRING,
    },
  },
  {
    freezeTableName: false,
    timestamps: false,
    createdAt: false,
    updatedAt: false,
    tableName: "accident_section_logs_master",
  },
);

router.get("/get-all-logs", async (req, res) => {
  try {
    const fetch = await knex("accident_section_logs_master").select("*");
    res.json(fetch);
  } catch (err) {
    console.log("Unable to fetch all employee:", err);
    res.status(500).json({ error: "Unable to fetch employees." });
  }
});

router.get("/get-logs-by-id", async (req, res) => {
  try {
    const getById = await knex("accident_section_logs_master")
      .select("*")
      .where("accident_id", req.query.accident_id);
    res.json(getById);
  } catch (err) {
    console.log("Unable to get data: ", err);
    res.status(500).json({ error: "Unable to fetch logs." });
  }
});

module.exports = router;
