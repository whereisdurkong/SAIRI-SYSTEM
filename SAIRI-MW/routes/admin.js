var express = require("express");
const router = express.Router();
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

/* ════════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════════ */

function generateGdId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < 6; i++)
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  return `GD-${randomPart}`;
}

function generateDpId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < 6; i++)
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  return `Dp-${randomPart}`;
}

/**
 * POST /setup/add
 * Creates a group and all its departments in one request.
 */
router.post("/add", async (req, res) => {
  const { groupName, departments, created_by } = req.body;

  if (!groupName || !groupName.trim())
    return res
      .status(400)
      .json({ message: "error", details: "Group name is required." });
  if (
    !Array.isArray(departments) ||
    departments.filter((d) => d?.trim()).length === 0
  )
    return res.status(400).json({
      message: "error",
      details: "At least one department is required.",
    });

  const filledDepts = departments.map((d) => d.trim()).filter(Boolean);
  const gd_id = generateGdId();
  const timestamp = new Date();

  try {
    await knex.transaction(async (trx) => {
      await trx("group_master").insert({
        gd_id,
        group: groupName.trim(),
        created_by: created_by || null,
        created_at: timestamp,
      });

      await trx("department_master").insert(
        filledDepts.map((dept) => ({
          gd_id,
          department: dept,
          created_by: created_by || null,
          created_at: timestamp,
        })),
      );
    });

    return res.status(200).json({
      message: "success",
      gd_id,
      groupName: groupName.trim(),
      departments: filledDepts,
    });
  } catch (err) {
    console.error("Add group/department error:", err);
    return res.status(500).json({ message: "error", details: err.message });
  }
});

/**
 * GET /setup/all
 * Returns all groups, each with their departments nested.
 */
router.get("/all", async (req, res) => {
  try {
    const groups = await knex("group_master")
      .select("gd_id", "group", "created_by", "created_at")
      .orderBy("created_at", "desc");

    const gdIds = groups.map((g) => g.gd_id);
    const depts = gdIds.length
      ? await knex("department_master")
          .whereIn("gd_id", gdIds)
          .select("gd_id", "id_master", "department", "created_at")
      : [];

    const deptMap = {};
    depts.forEach((d) => {
      if (!deptMap[d.gd_id]) deptMap[d.gd_id] = [];
      deptMap[d.gd_id].push({ id: d.id_master, department: d.department });
    });

    const result = groups.map((g) => ({
      gd_id: g.gd_id,
      group: g.group,
      created_by: g.created_by,
      created_at: g.created_at,
      departments: deptMap[g.gd_id] || [],
    }));

    return res.status(200).json({ message: "success", data: result });
  } catch (err) {
    console.error("Get all groups error:", err);
    return res.status(500).json({ message: "error", details: err.message });
  }
});

/**
 * GET /setup/:gd_id
 * Returns a single group with its departments.
 */
router.get("/:gd_id", async (req, res) => {
  const { gd_id } = req.params;
  try {
    const group = await knex("group_master").where({ gd_id }).first();
    if (!group)
      return res
        .status(404)
        .json({ message: "error", details: "Group not found." });

    const depts = await knex("department_master")
      .where({ gd_id })
      .select("id_master", "department", "created_at");

    return res.status(200).json({
      message: "success",
      data: {
        gd_id: group.gd_id,
        group: group.group,
        created_by: group.created_by,
        created_at: group.created_at,
        departments: depts.map((d) => ({
          id: d.id_master,
          department: d.department,
        })),
      },
    });
  } catch (err) {
    console.error("Get group error:", err);
    return res.status(500).json({ message: "error", details: err.message });
  }
});

/**
 * PUT /setup/update/:gd_id
 * Updates the group name and replaces its departments.
 */
router.put("/update/:gd_id", async (req, res) => {
  const { gd_id } = req.params;
  const { groupName, departments, updated_by } = req.body;

  if (!groupName || !groupName.trim())
    return res
      .status(400)
      .json({ message: "error", details: "Group name is required." });
  if (
    !Array.isArray(departments) ||
    departments.filter((d) => d?.trim()).length === 0
  )
    return res.status(400).json({
      message: "error",
      details: "At least one department is required.",
    });

  const filledDepts = departments.map((d) => d.trim()).filter(Boolean);
  const timestamp = new Date();

  try {
    const result = await knex.transaction(async (trx) => {
      const existing = await trx("group_master").where({ gd_id }).first();
      if (!existing) return null;

      await trx("group_master")
        .where({ gd_id })
        .update({
          group: groupName.trim(),
          updated_by: updated_by || null,
          updated_at: timestamp,
        });

      await trx("department_master").where({ gd_id }).del();
      await trx("department_master").insert(
        filledDepts.map((dept) => ({
          gd_id,
          department: dept,
          created_by: updated_by || null,
          created_at: timestamp,
        })),
      );
      return true;
    });

    if (!result)
      return res
        .status(404)
        .json({ message: "error", details: "Group not found." });

    return res.status(200).json({
      message: "success",
      gd_id,
      groupName: groupName.trim(),
      departments: filledDepts,
    });
  } catch (err) {
    console.error("Update group/department error:", err);
    return res.status(500).json({ message: "error", details: err.message });
  }
});

