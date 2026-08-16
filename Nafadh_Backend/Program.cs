using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Microsoft.OpenApi.Models;
using Nafadh_Backend.Filters;
using Nafadh_Backend.Interfaces;
using Nafadh_Backend.Repositories;
using Nafadh_Backend.Services;
using System.Security.Claims;
using System.Text;

namespace Nafadh_Backend
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            builder.Services.AddControllers(options =>
            {
                options.Filters.Add<ApiExceptionFilter>();
            })
  .AddJsonOptions(options =>
  {
      // Serialize enums as strings instead of numbers
      options.JsonSerializerOptions.Converters.Add(
          new System.Text.Json.Serialization.JsonStringEnumConverter());

      // Prevent circular reference errors
      options.JsonSerializerOptions.ReferenceHandler =
          System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
  });

            // CORS Policy to fix Swagger fetch issues
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", policy =>
                {
                    policy.AllowAnyOrigin()
                          .AllowAnyMethod()
                          .AllowAnyHeader();
                });
            });

            // EF Core - SQL Server
            builder.Services.AddDbContext<Nafadhcontext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            // ── JWT Authentication ─────────────────────────────────────────────
            builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

            var jwtKey = builder.Configuration["Jwt:Key"];
            var jwtIssuer = builder.Configuration["Jwt:Issuer"];
            var jwtAudience = builder.Configuration["Jwt:Audience"];

            builder.Services
                .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.MapInboundClaims = false;

                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = jwtIssuer,
                        ValidAudience = jwtAudience,
                        RoleClaimType = ClaimTypes.Role,
                        ClockSkew = TimeSpan.Zero,
                        IssuerSigningKey = new SymmetricSecurityKey(
                                                       Encoding.UTF8.GetBytes(jwtKey))
                    };

                    options.Events = new JwtBearerEvents
                    {
                        OnAuthenticationFailed = context =>
                        {
                            var error = context.Exception.Message;
                            return Task.CompletedTask;
                        },
                        OnTokenValidated = context =>
                        {
                            var claims = context.Principal.Claims.ToList();
                            return Task.CompletedTask;
                        },
                        OnChallenge = context =>
                        {
                            var error = context.Error;
                            var desc = context.ErrorDescription;
                            return Task.CompletedTask;
                        }
                    };
                });

            builder.Services.AddAuthorization();
            // ── end JWT Authentication ─────────────────────────────────────────────

            // Repositories & Services (one pair per domain entity)
            builder.Services.AddScoped<IUserRepository, UserRepository>();
            builder.Services.AddScoped<IUserService, UserService>();
            builder.Services.AddScoped<IRoleRepository, RoleRepository>();
            builder.Services.AddScoped<IRoleService, RoleService>();
            builder.Services.AddScoped<IPermissionRepository, PermissionRepository>();
            builder.Services.AddScoped<IPermissionService, PermissionService>();
            builder.Services.AddScoped<IRolePermissionRepository, RolePermissionRepository>();
            builder.Services.AddScoped<IRolePermissionService, RolePermissionService>();
            builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
            builder.Services.AddScoped<IAuditLogService, AuditLogService>();
            builder.Services.AddScoped<ICompanyRepository, CompanyRepository>();
            builder.Services.AddScoped<ICompanyService, CompanyService>();
            builder.Services.AddScoped<ICompanyBranchRepository, CompanyBranchRepository>();
            builder.Services.AddScoped<ICompanyBranchService, CompanyBranchService>();
            builder.Services.AddScoped<ICompanySupervisorRepository, CompanySupervisorRepository>();
            builder.Services.AddScoped<ICompanySupervisorService, CompanySupervisorService>();
            builder.Services.AddScoped<IDepartmentRepository, DepartmentRepository>();
            builder.Services.AddScoped<IDepartmentService, DepartmentService>();
            builder.Services.AddScoped<ICompanyProgramRepository, CompanyProgramRepository>();
            builder.Services.AddScoped<ICompanyProgramService, CompanyProgramService>();
            builder.Services.AddScoped<ITrainerRepository, TrainerRepository>();
            builder.Services.AddScoped<ITrainerService, TrainerService>();
            builder.Services.AddScoped<ITraineeRepository, TraineeRepository>();
            builder.Services.AddScoped<ITraineeService, TraineeService>();
            builder.Services.AddScoped<ITrackRepository, TrackRepository>();
            builder.Services.AddScoped<ITrackService, TrackService>();
            builder.Services.AddScoped<IProgramRepository, ProgramRepository>();
            builder.Services.AddScoped<IProgramService, ProgramService>();
            builder.Services.AddScoped<IBatchRepository, BatchRepository>();
            builder.Services.AddScoped<IBatchService, BatchService>();
            builder.Services.AddScoped<IBatchTrainerRepository, BatchTrainerRepository>();
            builder.Services.AddScoped<IBatchTrainerService, BatchTrainerService>();
            builder.Services.AddScoped<IEnrollmentRepository, EnrollmentRepository>();
            builder.Services.AddScoped<IEnrollmentService, EnrollmentService>();
            builder.Services.AddScoped<IModuleRepository, ModuleRepository>();
            builder.Services.AddScoped<IModuleService, ModuleService>();
            builder.Services.AddScoped<ILessonRepository, LessonRepository>();
            builder.Services.AddScoped<ILessonService, LessonService>();
            builder.Services.AddScoped<ITrainingMaterialRepository, TrainingMaterialRepository>();
            builder.Services.AddScoped<ITrainingMaterialService, TrainingMaterialService>();
            builder.Services.AddScoped<ITraineeModuleProgressRepository, TraineeModuleProgressRepository>();
            builder.Services.AddScoped<ITraineeModuleProgressService, TraineeModuleProgressService>();
            builder.Services.AddScoped<ISessionRepository, SessionRepository>();
            builder.Services.AddScoped<ISessionService, SessionService>();
            builder.Services.AddScoped<ISessionAttendanceRepository, SessionAttendanceRepository>();
            builder.Services.AddScoped<ISessionAttendanceService, SessionAttendanceService>();
            builder.Services.AddScoped<IDailyAttendanceRepository, DailyAttendanceRepository>();
            builder.Services.AddScoped<IDailyAttendanceService, DailyAttendanceService>();
            builder.Services.AddScoped<IExcuseRepository, ExcuseRepository>();
            builder.Services.AddScoped<IExcuseService, ExcuseService>();
            builder.Services.AddScoped<ITaskRepository, TaskRepository>();
            builder.Services.AddScoped<ITaskService, TaskService>();
            builder.Services.AddScoped<IRubricRepository, RubricRepository>();
            builder.Services.AddScoped<IRubricService, RubricService>();
            builder.Services.AddScoped<ISubmissionRepository, SubmissionRepository>();
            builder.Services.AddScoped<ISubmissionService, SubmissionService>();
            builder.Services.AddScoped<IProjectRepository, ProjectRepository>();
            builder.Services.AddScoped<IProjectService, ProjectService>();
            builder.Services.AddScoped<IProjectMemberRepository, ProjectMemberRepository>();
            builder.Services.AddScoped<IProjectMemberService, ProjectMemberService>();
            builder.Services.AddScoped<IEvaluationTemplateRepository, EvaluationTemplateRepository>();
            builder.Services.AddScoped<IEvaluationTemplateService, EvaluationTemplateService>();
            builder.Services.AddScoped<IEvaluationCriterionRepository, EvaluationCriterionRepository>();
            builder.Services.AddScoped<IEvaluationCriterionService, EvaluationCriterionService>();
            builder.Services.AddScoped<IEvaluationRepository, EvaluationRepository>();
            builder.Services.AddScoped<IEvaluationService, EvaluationService>();
            builder.Services.AddScoped<IWarningRepository, WarningRepository>();
            builder.Services.AddScoped<IWarningService, WarningService>();
            builder.Services.AddScoped<ISupportTicketRepository, SupportTicketRepository>();
            builder.Services.AddScoped<ISupportTicketService, SupportTicketService>();
            builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
            builder.Services.AddScoped<INotificationService, NotificationService>();
            builder.Services.AddScoped<IAnnouncementRepository, AnnouncementRepository>();
            builder.Services.AddScoped<IAnnouncementService, AnnouncementService>();
            builder.Services.AddScoped<IMessageRepository, MessageRepository>();
            builder.Services.AddScoped<IMessageService, MessageService>();
            builder.Services.AddScoped<ICertificateRepository, CertificateRepository>();
            builder.Services.AddScoped<ICertificateService, CertificateService>();
            builder.Services.AddScoped<IReportRepository, ReportRepository>();
            builder.Services.AddScoped<IReportService, ReportService>();
            builder.Services.AddScoped<ISystemSettingRepository, SystemSettingRepository>();
            builder.Services.AddScoped<ISystemSettingService, SystemSettingService>();
            builder.Services.AddScoped<ITraineePaymentRepository, TraineePaymentRepository>();
            builder.Services.AddScoped<ITraineePaymentService, TraineePaymentService>();
            builder.Services.AddScoped<ITraineePaymentScheduleRepository, TraineePaymentScheduleRepository>();
            builder.Services.AddScoped<ITraineePaymentScheduleService, TraineePaymentScheduleService>();
            builder.Services.AddScoped<ICompanyPaymentRepository, CompanyPaymentRepository>();
            builder.Services.AddScoped<ICompanyPaymentService, CompanyPaymentService>();
            builder.Services.AddScoped<ICompanyPaymentScheduleRepository, CompanyPaymentScheduleRepository>();
            builder.Services.AddScoped<ICompanyPaymentScheduleService, CompanyPaymentScheduleService>();

            // ── NEW registrations (backend upgrade - Phase 2 Contract Alignment) ──
            builder.Services.AddScoped<IConversationRepository, ConversationRepository>();
            builder.Services.AddScoped<IConversationService, ConversationService>();
            builder.Services.AddScoped<IFeedbackRepository, FeedbackRepository>();
            builder.Services.AddScoped<IFeedbackService, FeedbackService>();
            builder.Services.AddScoped<IBadgeRepository, BadgeRepository>();
            builder.Services.AddScoped<IBadgeService, BadgeService>();
            builder.Services.AddScoped<IBadgeEvaluationService, BadgeEvaluationService>();

            // ── Swagger with JWT support ───────────────────────────────────────
            builder.Services.AddEndpointsApiExplorer();

            builder.Services.AddSwaggerGen(c =>
            {
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Enter your JWT token in the box below"
                });

                c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            new List<string>()
        }
    });
            });

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();
            // Enable CORS middleware here
            app.UseCors("AllowAll");

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();

            app.Run();
        }
    }
}