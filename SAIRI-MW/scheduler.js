const cron = require("node-cron");
const nodemailer = require("nodemailer");
require("dotenv").config();

var knex = require("knex")({
  client: "mssql",
  connection: {
    user: process.env.USER,
    password: process.env.PASSWORD,
    server: process.env.SERVER,
    database: process.env.DATABASE,
    port: parseInt(process.env.APP_SERVER_PORT),
    options: { enableArithAbort: true },
  },
});

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  secure: false,
  auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false },
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getDaysRemaining(dueDateStr) {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function buildCorrectiveEmail({ accident_id, item, daysRemaining, section1 }) {
  const isOverdue = daysRemaining < 0;
  const statusLabel = isOverdue
    ? `<b style="color:red;">OVERDUE by ${Math.abs(daysRemaining)} day(s)</b>`
    : daysRemaining === 0
      ? `<b style="color:orange;">DUE TODAY</b>`
      : `<b style="color:green;">${daysRemaining} day(s) remaining</b>`;

  const subject = isOverdue
    ? `[OVERDUE] Corrective Action Past Due — ${accident_id}`
    : `[REMINDER] Corrective Action Due in ${daysRemaining} Day(s) — ${accident_id}`;

  const html =
    `Good day,<br><br>` +
    `This is an automated reminder regarding an <b>open corrective action item</b> in the ` +
    `Safety Accident/Incident Report and Investigation (SAIRI) Form.<br><br>` +
    `<b>Status:</b> ${statusLabel}<br><br>` +
    `<b>SAIRI Reference No.:</b> ${accident_id}<br>` +
    (section1 ? `<b>Name:</b> ${section1.name || "—"}<br>` : "") +
    (section1 ? `<b>Department:</b> ${section1.department || "—"}<br>` : "") +
    (section1 ? `<b>Group:</b> ${section1.group || "—"}<br>` : "") +
    `<br><b>Corrective Action Details</b><br>` +
    `<b>Recommendation:</b> ${item.recommendation || "—"}<br>` +
    `<b>Responsible Department:</b> ${item.responsible_department || "—"}<br>` +
    `<b>Responsible Person:</b> ${item.responsible_person || "—"}<br>` +
    `<b>Dept Head:</b> ${item.dept_head || "—"}<br>` +
    `<b>Due Date:</b> ${item.due_date || "—"}<br>` +
    `<b>Remarks:</b> ${item.remarks || "—"}<br><br>` +
    `Please log in to the Safety Management System to take action:<br>` +
    `<a href="${process.env.REACT_CLIENT}/view-report?ACID=${accident_id}">View SAIRI Report</a><br><br>` +
    `Best regards,<br><b>SAIRI Monitoring System</b><br>Safety Department` +
    `<br><hr style="border:0;border-top:1px solid #d3d3d3;"><br>` +
    `<div style="color:#808080;font-size:12px;">` +
    `<b>Automated Notification</b> — Do not reply to this email.<br>` +
    `&copy; 2026 SAIRI Monitoring System. All rights reserved.</div>`;

  return { subject, html };
}

async function checkForDays(targetDays, label) {
  console.log(`[SCHEDULER] Checking for ${label}...`);
  try {
    const allSection8 = await knex("accident_section_eight_master")
      .whereNotNull("corrective_table")
      .select("accident_id", "corrective_table");

    for (const row of allSection8) {
      let items = [];
      try {
        items = JSON.parse(row.corrective_table);
      } catch {
        continue;
      }

      const openItems = items
        .map((it, idx) => ({ ...it, _idx: idx }))
        .filter((it) => (it.status || "Open").toLowerCase() === "open");

      if (openItems.length === 0) continue;

      const section1 = await knex("accident_section_one_master")
        .where("accident_id", row.accident_id)
        .first();

      if (!section1) continue;

      const dept = await knex("users_master")
        .where("emp_group", section1.group)
        .where("emp_department", section1.department)
        .where("emp_position", "department-reviewer")
        .whereNotNull("emp_email")
        .pluck("emp_email");

      const safety_reviewers = await knex("users_master")
        .where("emp_location", section1.location)
        .where("emp_position", "safety-reviewer")
        .whereNotNull("emp_email")
        .pluck("emp_email");

      const group = await knex("users_master")
        .where("emp_group", section1.group)
        .where("emp_position", "group-reviewer")
        .whereNotNull("emp_email")
        .pluck("emp_email");

      const safetyDH = await knex("users_master")
        .where("emp_position", "safety-head")
        .whereNotNull("emp_email")
        .pluck("emp_email");

      const recipients = [
        ...new Set([...dept, ...safety_reviewers, ...group, ...safetyDH]),
      ];
      if (recipients.length === 0) continue;

      for (const item of openItems) {
        const daysRemaining = getDaysRemaining(item.due_date);
        if (daysRemaining === null) continue;
        if (daysRemaining !== targetDays) continue;

        const { subject, html } = buildCorrectiveEmail({
          accident_id: row.accident_id,
          item,
          daysRemaining,
          section1,
        });

        await transporter.sendMail({
          from: process.env.EMAIL,
          to: recipients,
          subject,
          html,
        });

        console.log(
          `[SCHEDULER] Email sent for ${row.accident_id} item #${item._idx + 1} — ${label}`,
        );
        await delay(2000);
      }
    }

    console.log(`[SCHEDULER] Done — ${label}`);
  } catch (err) {
    console.log(`[SCHEDULER] ERROR during ${label}:`, err);
  }
}

async function checkOverdue() {
  console.log(`[SCHEDULER] Checking overdue items...`);
  try {
    const allSection8 = await knex("accident_section_eight_master")
      .whereNotNull("corrective_table")
      .select("accident_id", "corrective_table");

    for (const row of allSection8) {
      let items = [];
      try {
        items = JSON.parse(row.corrective_table);
      } catch {
        continue;
      }

      const openItems = items
        .map((it, idx) => ({ ...it, _idx: idx }))
        .filter((it) => (it.status || "Open").toLowerCase() === "open");

      if (openItems.length === 0) continue;

      const section1 = await knex("accident_section_one_master")
        .where("accident_id", row.accident_id)
        .first();

      if (!section1) continue;

      const dept = await knex("users_master")
        .where("emp_group", section1.group)
        .where("emp_department", section1.department)
        .where("emp_position", "department-reviewer")
        .whereNotNull("emp_email")
        .pluck("emp_email");

      const safety_reviewers = await knex("users_master")
        .where("emp_location", section1.location)
        .where("emp_position", "safety-reviewer")
        .whereNotNull("emp_email")
        .pluck("emp_email");

      const group = await knex("users_master")
        .where("emp_group", section1.group)
        .where("emp_position", "group-reviewer")
        .whereNotNull("emp_email")
        .pluck("emp_email");

      const safetyDH = await knex("users_master")
        .where("emp_position", "safety-head")
        .whereNotNull("emp_email")
        .pluck("emp_email");

      const recipients = [
        ...new Set([...dept, ...safety_reviewers, ...group, ...safetyDH]),
      ];
      if (recipients.length === 0) continue;

      for (const item of openItems) {
        const daysRemaining = getDaysRemaining(item.due_date);
        if (daysRemaining === null) continue;

        // Only send on overdue every 7 days (-7, -14, -21...)
        const isOverdue = daysRemaining < 0;
        if (!isOverdue) continue;
        if (Math.abs(daysRemaining) % 7 !== 0) continue;

        const { subject, html } = buildCorrectiveEmail({
          accident_id: row.accident_id,
          item,
          daysRemaining,
          section1,
        });

        await transporter.sendMail({
          from: process.env.EMAIL,
          to: recipients,
          subject,
          html,
        });

        console.log(
          `[SCHEDULER] Overdue email sent for ${row.accident_id} item #${item._idx + 1} — ${Math.abs(daysRemaining)} days overdue`,
        );
        await delay(2000);
      }
    }

    console.log(`[SCHEDULER] Done — overdue check`);
  } catch (err) {
    console.log(`[SCHEDULER] ERROR during overdue check:`, err);
  }
}
const CRON_OPTIONS = {
  scheduled: true,
  timezone: "Asia/Shanghai", // ← updated
};

cron.schedule(
  "0 2 * * *",
  () => checkForDays(30, "30 days remaining"),
  CRON_OPTIONS,
);
cron.schedule(
  "15 2 * * *",
  () => checkForDays(25, "25 days remaining"),
  CRON_OPTIONS,
);
cron.schedule(
  "30 2 * * *",
  () => checkForDays(20, "20 days remaining"),
  CRON_OPTIONS,
);
cron.schedule(
  "45 2 * * *",
  () => checkForDays(15, "15 days remaining"),
  CRON_OPTIONS,
);
cron.schedule(
  "0 3 * * *",
  () => checkForDays(10, "10 days remaining"),
  CRON_OPTIONS,
);
cron.schedule(
  "15 3 * * *",
  () => checkForDays(7, "7 days remaining"),
  CRON_OPTIONS,
);
cron.schedule(
  "30 3 * * *",
  () => checkForDays(5, "5 days remaining"),
  CRON_OPTIONS,
);
cron.schedule(
  "45 3 * * *",
  () => checkForDays(4, "4 days remaining"),
  CRON_OPTIONS,
);
cron.schedule(
  "0 4 * * *",
  () => checkForDays(3, "3 days remaining"),
  CRON_OPTIONS,
);
cron.schedule(
  "15 4 * * *",
  () => checkForDays(2, "2 days remaining"),
  CRON_OPTIONS,
);
cron.schedule(
  "30 4 * * *",
  () => checkForDays(1, "1 day remaining"),
  CRON_OPTIONS,
);
cron.schedule("45 4 * * *", () => checkOverdue(), CRON_OPTIONS);

module.exports = { checkForDays, checkOverdue };

(async () => {
  console.log("[STARTUP] Running all checks on startup...");
  await checkForDays(30, "30 days remaining");
  await checkForDays(25, "25 days remaining");
  await checkForDays(20, "20 days remaining");
  await checkForDays(15, "15 days remaining");
  await checkForDays(10, "10 days remaining");
  await checkForDays(7, "7 days remaining");
  await checkForDays(5, "5 days remaining");
  await checkForDays(4, "4 days remaining");
  await checkForDays(3, "3 days remaining");
  await checkForDays(2, "2 days remaining");
  await checkForDays(1, "1 day remaining");
  await checkOverdue();
  console.log("[STARTUP] All startup checks complete.");
})();
