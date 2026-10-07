var express = require('express');
var bcrypt = require('bcrypt');
const router = express.Router();
var Sequelize = require('sequelize');
const { DataTypes } = Sequelize;
require('dotenv').config();

var knex = require("knex")({
    client: 'mssql',
    connection: {
        user: process.env.USER,
        password: process.env.PASSWORD,
        server: process.env.SERVER,
        database: process.env.DATABASE,
        port: parseInt(process.env.APP_SERVER_PORT),
        options: {
            enableArithAbort: true,

        }
    },
});

var db = new Sequelize(process.env.DATABASE, process.env.USER, process.env.PASSWORD, {
    host: process.env.SERVER,
    dialect: "mssql",
    port: parseInt(process.env.APP_SERVER_PORT),
});

const SICKLEAVE = db.define('sickleave_master', {
    id_master: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    sl_id: {
        type: DataTypes.STRING
    },
    employee_id: {
        type: DataTypes.STRING
    },
    department: {
        type: DataTypes.STRING
    },
    date_sick_leave: {
        type: DataTypes.STRING
    },
    date_discharge: {
        type: DataTypes.STRING
    },
    date_fit_to_work: {
        type: DataTypes.STRING
    },
    type_sick_leave: {
        type: DataTypes.STRING
    },
    diagnosis: {
        type: DataTypes.STRING
    },
    remarks: {
        type: DataTypes.STRING
    },
    shift: {
        type: DataTypes.STRING
    },
    is_cancelled: {
        type: DataTypes.STRING
    },
    is_late: {
        type: DataTypes.STRING
    },
    created_by: {
        type: DataTypes.STRING
    },
    created_at: {
        type: DataTypes.STRING
    },
    updated_by: {
        type: DataTypes.STRING
    },
    updated_at: {
        type: DataTypes.STRING
    },
    is_active: {
        type: DataTypes.STRING
    },
    is_SSS: {
        type: DataTypes.STRING
    },
    is_discharge: {
        type: DataTypes.STRING
    },
    is_extension: {
        type: DataTypes.STRING
    }
}, {
    freezeTableName: false,
    timestamps: false,
    createdAt: false,
    updatedAt: false,
    tableName: 'sickleave_master'
});

const EMPLOYEE = db.define('employee_master', {
    id_master: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    employee_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    full_name: {
        type: DataTypes.STRING
    },
    department: {
        type: DataTypes.STRING
    },
    chapa: {
        type: DataTypes.STRING
    },
    shift: {
        type: DataTypes.STRING
    },
    is_active: {
        type: DataTypes.STRING
    },
    created_by: {
        type: DataTypes.STRING
    },
    created_at: {
        type: DataTypes.STRING
    },
    updated_by: {
        type: DataTypes.STRING
    },
    updated_at: {
        type: DataTypes.STRING
    },
}, {
    freezeTableName: false,
    timestamps: false,
    createdAt: false,
    updatedAt: false,
    tableName: 'employee_master'
});


// NEW: extension_master model
const EXTENSION = db.define('extension_master', {
    id_master: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sl_id: {
        type: DataTypes.STRING
    },
    date_extension: {
        type: DataTypes.STRING
    },
    is_SSS_extention: {
        type: DataTypes.STRING
    },
    created_by: {
        type: DataTypes.STRING
    },
    created_at: {
        type: DataTypes.STRING
    },
    updated_by: {
        type: DataTypes.STRING
    },
    updated_at: {
        type: DataTypes.STRING
    },
}, {
    freezeTableName: false,
    timestamps: false,
    createdAt: false,
    updatedAt: false,
    tableName: 'extension_master'
});


//Unique ID Generation

function generateEmpId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `emp${randomPart}`;
}

