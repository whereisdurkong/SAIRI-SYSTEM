var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
const bodyParser = require("body-parser");

require("dotenv").config();

var indexRouter = require("./routes/index");
var authRouter = require("./routes/authentication");
var accidentRouter = require("./routes/accident");
var logsRouter = require("./routes/logs");
var sickleaveRouter = require("./routes/sickleave");
var setupRouter = require("./routes/admin");

const session = require("express-session");
var MemoryStore = require("memorystore")(session);
require("./scheduler");
var app = express();

app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json({ limit: "25mb" })); // ← increased limit
app.use(express.urlencoded({ extended: false, limit: "25mb" })); // ← increased limit
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ── Serve uploaded treatment files as static assets ──────────────────────────
// Files will be accessible at: /uploads/TreatmentProvided/<accident_id>/<filename>
app.use(
  "/uploads",
  express.static(path.join(__dirname, "TreatmentProvided"), {
    // Prevent directory listing
    index: false,
    // Cache for 1 day
    maxAge: "1d",
  }),
);
// ─────────────────────────────────────────────────────────────────────────────

app.use(
  session({
    cookie: { maxAge: 3600000 },
    store: new MemoryStore({
      checkPeriod: 3600000,
    }),
    resave: false,
    secret: "LCMC_COR",
    saveUninitialized: false,
  }),
);

var whitelist = [
  "http://localhost:3501",
  "http://127.0.0.1:3501/",
  "http://localhost",
  "https://192.168.44.26:443",
  "https://192.168.44.26:444",
  "http://192.168.44.26",
  "http://192.168.44.26:3501",
  "http://192.168.4.246:3501",
  "http://192.168.4.246:5009",
];

var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 200,
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "device-remember-token",
    "Access-Control-Allow-Origin",
    "Origin",
    "Accept",
    "app_id",
    "user",
    "password",
  ],
};

app.use(cors(corsOptions));

app.use("/", indexRouter);
app.use("/api/auth", authRouter);
app.use("/api/sl", sickleaveRouter);
app.use("/api/setup", setupRouter);
app.use("/api/accident", accidentRouter);
app.use("/api/logs", logsRouter);

app.set("trust proxy", true);

module.exports = app;
