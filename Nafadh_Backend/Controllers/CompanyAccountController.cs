#nullable enable

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Filters;
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
        [RequirePagePermission("nf.company.account", "View")]
        [ProducesResponseType(typeof(CompanyAccountDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<CompanyAccountDto>> GetCurrentAccount()
        {
            var userIdValue =
                User.FindFirstValue("userId")
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                return Unauthorized();

            var dto = await BuildAccountDtoAsync(userId);
            if (dto is null)
            {
                return NotFound(new
                {
                    message = "Company account profile was not found for the authenticated user."
                });
            }

            return Ok(dto);
        }

        // =========================================================
        // PUT: api/CompanyAccount/me
        // تعديل بيانات الحساب الشخصية للمستخدم الحالي
        // =========================================================
        [HttpPut("me")]
        [RequirePagePermission("nf.company.account", "Edit")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateMyAccount([FromBody] CompanyAccountDto dto)
        {
            var userIdValue =
                User.FindFirstValue("userId")
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                return Unauthorized();

            var hasCompanyLink =
                await _context.NFD_CompanySupervisors.AnyAsync(s => s.UserId == userId) ||
                await _context.NFD_Companies.AnyAsync(c => c.UserId == userId);

            var user = await _context.NFD_Users.FirstOrDefaultAsync(u => u.UserId == userId);

            if (!hasCompanyLink || user is null)
            {
                return NotFound(new
                {
                    message = "Company account profile was not found."
                });
            }

            user.Phone = string.IsNullOrWhiteSpace(dto.Phone)
                ? null
                : dto.Phone.Trim();

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // =========================================================
        // GET: api/CompanyAccount/me/export-pdf
        // =========================================================
        [HttpGet("me/export-pdf")]
        [RequirePagePermission("nf.company.account", "View")]
        [Produces("application/pdf")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ExportMyAccountPdf()
        {
            var userIdValue =
                User.FindFirstValue("userId")
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                return Unauthorized();

            var account = await BuildAccountDtoAsync(userId);
            if (account is null)
            {
                return NotFound(new
                {
                    message = "Company account profile was not found for the authenticated user."
                });
            }

            // =====================================================
            // Status labels from SystemConfigValues (must be loaded
            // before Document.Create because the lambda is not async)
            // =====================================================
            var statusLabels = await _context.Database.SqlQuery<AccountStatusLabel>($@"
                SELECT g.Code, COALESCE(NULLIF(v.LabelAr, ''), NULLIF(v.LabelEn, ''), v.ValueKey) AS Label
                FROM dbo.SystemConfigValues v
                JOIN dbo.SystemConfigGroups g ON g.Id = v.ConfigGroupId
                WHERE (g.Code = 'NFD_USR_STAT' AND v.ValueKey = {account.UserStatus})
                   OR (g.Code = 'NFD_CMP_STAT' AND v.ValueKey = {account.CompanyStatus})")
                .ToListAsync(HttpContext.RequestAborted);

            string? FindLabel(string code) =>
                statusLabels.FirstOrDefault(s => s.Code == code)?.Label;

            QuestPDF.Settings.UseSystemFonts = true;

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.MarginHorizontal(35);
                    page.MarginVertical(30);
                    page.ContentFromRightToLeft();
                    page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(10).FontColor("#1F2937"));

                    page.Header().Column(header =>
                    {
                        header.Item()
                            .Background("#0A1172")
                            .PaddingVertical(18)
                            .PaddingHorizontal(20)
                            .Row(row =>
                            {
                                row.RelativeItem().Column(col =>
                                {
                                    col.Item().AlignRight().Text("NAFADH").FontFamily("Arial").FontSize(12).Bold().FontColor(Colors.White);
                                    col.Item().PaddingTop(4).AlignRight().Text("الملف الشخصي للمستخدم").FontSize(21).Bold().FontColor(Colors.White);
                                    col.Item().PaddingTop(4).AlignRight().Text("بيانات الحساب والصلاحيات وسجل النشاطات").FontSize(9).FontColor("#E0E7FF");
                                });
                            });

                        header.Item().Height(5).Background("#2563EB");
                    });

                    page.Footer()
                        .PaddingTop(10)
                        .BorderTop(1)
                        .BorderColor("#E5E7EB")
                        .Row(row =>
                        {
                            row.RelativeItem().Text("Nafadh Management System").FontSize(8).FontColor("#6B7280");
                            row.RelativeItem().AlignLeft().Text(text =>
                            {
                                text.Span("تاريخ التقرير: ").FontSize(8).FontColor("#6B7280");
                                text.Span(DateTime.Now.ToString("yyyy-MM-dd")).FontSize(8).Bold().FontColor("#374151");
                            });
                        });

                    page.Content().PaddingTop(20).Column(column =>
                    {
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
                                    .Text(GetInitial(account.FullName))
                                    .FontSize(24)
                                    .Bold()
                                    .FontColor(Colors.White);

                                row.RelativeItem().PaddingRight(14).Column(col =>
                                {
                                    col.Item().AlignRight().Text(account.FullName).FontSize(18).Bold().FontColor("#111827");
                                    col.Item().PaddingTop(3).AlignRight().Text(string.IsNullOrWhiteSpace(account.Position) ? "غير محدد" : account.Position).FontSize(10).FontColor("#475569");
                                    col.Item().PaddingTop(5).AlignRight().Text(account.CompanyName).FontSize(9).Bold().FontColor("#2563EB");
                                });
                            });

                        column.Item().PaddingTop(18);

                        AddSectionTitle(column, "البيانات الشخصية", "المعلومات الأساسية للحساب");

                        column.Item().PaddingTop(8).Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn();
                                columns.RelativeColumn();
                            });

                            AddInfoCard(table, "الاسم الكامل", account.FullName);
                            AddInfoCard(table, "البريد الإلكتروني", account.Email);
                            AddInfoCard(table, "رقم الجوال", account.Phone ?? "غير متوفر");
                            AddInfoCard(table, "المسمى الوظيفي", account.Position ?? "غير محدد");
                            AddInfoCard(table, "القسم", account.Department ?? "غير محدد");
                            AddInfoCard(table, "الجهة / الشركة", account.CompanyName);
                            AddInfoCard(table, "الدور الوظيفي", account.RoleName);
                            AddInfoCard(table, "رقم الحساب الفرعي", account.SupervisorId.ToString());
                        });

                        column.Item().PaddingTop(15);
                        AddSectionTitle(column, "حالة الحساب", "الحالات الحالية للحساب والشركة");

                        column.Item().PaddingTop(8).Row(row =>
                        {
                            AddStatusCard(
                                row,
                                "حالة الحساب",
                                FindLabel("NFD_USR_STAT") ?? account.UserStatus,
                                GetStatusColor(account.UserStatus)
                            );

                            AddStatusCard(
                                row,
                                "حالة الصفة الوظيفية",
                                account.SupervisorStatus,
                                GetStatusColor(account.SupervisorStatus)
                            );

                            AddStatusCard(
                                row,
                                "حالة الشركة",
                                FindLabel("NFD_CMP_STAT") ?? account.CompanyStatus,
                                GetStatusColor(account.CompanyStatus)
                            );
                        });

                        column.Item().PaddingTop(15);
                        column.Item()
                            .Background("#F8FAFC")
                            .Border(1)
                            .BorderColor("#E2E8F0")
                            .CornerRadius(8)
                            .Padding(12)
                            .Row(row =>
                            {
                                row.RelativeItem().Column(col =>
                                {
                                    col.Item().AlignRight().Text("تاريخ إنشاء الحساب").FontSize(8).FontColor("#64748B");
                                    col.Item().PaddingTop(3).AlignRight().Text(account.CreatedAt.ToString("yyyy-MM-dd HH:mm")).FontSize(10).Bold().FontColor("#1E293B");
                                });

                                row.ConstantItem(1).Height(35).Background("#CBD5E1");

                                row.RelativeItem().PaddingRight(15).Column(col =>
                                {
                                    col.Item().AlignRight().Text("آخر نشاط مسجل").FontSize(8).FontColor("#64748B");
                                    col.Item().PaddingTop(3).AlignRight().Text(account.LastActivityAt?.ToString("yyyy-MM-dd HH:mm") ?? "غير متوفر").FontSize(10).Bold().FontColor("#1E293B");
                                });
                            });

                        column.Item().PaddingTop(18);
                        AddSectionTitle(column, "الصلاحيات الممنوحة", $"{account.Permissions.Count} صلاحية مفعّلة");
                        column.Item().PaddingTop(8);

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
                                        row.ConstantItem(28).Height(28).Background("#E0EAFF").CornerRadius(14).AlignCenter().AlignMiddle().Text("✓").FontSize(12).Bold().FontColor("#2563EB");
                                        row.RelativeItem().PaddingRight(10).Column(col =>
                                        {
                                            col.Item().AlignRight().Text(permission.PermissionKey).FontSize(10).Bold().FontColor("#1E3A8A");
                                            col.Item().PaddingTop(2).AlignRight().Text(string.IsNullOrWhiteSpace(permission.Description) ? "لا يوجد وصف للصلاحية" : permission.Description).FontSize(8).FontColor("#64748B");
                                        });
                                    });
                            }
                        }
                        else
                        {
                            column.Item().Background("#F8FAFC").CornerRadius(7).Padding(12).AlignCenter().Text("لا توجد صلاحيات مسجلة لهذا الحساب.").FontColor("#64748B");
                        }

                        column.Item().PaddingTop(18);
                        AddSectionTitle(column, "سجل النشاطات", "آخر الأنشطة المسجلة للحساب");
                        column.Item().PaddingTop(8);

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
                                        col.Item().AlignRight().Text(activity.Action).FontSize(10).Bold().FontColor("#1E3A8A");
                                        col.Item().PaddingTop(3).AlignRight().Text(text =>
                                        {
                                            text.Span(activity.EntityName).FontSize(8).FontColor("#475569");
                                            if (activity.EntityId != 0)
                                            {
                                                text.Span($"  •  رقم: {activity.EntityId}").FontSize(8).FontColor("#64748B");
                                            }
                                        });

                                        if (!string.IsNullOrWhiteSpace(activity.Details))
                                        {
                                            col.Item().PaddingTop(2).AlignRight().Text(activity.Details).FontSize(8).FontColor("#64748B");
                                        }

                                        col.Item().PaddingTop(3).AlignRight().Text(activity.Timestamp.ToString("yyyy-MM-dd HH:mm")).FontSize(7).FontColor("#94A3B8");
                                    });
                            }
                        }
                        else
                        {
                            column.Item().Background("#F8FAFC").CornerRadius(7).Padding(12).AlignCenter().Text("لا توجد نشاطات مسجلة لهذا الحساب.").FontColor("#64748B");
                        }
                    });
                });
            });

            var pdfBytes = document.GeneratePdf();
            var fileName = $"حساب_{account.FullName}_{DateTime.Now:yyyy-MM-dd}.pdf";

            return File(pdfBytes, "application/pdf", fileName);
        }

        // =========================================================
        // Helper: Build Account DTO for Supervisor/Staff OR Operator
        // =========================================================
        private async Task<CompanyAccountDto?> BuildAccountDtoAsync(int userId)
        {
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

            // 1) مسار مشرف نفاذ أو موظف نفاذ (NFD_CompanySupervisors)
            var supervisor = await _context.NFD_CompanySupervisors
                .AsNoTracking()
                .Include(s => s.User)
                    .ThenInclude(u => u.Role)
                        .ThenInclude(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission)
                .Include(s => s.Company)
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (supervisor is { User: not null, Company: not null })
            {
                var pos = supervisor.Position ?? string.Empty;
                var isStaff = pos.Contains("منسق") || pos.Contains("أخصائي") || pos.Contains("موظف");
                var distinctRoleName = isStaff ? "موظف نفاذ" : "مشرف نفاذ";

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

                return new CompanyAccountDto
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

                    RoleName = distinctRoleName,
                    Permissions = permissions,
                    RecentActivities = logs,
                    LastActivityAt = logs.Count > 0 ? logs[0].Timestamp : null
                };
            }

            // 2) مسار مشغّل نفاذ (حساب مالك/مسؤول الشركة الرئيسي في NFD_Companies)
            var companyOwner = await _context.NFD_Companies
                .AsNoTracking()
                .Include(c => c.User)
                    .ThenInclude(u => u!.Role)
                        .ThenInclude(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (companyOwner is { User: not null })
            {
                var permissions = companyOwner.User.Role?.RolePermissions
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

                return new CompanyAccountDto
                {
                    UserId = companyOwner.User.UserId,
                    FullName = companyOwner.User.FullName,
                    Email = companyOwner.User.Email,
                    Phone = companyOwner.User.Phone ?? companyOwner.Phone,
                    UserStatus = companyOwner.User.Status.ToString(),
                    CreatedAt = companyOwner.User.CreatedAt,

                    SupervisorId = 0,
                    CompanyId = companyOwner.CompanyId,
                    Department = "الإدارة العامة للشركة",
                    Position = "مشغّل الشركة الرئيسي",
                    SupervisorStatus = companyOwner.User.Status.ToString(),

                    CompanyName = companyOwner.CompanyName,
                    CompanyStatus = companyOwner.Status.ToString(),

                    RoleName = "مشغّل نفاذ",
                    Permissions = permissions,
                    RecentActivities = logs,
                    LastActivityAt = logs.Count > 0 ? logs[0].Timestamp : null
                };
            }

            return null;
        }

        private static void AddSectionTitle(ColumnDescriptor column, string title, string subtitle)
        {
            column.Item().Row(row =>
            {
                row.ConstantItem(5).Height(30).Background("#2563EB").CornerRadius(3);
                row.RelativeItem().PaddingRight(10).Column(col =>
                {
                    col.Item().AlignRight().Text(title).FontSize(14).Bold().FontColor("#0F172A");
                    col.Item().PaddingTop(2).AlignRight().Text(subtitle).FontSize(7).FontColor("#64748B");
                });
            });
        }

        private static void AddInfoCard(TableDescriptor table, string label, string value)
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
                    column.Item().AlignRight().Text(label).FontSize(7).FontColor("#64748B");
                    column.Item().PaddingTop(4).AlignRight().Text(string.IsNullOrWhiteSpace(value) ? "غير متوفر" : value).FontSize(9).Bold().FontColor("#1E293B");
                });
        }

        private static void AddStatusCard(RowDescriptor row, string label, string value, string color)
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
                    column.Item().AlignRight().Text(label).FontSize(7).FontColor("#64748B");
                    column.Item().PaddingTop(5).AlignRight().Text(text =>
                    {
                        text.Span("● ").FontSize(9).Bold().FontColor(color);
                        text.Span(string.IsNullOrWhiteSpace(value) ? "غير محدد" : value).FontSize(9).Bold().FontColor("#1E293B");
                    });
                });
        }

        private static string GetInitial(string? name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return "م";

            return name.Trim().Substring(0, 1);
        }

        // Row shape returned by the status-labels SQL query
        private sealed record AccountStatusLabel(string Code, string Label);

        // =========================================================
        // Helper: Status Color
        // =========================================================
        private static string GetStatusColor(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return "#64748B";

            var value = status.Trim().ToLowerInvariant();

            if (value == "active" ||
                value.Contains("approved") ||
                value.Contains("مفعل") ||
                value.Contains("نشط") ||
                value.Contains("معتمد"))
            {
                return "#16A34A";
            }

            if (value.Contains("pending") ||
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