function generateSickLeaveId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SL${randomPart}`;
}

// EMPLOYEE SECTION-----------------------------------------------------------------------------------

router.get('/get-all-employee', async (req, res) => {
    try {
        const fetch = await knex('employee_master').select('*').orderBy('full_name', 'asc');
        res.json(fetch);
    } catch (err) {
        console.log('Unable to fetch all employee:', err);
        res.status(500).json({ error: 'Unable to fetch employees.' });
    }
});

router.get('/get-employee-by-id', async (req, res) => {
    try {
        const getById = await EMPLOYEE.findAll({
            where: {
                employee_id: req.query.employee_id
            }
        })
        res.json(getById[0]);
    } catch (err) {
        console.log('Unable to get data: ', err)
    }
})

router.post('/add-employee', async (req, res) => {
    const currentTimestamp = new Date();
    const { full_name, department_id, chapa, shift, created_by } = req.body;

    if (!full_name || !full_name.trim()) {
        return res.status(400).json({ error: 'full_name is required.' });
    }
    if (!department_id) {
        return res.status(400).json({ error: 'department_id is required.' });
    }
    if (!chapa || !chapa.trim()) {
        return res.status(400).json({ error: 'chapa is required.' });
    }
    if (!shift || !shift.trim()) {
        return res.status(400).json({ error: 'shift is required.' });
    }

    try {
        // Check if chapa already exists
        const existingChapa = await knex('employee_master')
            .where('chapa', chapa.trim())
            .first();

        if (existingChapa) {
            return res.status(400).json({ error: 'Chapa already exists. Please use a unique chapa.' });
        }

        const existingIds = await knex('employee_master').pluck('employee_id');
        const existingIdSet = new Set(existingIds);

        let employee_id;
        let attempts = 0;
        do {
            employee_id = generateEmpId();
            attempts++;
            if (attempts > 10) {
                return res.status(500).json({ error: 'Failed to generate a unique Employee ID.' });
            }
        } while (existingIdSet.has(employee_id));

        await knex('employee_master').insert({
            employee_id,
            full_name: full_name.trim(),
            department: department_id,
            chapa: chapa.trim(),
            shift: shift,
            created_by,
            created_at: currentTimestamp,
            is_active: '1'
        });

        res.status(200).json({ message: 'Employee added successfully', employee_id });

    } catch (err) {
        console.log('Unable to save EMPLOYEE: ', err);
        res.status(500).json({ error: 'Unable to add employee', details: err.message });
    }
});

router.put('/update-employee/:id', async (req, res) => {
    const currentTimestamp = new Date();
    const { id } = req.params;
    const { full_name, department_id, chapa, shift, updated_by } = req.body;

    if (!chapa || !chapa.trim()) {
        return res.status(400).json({ error: 'chapa is required.' });
    }

    try {
        // Check if chapa already exists for another employee
        const existingChapa = await knex('employee_master')
            .where('chapa', chapa.trim())
            .whereNot('employee_id', id)
            .first();

        if (existingChapa) {
            return res.status(400).json({ error: 'Chapa already exists. Please use a unique chapa.' });
        }

        const updated = await knex('employee_master')
            .where('employee_id', id)
            .update({
                full_name,
                department: department_id,
                chapa: chapa.trim(),
                shift,
                updated_by,
                updated_at: currentTimestamp,
            });

        if (updated === 0) {
            return res.status(404).json({ error: 'Employee not found.' });
        }

        res.status(200).json({ message: 'Employee updated successfully.' });
    } catch (err) {
        console.log('Unable to update employee:', err);
        res.status(500).json({ error: 'Unable to update employee.', details: err.message });
    }
});

// SICK LEAVE SECTION ----------------------------------------------------------------------------------

router.post('/add-sick-leave', async (req, res) => {
    const currentTimestamp = new Date();
    const {
        employee,
        department,
        date_sick_leave,
        date_discharge,
        date_fit_to_work,
        type_sick_leave,
        diagnosis,
        is_late,
        remarks,
        shift,
        created_by
    } = req.body;

    if (!employee) return res.status(400).json({ error: 'employee is required.' });
    if (!department) return res.status(400).json({ error: 'department is required.' });
    if (!date_sick_leave) return res.status(400).json({ error: 'date_sick_leave is required.' });
    if (!date_discharge) return res.status(400).json({ error: 'date_discharge is required.' });
    if (!date_fit_to_work) return res.status(400).json({ error: 'date_fit_to_work is required.' });
    if (!type_sick_leave) return res.status(400).json({ error: 'type_sick_leave is required.' });

    try {
        const existingIds = await knex('sickleave_master').pluck('sl_id');
        const existingIdSet = new Set(existingIds);

        let sl_id;
        let attempts = 0;
        do {
            sl_id = generateSickLeaveId();
            attempts++;
            if (attempts > 10) {
                return res.status(500).json({ error: 'Failed to generate a unique Sick Leave ID.' });
            }
        } while (existingIdSet.has(sl_id));

        await knex('sickleave_master').insert({
            sl_id,
            employee_id: employee,
            department,
            date_sick_leave,
            date_discharge,
            date_fit_to_work,
            type_sick_leave,
            diagnosis: diagnosis || '',
            remarks,
            is_late: is_late === 'Late' ? '1' : '0',
            shift,
            is_active: 1,
            created_by,
            created_at: currentTimestamp,
        });

        res.status(200).json({ message: 'Sick leave submitted successfully.', sl_id });

    } catch (err) {
        console.log('Unable to submit sick leave:', err);
        res.status(500).json({ error: 'Unable to submit sick leave.', details: err.message });
    }
});

router.get('/get-all-sl', async (req, res) => {
    try {
        const data = await knex('sickleave_master').select('*');
        res.json(data);
    } catch (err) {
        console.log('Unable to get All Sick Leave: ', err)
    }
})

router.get('/get-sl-by-id', async (req, res) => {

    try {
        const getById = await SICKLEAVE.findAll({
            where: {
                sl_id: req.query.sl_id
            }
        })
        res.json(getById[0]);

    } catch (err) {
        console.log('Unable to get data: ', err)
    }

});

router.post('/update-by-id-discharge', async (req, res) => {

    const currentTimestamp = new Date();
    const { sl_id, updated_by, is_discharge } = req.body;

    try {
        await knex('sickleave_master').where('sl_id', sl_id).update({
            is_discharge,
            updated_by,
            updated_at: currentTimestamp
        });

        res.status(200).json({ message: 'Updated successfully' });
    } catch (err) {
        console.log('Unable to update data: ', err)
    }
})

router.put('/update-sl-by-id', async (req, res) => {
    const currentTimestamp = new Date();
    const {
        sl_id,
        type_sick_leave,
        is_discharge,
        is_cancelled,
        is_SSS,
        updated_by,
        remarks,
        is_late,
        is_extension,
        date_discharge,      // ← add this
        date_fit_to_work     // ← add this
    } = req.body;

    if (!sl_id) return res.status(400).json({ error: 'sl_id is required.' });

    try {
        const updatePayload = {
            type_sick_leave,
            is_discharge: is_discharge === 'Discharged' ? '1' : '0',
            is_SSS: is_SSS === 'Filled' ? '1' : '0',
            is_cancelled,
            remarks,
            is_late: is_late === 'Late' ? '1' : '0',
            date_discharge,
            date_fit_to_work,
            updated_by,
            updated_at: currentTimestamp,
        };

        // Only touch is_extension if it was explicitly passed in
        if (typeof is_extension !== 'undefined') {
            updatePayload.is_extension = is_extension ? '1' : '0';
        }
        console.log(updatePayload)
        await knex('sickleave_master').where('sl_id', sl_id).update(updatePayload);

        res.status(200).json({ message: 'Sick leave updated successfully.' });
    } catch (err) {
        console.log('Unable to update sick leave:', err);
        res.status(500).json({ error: 'Unable to update.', details: err.message });
    }
});

router.put('/update-cancel-sl-by-id', async (req, res) => {
    try {
        const { sl_id, is_cancelled, updated_by } = req.body;
        const currentTimestamp = new Date();

        await knex('sickleave_master').where('sl_id', sl_id).update({
            is_cancelled,
            updated_at: currentTimestamp,
            updated_by
        });

        res.status(200).json({ message: 'Sick leave updated successfully.' });


    } catch (err) {
        console.log('Unable to save cancle SL: ', err)
    }
})

// EXTENSION SECTION -------------------------------------------------------------------------------


router.get('/get-extensions-by-sl-id', async (req, res) => {
    try {
        const { sl_id } = req.query;
        if (!sl_id) return res.status(400).json({ error: 'sl_id is required.' });

        const data = await knex('extension_master')
            .where('sl_id', sl_id)
            .orderBy('id_master', 'asc');

        res.json(data);
    } catch (err) {
        console.log('Unable to get extensions:', err);
        res.status(500).json({ error: 'Unable to get extensions.', details: err.message });
    }
});

router.post('/add-extension', async (req, res) => {
    const currentTimestamp = new Date();
    const { sl_id, date_extension, is_SSS_extention, created_by } = req.body;

    if (!sl_id) return res.status(400).json({ error: 'sl_id is required.' });
    if (!date_extension) return res.status(400).json({ error: 'date_extension is required.' });

    try {
        const [id_master] = await knex('extension_master').insert({
            sl_id,
            date_extension,
            is_SSS_extention: is_SSS_extention === 'Filled' ? '1' : '0',
            created_by,
            created_at: currentTimestamp,
        });

        // Mark parent sick leave as having an extension
        await knex('sickleave_master').where('sl_id', sl_id).update({
            is_extension: '1',
            updated_by: created_by,
            updated_at: currentTimestamp,
        });

        res.status(200).json({ message: 'Extension added successfully.', id_master });
    } catch (err) {
        console.log('Unable to add extension:', err);
        res.status(500).json({ error: 'Unable to add extension.', details: err.message });
    }
});

router.put('/update-extension/:id', async (req, res) => {
    const currentTimestamp = new Date();
    const { id } = req.params;
    const { date_extension, is_SSS_extention, updated_by } = req.body;

    try {
        const updated = await knex('extension_master')
            .where('id_master', id)
            .update({
                date_extension,
                is_SSS_extention: is_SSS_extention === 'Filled' ? '1' : '0',
                updated_by,
                updated_at: currentTimestamp,
            });

        if (updated === 0) {
            return res.status(404).json({ error: 'Extension not found.' });
        }

        res.status(200).json({ message: 'Extension updated successfully.' });
    } catch (err) {
        console.log('Unable to update extension:', err);
        res.status(500).json({ error: 'Unable to update extension.', details: err.message });
    }
});

router.delete('/delete-extension/:id', async (req, res) => {
    const { id } = req.params;
    const { sl_id } = req.query;

    try {
        const deleted = await knex('extension_master').where('id_master', id).del();

        if (deleted === 0) {
            return res.status(404).json({ error: 'Extension not found.' });
        }

        // If no extensions remain for this sl_id, unset is_extension on parent
        if (sl_id) {
            const remaining = await knex('extension_master').where('sl_id', sl_id).count('id_master as count').first();
            if (!remaining || Number(remaining.count) === 0) {
                await knex('sickleave_master').where('sl_id', sl_id).update({ is_extension: '0' });
            }
        }

        res.status(200).json({ message: 'Extension deleted successfully.' });
    } catch (err) {
        console.log('Unable to delete extension:', err);
        res.status(500).json({ error: 'Unable to delete extension.', details: err.message });
    }
});

module.exports = router;