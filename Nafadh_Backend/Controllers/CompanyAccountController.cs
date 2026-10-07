#nullable enable

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "CompanySupervisor")]
    public class CompanyAccountController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public CompanyAccountController(Nafadhcontext context)
        {
            _context = context;
        }

        // =========================================================
        // GET: api/CompanyAccount/me
        // =========================================================
        [HttpGet("me")]
        [ProducesResponseType(typeof(CompanyAccountDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<CompanyAccountDto>> GetCurrentAccount()
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                return Unauthorized();

            var supervisor = await _context.NFD_CompanySupervisors
                .AsNoTracking()
                .Include(s => s.User)
                    .ThenInclude(u => u.Role)
                        .ThenInclude(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission)
                .Include(s => s.Company)
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (supervisor is null ||
                supervisor.User is null ||
                supervisor.Company is null)
            {
                return NotFound(new
                {
                    message =
                        "Company supervisor profile was not found for the authenticated user."
                });
            }

            var logs = await _context.NFD_AuditLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.Timestamp)
                .Take(5)
                .Select(x => new CompanyAccountActivityDto
                {
                    LogId = x.LogId,
                    Action = x.Action,
                    EntityName = x.EntityName,
                    EntityId = x.EntityId,
                    Details = x.Details,
                    Timestamp = x.Timestamp
                })
                .ToListAsync();

            var permissions = supervisor.User.Role?.RolePermissions
                .Select(rp => rp.Permission)
                .Where(p => p != null)
                .GroupBy(p => p!.PermissionId)
                .Select(g => g.First()!)
                .OrderBy(p => p.PermissionKey)
                .Select(p => new CompanyAccountPermissionDto
                {
                    PermissionId = p.PermissionId,
                    PermissionKey = p.PermissionKey,
                    Description = p.Description
                })
                .ToList()
                ?? new List<CompanyAccountPermissionDto>();

            var dto = new CompanyAccountDto
            {
                UserId = supervisor.User.UserId,
                FullName = supervisor.User.FullName,
                Email = supervisor.User.Email,
                Phone = supervisor.User.Phone,
                UserStatus = supervisor.User.Status.ToString(),
                CreatedAt = supervisor.User.CreatedAt,

                SupervisorId = supervisor.SupervisorId,
                CompanyId = supervisor.CompanyId,
                Department = supervisor.Department,
                Position = supervisor.Position,
                SupervisorStatus = supervisor.Status.ToString(),

                CompanyName = supervisor.Company.CompanyName,
                CompanyStatus = supervisor.Company.Status.ToString(),

                RoleName =
                    supervisor.User.Role?.RoleName
                    ?? string.Empty,

                Permissions = permissions,
                RecentActivities = logs,

                LastActivityAt =
                    logs.Count > 0
                        ? logs[0].Timestamp
                        : null
            };

            return Ok(dto);
        }


        // =========================================================
        // GET: api/CompanyAccount/me/export-pdf
        // =========================================================
        [HttpGet("me/export-pdf")]
        [Produces("application/pdf")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ExportMyAccountPdf()
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                return Unauthorized();

            var supervisor = await _context.NFD_CompanySupervisors
                .AsNoTracking()
                .Include(s => s.User)
                    .ThenInclude(u => u.Role)
                        .ThenInclude(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission)
                .Include(s => s.Company)
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (supervisor is null ||
                supervisor.User is null ||
                supervisor.Company is null)
            {
                return NotFound(new
                {
                    message =
                        "Company supervisor profile was not found for the authenticated user."
                });
            }

            // =====================================================
            // Activities
            // =====================================================

            var logs = await _context.NFD_AuditLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.Timestamp)
                .Take(5)
                .Select(x => new CompanyAccountActivityDto
                {
                    LogId = x.LogId,
                    Action = x.Action,
                    EntityName = x.EntityName,
                    EntityId = x.EntityId,
                    Details = x.Details,
                    Timestamp = x.Timestamp
                })
                .ToListAsync();

            // =====================================================
            // Permissions
            // =====================================================

            var permissions = supervisor.User.Role?.RolePermissions
                .Select(rp => rp.Permission)
                .Where(p => p != null)
                .GroupBy(p => p!.PermissionId)
                .Select(g => g.First()!)
                .OrderBy(p => p.PermissionKey)
                .Select(p => new CompanyAccountPermissionDto
                {
                    PermissionId = p.PermissionId,
                    PermissionKey = p.PermissionKey,
                    Description = p.Description
                })
                .ToList()
                ?? new List<CompanyAccountPermissionDto>();

            // =====================================================
            // Account DTO
            // =====================================================

            var account = new CompanyAccountDto
            {
                UserId = supervisor.User.UserId,
                FullName = supervisor.User.FullName,
                Email = supervisor.User.Email,
                Phone = supervisor.User.Phone,
                UserStatus = supervisor.User.Status.ToString(),
                CreatedAt = supervisor.User.CreatedAt,

                SupervisorId = supervisor.SupervisorId,
                CompanyId = supervisor.CompanyId,
                Department = supervisor.Department,
                Position = supervisor.Position,
                SupervisorStatus = supervisor.Status.ToString(),

                CompanyName = supervisor.Company.CompanyName,
                CompanyStatus = supervisor.Company.Status.ToString(),

                RoleName =
                    supervisor.User.Role?.RoleName
                    ?? string.Empty,

                Permissions = permissions,
                RecentActivities = logs,

                LastActivityAt =
                    logs.Count > 0
                        ? logs[0].Timestamp
                        : null
            };

            // =====================================================
            // QuestPDF
            // =====================================================

            QuestPDF.Settings.UseSystemFonts = true;

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    // -------------------------------------------------
                    // Page
                    // -------------------------------------------------

                    page.Size(PageSizes.A4);

                    page.MarginHorizontal(35);
                    page.MarginVertical(30);

                    page.ContentFromRightToLeft();

                    page.DefaultTextStyle(
                        x => x
                            .FontFamily("Arial")
                            .FontSize(10)
                            .FontColor("#1F2937")
                    );

                    // -------------------------------------------------
                    // Header
                    // -------------------------------------------------

                    page.Header()
                        .Column(header =>
                        {
                            header.Item()
                                .Background("#0A1172")
                                .PaddingVertical(18)
                                .PaddingHorizontal(20)
                                .Row(row =>
                                {
                                    row.RelativeItem()
                                        .Column(col =>
                                        {
                                            col.Item()
                                                .AlignRight()
                                                .Text("NAFADH")
                                                .FontFamily("Arial")
                                                .FontSize(12)
                                                .Bold()
                                                .FontColor(Colors.White);

                                            col.Item()
                                                .PaddingTop(4)
                                                .AlignRight()
                                                .Text("الملف الشخصي للمستخدم")
                                                .FontSize(21)
                                                .Bold()
                                                .FontColor(Colors.White);

                                            col.Item()
                                                .PaddingTop(4)
                                                .AlignRight()
                                                .Text("بيانات الحساب والصلاحيات وسجل النشاطات")
                                                .FontSize(9)
                                                .FontColor("#E0E7FF");
                                        });
                                });

                            header.Item()
                                .Height(5)
                                .Background("#2563EB");
                        });

                    // -------------------------------------------------
                    // Footer
                    // -------------------------------------------------

                    page.Footer()
                        .PaddingTop(10)
                        .BorderTop(1)
                        .BorderColor("#E5E7EB")
                        .Row(row =>
                        {
                            row.RelativeItem()
                                .Text("Nafadh Management System")
                                .FontSize(8)
                                .FontColor("#6B7280");

                            row.RelativeItem()
                                .AlignLeft()
                                .Text(text =>
                                {
                                    text.Span("تاريخ التقرير: ")
                                        .FontSize(8)
                                        .FontColor("#6B7280");

                                    text.Span(DateTime.Now.ToString("yyyy-MM-dd"))
                                        .FontSize(8)
                                        .Bold()
                                        .FontColor("#374151");
                                });
                        });

                    // =================================================
                    // Main Content
                    // =================================================

                    page.Content()
                        .PaddingTop(20)
                        .Column(column =>
                        {
                            // =================================================
                            // Profile Hero
                            // =================================================

                            column.Item()
                                .Background("#F1F5FF")
                                .Border(1)
                                .BorderColor("#D9E2FF")
                                .CornerRadius(10)
                                .Padding(16)
                                .Row(row =>
                                {
                                    row.ConstantItem(55)
                                        .Height(55)
                                        .Background("#2563EB")
                                        .CornerRadius(28)
                                        .AlignCenter()
                                        .AlignMiddle()
                                        .Text(
                                            GetInitial(account.FullName)
                                        )
                                        .FontSize(24)
                                        .Bold()
                                        .FontColor(Colors.White);

                                    row.RelativeItem()
                                        .PaddingRight(14)
                                        .Column(col =>
                                        {
                                            col.Item()
                                                .AlignRight()
                                                .Text(account.FullName)
                                                .FontSize(18)
                                                .Bold()
                                                .FontColor("#111827");

                                            col.Item()
                                                .PaddingTop(3)
                                                .AlignRight()
                                                .Text(
                                                    string.IsNullOrWhiteSpace(account.Position)
                                                        ? "غير محدد"
                                                        : account.Position
                                                )
                                                .FontSize(10)
                                                .FontColor("#475569");

                                            col.Item()
                                                .PaddingTop(5)
                                                .AlignRight()
                                                .Text(account.CompanyName)
                                                .FontSize(9)
                                                .Bold()
                                                .FontColor("#2563EB");
                                        });
                                });

                            column.Item()
                                .PaddingTop(18);

                            // =================================================
                            // Section: Personal Information
                            // =================================================

                            AddSectionTitle(
                                column,
                                "البيانات الشخصية",
                                "المعلومات الأساسية للحساب"
                            );

                            column.Item()
                                .PaddingTop(8)
                                .Table(table =>
                                {
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.RelativeColumn();
                                        columns.RelativeColumn();
                                    });

                                    AddInfoCard(
                                        table,
                                        "الاسم الكامل",
                                        account.FullName
                                    );

                                    AddInfoCard(
                                        table,
                                        "البريد الإلكتروني",
                                        account.Email
                                    );

                                    AddInfoCard(
                                        table,
                                        "رقم الجوال",
                                        account.Phone ?? "غير متوفر"
                                    );

                                    AddInfoCard(
                                        table,
                                        "المسمى الوظيفي",
                                        account.Position ?? "غير محدد"
                                    );

                                    AddInfoCard(
                                        table,
                                        "القسم",
                                        account.Department ?? "غير محدد"
                                    );

                                    AddInfoCard(
                                        table,
                                        "الجهة / الشركة",
                                        account.CompanyName
                                    );

                                    AddInfoCard(
                                        table,
                                        "الدور الوظيفي",
                                        account.RoleName
                                    );

                                    AddInfoCard(
                                        table,
                                        "رقم المشرف",
                                        account.SupervisorId.ToString()
                                    );
                                });

                            // =================================================
                            // Account Status
                            // =================================================

                            column.Item()
                                .PaddingTop(15);

                            AddSectionTitle(
                                column,
                                "حالة الحساب",
                                "الحالات الحالية للحساب والمشرف والشركة"
                            );

                            column.Item()
                                .PaddingTop(8)
                                .Row(row =>
                                {
                                    AddStatusCard(
                                        row,
                                        "حالة الحساب",
                                        account.UserStatus,
                                        GetStatusColor(account.UserStatus)
                                    );

                                    AddStatusCard(
                                        row,
                                        "حالة المشرف",
                                        account.SupervisorStatus,
                                        GetStatusColor(account.SupervisorStatus)
                                    );

                                    AddStatusCard(
                                        row,
                                        "حالة الشركة",
                                        account.CompanyStatus,
                                        GetStatusColor(account.CompanyStatus)
                                    );
                                });

                            // =================================================
                            // Dates
                            // =================================================

                            column.Item()
                                .PaddingTop(15);

                            column.Item()
                                .Background("#F8FAFC")
                                .Border(1)
                                .BorderColor("#E2E8F0")
                                .CornerRadius(8)
                                .Padding(12)
                                .Row(row =>
                                {
                                    row.RelativeItem()
                                        .Column(col =>
                                        {
                                            col.Item()
                                                .AlignRight()
                                                .Text("تاريخ إنشاء الحساب")
                                                .FontSize(8)
                                                .FontColor("#64748B");

                                            col.Item()
                                                .PaddingTop(3)
                                                .AlignRight()
                                                .Text(
                                                    account.CreatedAt.ToString(
                                                        "yyyy-MM-dd HH:mm"
                                                    )
                                                )
                                                .FontSize(10)
                                                .Bold()
                                                .FontColor("#1E293B");
                                        });

                                    row.ConstantItem(1)
                                        .Height(35)
                                        .Background("#CBD5E1");

                                    row.RelativeItem()
                                        .PaddingRight(15)
                                        .Column(col =>
                                        {
                                            col.Item()
                                                .AlignRight()
                                                .Text("آخر نشاط مسجل")
                                                .FontSize(8)
                                                .FontColor("#64748B");

                                            col.Item()
                                                .PaddingTop(3)
                                                .AlignRight()
                                                .Text(
                                                    account.LastActivityAt?.ToString(
                                                        "yyyy-MM-dd HH:mm"
                                                    )
                                                    ?? "غير متوفر"
                                                )
                                                .FontSize(10)
                                                .Bold()
                                                .FontColor("#1E293B");
                                        });
                                });

                            // =================================================
                            // Permissions
                            // =================================================

                            column.Item()
                                .PaddingTop(18);

                            AddSectionTitle(
                                column,
                                "الصلاحيات الممنوحة",
                                $"{account.Permissions.Count} صلاحية مفعّلة"
                            );

                            column.Item()
                                .PaddingTop(8);

                            if (account.Permissions.Count > 0)
                            {
                                foreach (var permission in account.Permissions)
                                {
                                    column.Item()
                                        .PaddingBottom(7)
                                        .Background("#F8FAFC")
                                        .Border(1)
                                        .BorderColor("#E2E8F0")
                                        .CornerRadius(7)
                                        .Padding(10)
                                        .Row(row =>
                                        {
                                            row.ConstantItem(28)
                                                .Height(28)
                                                .Background("#E0EAFF")
                                                .CornerRadius(14)
                                                .AlignCenter()
                                                .AlignMiddle()
                                                .Text("✓")
                                                .FontSize(12)
                                                .Bold()
                                                .FontColor("#2563EB");

                                            row.RelativeItem()
                                                .PaddingRight(10)
                                                .Column(col =>
                                                {
                                                    col.Item()
                                                        .AlignRight()
                                                        .Text(
                                                            permission.PermissionKey
                                                        )
                                                        .FontSize(10)
                                                        .Bold()
                                                        .FontColor("#1E3A8A");

                                                    col.Item()
                                                        .PaddingTop(2)
                                                        .AlignRight()
                                                        .Text(
                                                            string.IsNullOrWhiteSpace(
                                                                permission.Description
                                                            )
                                                                ? "لا يوجد وصف للصلاحية"
                                                                : permission.Description
                                                        )
                                                        .FontSize(8)
                                                        .FontColor("#64748B");
                                                });
                                        });
                                }
                            }
                            else
                            {
                                column.Item()
                                    .Background("#F8FAFC")
                                    .CornerRadius(7)
                                    .Padding(12)
                                    .AlignCenter()
                                    .Text("لا توجد صلاحيات مسجلة لهذا الحساب.")
                                    .FontColor("#64748B");
                            }

                            // =================================================
                            // Activities
                            // =================================================

                            column.Item()
                                .PaddingTop(18);

                            AddSectionTitle(
                                column,
                                "سجل النشاطات",
                                "آخر الأنشطة المسجلة للحساب"
                            );

                            column.Item()
                                .PaddingTop(8);

                            if (account.RecentActivities.Count > 0)
                            {
                                foreach (var activity in account.RecentActivities)
                                {
                                    column.Item()
                                        .PaddingBottom(7)
                                        .Background("#FFFFFF")
                                        .BorderLeft(3)
                                        .BorderColor("#2563EB")
                                        .Border(1)
                                        .BorderColor("#E5E7EB")
                                        .Padding(10)
                                        .Column(col =>
                                        {
                                            col.Item()
                                                .AlignRight()
                                                .Text(activity.Action)
                                                .FontSize(10)
                                                .Bold()
                                                .FontColor("#1E3A8A");

                                            col.Item()
                                                .PaddingTop(3)
                                                .AlignRight()
                                                .Text(text =>
                                                {
                                                    text.Span(
                                                        activity.EntityName
                                                    )
                                                    .FontSize(8)
                                                    .FontColor("#475569");

                                                    if (activity.EntityId != 0)
                                                    {
                                                        text.Span(
                                                            $"  •  رقم: {activity.EntityId}"
                                                        )
                                                        .FontSize(8)
                                                        .FontColor("#64748B");
                                                    }
                                                });

                                            if (!string.IsNullOrWhiteSpace(
                                                activity.Details))
                                            {
                                                col.Item()
                                                    .PaddingTop(2)
                                                    .AlignRight()
                                                    .Text(activity.Details)
                                                    .FontSize(8)
                                                    .FontColor("#64748B");
                                            }

                                            col.Item()
                                                .PaddingTop(3)
                                                .AlignRight()
                                                .Text(
                                                    activity.Timestamp.ToString(
                                                        "yyyy-MM-dd HH:mm"
                                                    )
                                                )
                                                .FontSize(7)
                                                .FontColor("#94A3B8");
                                        });
                                }
                            }
                            else
                            {
                                column.Item()
                                    .Background("#F8FAFC")
                                    .CornerRadius(7)
                                    .Padding(12)
                                    .AlignCenter()
                                    .Text("لا توجد نشاطات مسجلة لهذا الحساب.")
                                    .FontColor("#64748B");
                            }
                        });
                });
            });

            var pdfBytes = document.GeneratePdf();

            var fileName =
                $"حساب_{account.FullName}_{DateTime.Now:yyyy-MM-dd}.pdf";

            return File(
                pdfBytes,
                "application/pdf",
                fileName
            );
        }


        // =========================================================
        // Helper: Section Title
        // =========================================================

        private static void AddSectionTitle(
            ColumnDescriptor column,
            string title,
            string subtitle)
        {
            column.Item()
                .Row(row =>
                {
                    row.ConstantItem(5)
                        .Height(30)
                        .Background("#2563EB")
                        .CornerRadius(3);

                    row.RelativeItem()
                        .PaddingRight(10)
                        .Column(col =>
                        {
                            col.Item()
                                .AlignRight()
                                .Text(title)
                                .FontSize(14)
                                .Bold()
                                .FontColor("#0F172A");

                            col.Item()
                                .PaddingTop(2)
                                .AlignRight()
                                .Text(subtitle)
                                .FontSize(7)
                                .FontColor("#64748B");
                        });
                });
        }


        // =========================================================
        // Helper: Information Card
        // =========================================================

        private static void AddInfoCard(
            TableDescriptor table,
            string label,
            string value)
        {
            table.Cell()
                .Padding(4)
                .Background("#F8FAFC")
                .Border(1)
                .BorderColor("#E2E8F0")
                .CornerRadius(7)
                .Padding(10)
                .Column(column =>
                {
                    column.Item()
                        .AlignRight()
                        .Text(label)
                        .FontSize(7)
                        .FontColor("#64748B");

                    column.Item()
                        .PaddingTop(4)
                        .AlignRight()
                        .Text(string.IsNullOrWhiteSpace(value)
                            ? "غير متوفر"
                            : value)
                        .FontSize(9)
                        .Bold()
                        .FontColor("#1E293B");
                });
        }


        // =========================================================
        // Helper: Status Card
        // =========================================================

        private static void AddStatusCard(
            RowDescriptor row,
            string label,
            string value,
            string color)
        {
            row.RelativeItem()
                .Padding(4)
                .Background("#F8FAFC")
                .Border(1)
                .BorderColor("#E2E8F0")
                .CornerRadius(8)
                .Padding(10)
                .Column(column =>
                {
                    column.Item()
                        .AlignRight()
                        .Text(label)
                        .FontSize(7)
                        .FontColor("#64748B");

                    column.Item()
                        .PaddingTop(5)
                        .AlignRight()
                        .Text(text =>
                        {
                            text.Span("● ")
                                .FontSize(9)
                                .Bold()
                                .FontColor(color);

                            text.Span(
                                string.IsNullOrWhiteSpace(value)
                                    ? "غير محدد"
                                    : value
                            )
                            .FontSize(9)
                            .Bold()
                            .FontColor("#1E293B");
                        });
                });
        }


        // =========================================================
        // Helper: Initial
        // =========================================================

        private static string GetInitial(string? name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return "م";

            return name.Trim().Substring(0, 1);
        }


        // =========================================================
        // Helper: Status Color
        // =========================================================

        private static string GetStatusColor(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return "#64748B";

            var value = status.Trim().ToLowerInvariant();

            if (value.Contains("active") ||
                value.Contains("approved") ||
                value.Contains("مفعل") ||
                value.Contains("نشط") ||
                value.Contains("معتمد"))
            {
                return "#16A34A";
            }

            if (value.Contains("pending") ||
                value.Contains("pending") ||
                value.Contains("قيد"))
            {
                return "#D97706";
            }

            if (value.Contains("inactive") ||
                value.Contains("rejected") ||
                value.Contains("مرفوض") ||
                value.Contains("غير نشط"))
            {
                return "#DC2626";
            }

            return "#2563EB";
        }
    }
}