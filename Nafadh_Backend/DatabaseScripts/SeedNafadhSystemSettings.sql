-- Nafadh system settings for BiddingDB_Training
-- Run against the 1222 database only.
-- Existing settings and their values are preserved.

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

INSERT INTO dbo.SystemVariables
(
    VariableKey,
    VariableName,
    VariableNameEn,
    VariableNameAr,
    ValueType,
    Value,
    Description,
    DescriptionAr,
    CreatedAt,
    UpdatedAt
)
SELECT
    s.VariableKey,
    s.VariableName,
    s.VariableName,
    s.VariableNameAr,
    s.ValueType,
    s.Value,
    s.VariableNameAr,
    s.VariableNameAr,
    SYSUTCDATETIME(),
    SYSUTCDATETIME()
FROM
(
    VALUES
    (N'SiteName', N'Site Name', N'اسم المنصة', N'String', N'نفاذ'),
    (N'SupportEmail', N'Support Email', N'بريد الدعم الفني', N'String', N'support@nafadh.om'),
    (N'DefaultCapacity', N'Default Capacity', N'الطاقة الاستيعابية الافتراضية', N'Integer', N'50'),
    (N'AttendanceGraceMinutes', N'Attendance Grace Minutes', N'فترة السماح بالتأخير', N'Integer', N'15'),
    (N'CertificateAutoIssue', N'Automatic Certificate Issuance', N'إصدار الشهادات تلقائيًا', N'Boolean', N'false'),
    (N'MaintenanceMode', N'Maintenance Mode', N'وضع الصيانة', N'Boolean', N'false'),
    (N'MinPasswordLength', N'Minimum Password Length', N'الحد الأدنى لطول كلمة المرور', N'Integer', N'8'),
    (N'SessionTimeoutMinutes', N'Session Timeout Minutes', N'مهلة انتهاء الجلسة', N'Integer', N'60'),
    (N'MaxUploadSizeMB', N'Maximum Upload Size (MB)', N'الحد الأقصى لحجم الملفات', N'Integer', N'25'),
    (N'AcademicYear', N'Academic Year', N'السنة الأكاديمية', N'Integer', N'2026')
) AS s (VariableKey, VariableName, VariableNameAr, ValueType, Value)
WHERE NOT EXISTS
(
    SELECT 1
    FROM dbo.SystemVariables AS existing WITH (UPDLOCK, HOLDLOCK)
    WHERE existing.VariableKey = s.VariableKey
);

COMMIT TRANSACTION;