/**
 * DELETE /setup/delete/:gd_id
 * Deletes a group and all its departments.
 */
router.delete("/delete/:gd_id", async (req, res) => {
  const { gd_id } = req.params;

  try {
    const result = await knex.transaction(async (trx) => {
      const existing = await trx("group_master").where({ gd_id }).first();
      if (!existing) return null;

      await trx("department_master").where({ gd_id }).del();
      await trx("group_master").where({ gd_id }).del();
      return true;
    });

    if (!result)
      return res
        .status(404)
        .json({ message: "error", details: "Group not found." });

    return res.status(200).json({
      message: "success",
      details: `Group ${gd_id} and its departments deleted.`,
    });
  } catch (err) {
    console.error("Delete group/department error:", err);
    return res.status(500).json({ message: "error", details: err.message });
  }
});

/* ════════════════════════════════════════════════════════════════════════
   SECTION PERMISSIONS ROUTES
   — Always exactly 5 rows (one per section). INSERT on first save,
     UPDATE on every save after that.
   ════════════════════════════════════════════════════════════════════════ */

/**
 * POST /setup/permissions/save
 * Upserts all 5 section rows in one call.
 *
 * Body: {
 *   assignments: [
 *     {
 *       section:       string,   // 'sec-1-2'
 *       label:         string,   // 'Section 1 and 2'
 *       departmentIds: number[], // department id_master values
 *       positions:     string[]  // position value strings
 *     },
 *     ...  (one entry per section, up to 5)
 *   ],
 *   saved_by: string
 * }
 */
router.post("/permissions/save", async (req, res) => {
  const { assignments, saved_by } = req.body;

  if (!Array.isArray(assignments) || assignments.length === 0)
    return res
      .status(400)
      .json({ message: "error", details: "assignments array is required." });

  const timestamp = new Date();

  try {
    await knex.transaction(async (trx) => {
      for (const entry of assignments) {
        const { section, label, departmentIds = [], positions = [] } = entry;
        if (!section) continue;

        const deptStr = departmentIds.map(String).join(",");
        const posStr = positions.join(",");

        // Check if this section already has a row
        const existing = await trx("section_permissions")
          .where({ section_key: section })
          .first();

        if (existing) {
          // UPDATE — keep created_by / created_at intact
          await trx("section_permissions")
            .where({ section_key: section })
            .update({
              section_label: label || section,
              department_ids: deptStr || null,
              positions: posStr || null,
              updated_by: saved_by || null,
              updated_at: timestamp,
            });
        } else {
          // INSERT — first time this section is saved
          await trx("section_permissions").insert({
            section_key: section,
            section_label: label || section,
            department_ids: deptStr || null,
            positions: posStr || null,
            created_by: saved_by || null,
            created_at: timestamp,
          });
        }
      }
    });

    return res
      .status(200)
      .json({ message: "success", details: "Section permissions saved." });
  } catch (err) {
    console.error("Save permissions error:", err);
    return res.status(500).json({ message: "error", details: err.message });
  }
});

/**
 * GET /setup/permissions/all
 * Returns all section rows (max 5).
 *
 * Response shape:
 * {
 *   message: 'success',
 *   data: [
 *     {
 *       section_key:   'sec-1-2',
 *       section_label: 'Section 1 and 2',
 *       departmentIds: [3, 4],
 *       positions:     ['supervisor', 'safety-head']
 *     },
 *     ...
 *   ]
 * }
 */
router.get("/permissions/all", async (req, res) => {
  try {
    const rows = await knex("section_permissions")
      .select("section_key", "section_label", "department_ids", "positions")
      .orderBy("section_key");

    const data = rows.map((r) => ({
      section_key: r.section_key,
      section_label: r.section_label,
      departmentIds: r.department_ids
        ? r.department_ids.split(",").filter(Boolean).map(Number)
        : [],
      positions: r.positions ? r.positions.split(",").filter(Boolean) : [],
    }));

    return res.status(200).json({ message: "success", data });
  } catch (err) {
    console.error("Get all permissions error:", err);
    return res.status(500).json({ message: "error", details: err.message });
  }
});

/**
 * GET /setup/permissions/:section_key
 * Returns the single row for one section.
 */
router.get("/permissions/:section_key", async (req, res) => {
  const { section_key } = req.params;

  try {
    const row = await knex("section_permissions")
      .where({ section_key })
      .select("section_key", "section_label", "department_ids", "positions")
      .first();

    if (!row)
      return res.status(404).json({
        message: "error",
        details: "No permissions found for this section.",
      });

    return res.status(200).json({
      message: "success",
      data: {
        section_key: row.section_key,
        section_label: row.section_label,
        departmentIds: row.department_ids
          ? row.department_ids.split(",").filter(Boolean).map(Number)
          : [],
        positions: row.positions
          ? row.positions.split(",").filter(Boolean)
          : [],
      },
    });
  } catch (err) {
    console.error("Get section permissions error:", err);
    return res.status(500).json({ message: "error", details: err.message });
  }
});

