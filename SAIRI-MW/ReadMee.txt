
SELECT * FROM accident_master
SELECT * FROM accident_section_one_master
SELECT * FROM accident_section_three_master
SELECT * FROM accident_section_four_six_master
SELECT * FROM accident_section_seven_master
SELECT * FROM accident_section_eight_master

SELECT * FROM accident_section_logs_master

TRUNCATE TABLE accident_section_logs_master
TRUNCATE TABLE accident_master;
TRUNCATE TABLE accident_section_one_master
TRUNCATE TABLE accident_section_three_master
TRUNCATE TABLE accident_section_four_six_master
TRUNCATE TABLE accident_section_seven_master
TRUNCATE TABLE accident_section_eight_master

ALTER TABLE accident_section_eight_master
ADD attachment_checklist NVARCHAR(MAX) NULL;
]UPDATE accident_section_one_master
SET accident_incident_subtype = 'Injury'
WHERE id_master = 1;


DELETE FROM accident_master
WHERE id_master = 9;

------------------------------------------------------------------

SELECT * FROM department_master
SELECT * FROM group_master

SELECT * FROM section_permissions
SELECT * FROM users_master

ALTER TABLE accident_master
ADD safety_dh_at VARCHAR(MAX) NULL;


ALTER TABLE accident_section_three_master
ALTER COLUMN files_of_treatment_provided VARCHAR(MAX);
