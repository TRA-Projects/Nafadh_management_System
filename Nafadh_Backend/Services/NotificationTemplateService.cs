
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class NotificationTemplateService
        : INotificationTemplateService
    {
        private readonly INotificationTemplateRepository _repository;

        private static readonly string[] AllowedPortals =
        {
            "Admin",
            "Company",
            "Trainer",
            "Trainee"
        };

        private static readonly string[] AllowedTypes =
        {
            "Email",
            "SMS",
            "Push"
        };

        public NotificationTemplateService(
            INotificationTemplateRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<NotificationTemplateDTO>> GetAllAsync(
            string? portalCode = null,
            string? type = null)
        {
            var templates = await _repository.GetAllAsync(
                portalCode,
                type);

            return templates.Select(MapToDTO).ToList();
        }

        public async Task<NotificationTemplateDTO?> GetByIdAsync(int id)
        {
            var template = await _repository.GetByIdAsync(id);

            return template == null ? null : MapToDTO(template);
        }

        public async Task<NotificationTemplateDTO> CreateAsync(
            CreateNotificationTemplateDTO dto)
        {
            ValidateTemplate(
                dto.Code,
                dto.Name,
                dto.PortalCode,
                dto.Type,
                dto.Body);

            var code = dto.Code.Trim();

            if (await _repository.CodeExistsAsync(code))
            {
                throw new InvalidOperationException(
                    "A notification template with this code already exists.");
            }

            var template = new NFD_NotificationTemplate
            {
                Code = code,
                Name = dto.Name.Trim(),
                PortalCode = NormalizePortal(dto.PortalCode),
                Type = NormalizeType(dto.Type),
                Subject = dto.Subject?.Trim(),
                Body = dto.Body.Trim(),
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddAsync(template);

            return MapToDTO(template);
        }

        public async Task<NotificationTemplateDTO?> UpdateAsync(
            int id,
            UpdateNotificationTemplateDTO dto)
        {
            var template = await _repository.GetByIdAsync(id);

            if (template == null)
            {
                return null;
            }

            ValidateTemplate(
                dto.Code,
                dto.Name,
                dto.PortalCode,
                dto.Type,
                dto.Body);

            var code = dto.Code.Trim();

            if (await _repository.CodeExistsAsync(code, id))
            {
                throw new InvalidOperationException(
                    "Another notification template already uses this code.");
            }

            template.Code = code;
            template.Name = dto.Name.Trim();
            template.PortalCode = NormalizePortal(dto.PortalCode);
            template.Type = NormalizeType(dto.Type);
            template.Subject = dto.Subject?.Trim();
            template.Body = dto.Body.Trim();
            template.IsActive = dto.IsActive;
            template.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(template);

            return MapToDTO(template);
        }

        public async Task<bool> UpdateStatusAsync(
            int id,
            bool isActive)
        {
            var template = await _repository.GetByIdAsync(id);

            if (template == null)
            {
                return false;
            }

            template.IsActive = isActive;
            template.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(template);

            return true;
        }

        private static void ValidateTemplate(
            string code,
            string name,
            string portalCode,
            string type,
            string body)
        {
            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Template code is required.");

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Template name is required.");

            if (string.IsNullOrWhiteSpace(body))
                throw new ArgumentException("Template body is required.");

            if (!AllowedPortals.Any(x =>
                x.Equals(portalCode.Trim(),
                    StringComparison.OrdinalIgnoreCase)))
            {
                throw new ArgumentException("Invalid portal code.");
            }

            if (!AllowedTypes.Any(x =>
                x.Equals(type.Trim(),
                    StringComparison.OrdinalIgnoreCase)))
            {
                throw new ArgumentException("Invalid template type.");
            }
        }

        private static string NormalizePortal(string value)
        {
            return AllowedPortals.First(x =>
                x.Equals(value.Trim(),
                    StringComparison.OrdinalIgnoreCase));
        }

        private static string NormalizeType(string value)
        {
            return AllowedTypes.First(x =>
                x.Equals(value.Trim(),
                    StringComparison.OrdinalIgnoreCase));
        }

        private static NotificationTemplateDTO MapToDTO(
            NFD_NotificationTemplate template)
        {
            return new NotificationTemplateDTO
            {
                Id = template.Id,
                Code = template.Code,
                Name = template.Name,
                PortalCode = template.PortalCode,
                Type = template.Type,
                Subject = template.Subject,
                Body = template.Body,
                IsActive = template.IsActive,
                CreatedAt = template.CreatedAt,
                UpdatedAt = template.UpdatedAt
            };
        }


        public async Task<NotificationTemplateDTO?> GetActiveByCodeAsync(
    string code,
    string type = "Email")
        {
            if (string.IsNullOrWhiteSpace(code))
                return null;

            var template = await _repository.GetByCodeAsync(code.Trim());

            if (template == null || !template.IsActive)
                return null;

            if (!string.Equals(
                template.Type,
                type,
                StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            return MapToDTO(template);
        }
    }
}