/**
 * DELETE /setup/permissions/:section_key
 * Clears the department_ids and positions for a section (keeps the row).
 */
router.delete("/permissions/:section_key", async (req, res) => {
  const { section_key } = req.params;

  try {
    const row = await knex("section_permissions")
      .where({ section_key })
      .first();

    if (!row)
      return res.status(404).json({
        message: "error",
        details: "No permissions found for this section.",
      });

    await knex("section_permissions").where({ section_key }).update({
      department_ids: null,
      positions: null,
      updated_at: new Date(),
    });

    return res.status(200).json({
      message: "success",
      details: `Permissions for ${section_key} cleared.`,
    });
  } catch (err) {
    console.error("Clear section permissions error:", err);
    return res.status(500).json({ message: "error", details: err.message });
  }
});

/* ════════════════════════════════════════════════════════════════════════
   HEAD ASSIGNMENTS ROUTES
   — One row per (gd_id, department_id). INSERT on first save,
     UPDATE on every save after that. group_head is repeated on
     every department row belonging to that group.
   ════════════════════════════════════════════════════════════════════════ */

/**
 * POST /setup/assign-heads
 * Upserts group_head / dept_head / section_head / supervisor
 * for every department in every group, in one request.
 *
 * Body: [
 *   {
 *     gd_id:       string,
 *     group_head:  string | null,
 *     departments: [
 *       {
 *         department_id: number,
 *         dept_head:     string | null,
 *         section_head:  string | null,
 *         supervisor:    string | null,
 *       },
 *       ...
 *     ]
 *   },
 *   ...
 * ]
 *
 * Optional: pass a `saved_by` field on each group object to
 * stamp created_by/updated_by.
 */
router.post("/assign-heads", async (req, res) => {
  const groupsPayload = req.body;

  if (!Array.isArray(groupsPayload) || groupsPayload.length === 0)
    return res
      .status(400)
      .json({
        message: "error",
        details: "Request body must be a non-empty array.",
      });

  const timestamp = new Date();

  try {
    await knex.transaction(async (trx) => {
      for (const groupEntry of groupsPayload) {
        const { gd_id, group_head, departments, saved_by } = groupEntry || {};

        if (!gd_id) continue;
        if (!Array.isArray(departments) || departments.length === 0) continue;

        for (const dept of departments) {
          const { department_id, dept_head, section_head, supervisor } =
            dept || {};
          if (!department_id) continue;

          const existing = await trx("setup_heads")
            .where({ gd_id, department_id })
            .first();

          if (existing) {
            // UPDATE — keep created_by / created_at intact
            await trx("setup_heads")
              .where({ gd_id, department_id })
              .update({
                group_head: group_head || null,
                dept_head: dept_head || null,
                section_head: section_head || null,
                supervisor: supervisor || null,
                updated_by: saved_by || null,
                updated_at: timestamp,
              });
          } else {
            // INSERT — first time this department is saved
            await trx("setup_heads").insert({
              gd_id,
              group_head: group_head || null,
              department_id,
              dept_head: dept_head || null,
              section_head: section_head || null,
              supervisor: supervisor || null,
              created_by: saved_by || null,
              created_at: timestamp,
            });
          }
        }
      }
    });

    return res
      .status(200)
      .json({ message: "success", details: "Head assignments saved." });
  } catch (err) {
    console.error("Save head assignments error:", err);
    return res.status(500).json({ message: "error", details: err.message });
  }
});

/**
 * GET /setup/assign-heads/all
 * Returns every saved assignment row, grouped by gd_id, so the
 * frontend can pre-fill formData on load (it currently doesn't —
 * see note below).
 *
 * Response shape:
 * {
 *   message: 'success',
 *   data: {
 *     'GD-ABC123': {
 *       group_head: 'jdoe',
 *       departments: {
 *         12: { dept_head: 'msmith', section_head: 'rlee', supervisor: 'tking' },
 *         ...
 *       }
 *     },
 *     ...
 *   }
 * }
 */
router.get("/assign-heads/all", async (req, res) => {
  try {
    const rows = await knex("setup_heads").select(
      "gd_id",
      "group_head",
      "department_id",
      "dept_head",
      "section_head",
      "supervisor",
    );

    const data = {};
    rows.forEach((r) => {
      if (!data[r.gd_id]) {
        data[r.gd_id] = { group_head: r.group_head || "", departments: {} };
      }
      data[r.gd_id].departments[r.department_id] = {
        dept_head: r.dept_head || "",
        section_head: r.section_head || "",
        supervisor: r.supervisor || "",
      };
    });

    return res.status(200).json({ message: "success", data });
  } catch (err) {
    console.error("Get head assignments error:", err);
    return res.status(500).json({ message: "error", details: err.message });
  }
});

module.exports = router;
