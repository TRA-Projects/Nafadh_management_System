using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class AnnouncementService : IAnnouncementService
    {
        private readonly IAnnouncementRepository _repository;
        private readonly ITrainingConstantsService _constants;

        public AnnouncementService(
            IAnnouncementRepository repository,
            ITrainingConstantsService constants)
        {
            _repository = repository;
            _constants = constants;
        }

        private static string NormalizePriority(string? priority)
        {
            return priority?.Trim().ToLowerInvariant() switch
            {
                "urgent" => "urgent",
                "important" => "important",
                "high" => "important",
                _ => "normal"
            };
        }

        private static AnnouncementDTO MapToDto(
            NFD_Announcement announcement)
        {
            return new AnnouncementDTO
            {
                AnnouncementId = announcement.AnnouncementId,
                ScopeType = announcement.ScopeType,
                ScopeId = announcement.ScopeId,
                Message = announcement.Message,
                Priority = NormalizePriority(announcement.Priority),
                Date = announcement.Date,
                CreatedByUserId = announcement.CreatedByUserId
            };
        }

        // Get all announcements
        public async Task<List<AnnouncementDTO>> GetAllAsync()
        {
            var announcements =
                await _repository.GetByScopeAsync(0, null);

            return announcements
                .Select(MapToDto)
                .ToList();
        }

        // Get announcements by scope
        public async Task<List<AnnouncementDTO>> GetByScopeAsync(
            NFD_AnnouncementScopeType scopeType,
            int? scopeId)
        {
            var announcements =
                await _repository.GetByScopeAsync(
                    scopeType,
                    scopeId);

            return announcements
                .Select(MapToDto)
                .ToList();
        }

        // Get announcement by ID
        public async Task<AnnouncementDTO> GetByIdAsync(int id)
        {
            var announcement =
                await _repository.GetByIdAsync(id);

            if (announcement == null)
            {
                throw new KeyNotFoundException(
                    "Announcement not found");
            }

            return MapToDto(announcement);
        }

        // Create announcement
        public async Task CreateAsync(CreateAnnouncementDTO dto)
        {
            await CatalogSelectionPolicy.RequireActiveAsync(
                _constants,
                dto.ScopeType);

            var announcement = new NFD_Announcement
            {
                ScopeType = dto.ScopeType,
                ScopeId = dto.ScopeId,
                Message = dto.Message,
                Priority = NormalizePriority(dto.Priority),
                Date = DateTime.Now,
                CreatedByUserId = dto.CreatedByUserId
            };

            await _repository.AddAsync(announcement);
        }

        // Update announcement
        public async Task UpdateAsync(
            int id,
            UpdateAnnouncementDTO dto)
        {
            var announcement =
                await _repository.GetByIdAsync(id);

            if (announcement == null)
            {
                throw new KeyNotFoundException(
                    "Announcement not found");
            }

            if (announcement.ScopeType != dto.ScopeType)
            {
                await CatalogSelectionPolicy.RequireActiveAsync(
                    _constants,
                    dto.ScopeType);
            }

            announcement.ScopeType = dto.ScopeType;
            announcement.ScopeId = dto.ScopeId;
            announcement.Message = dto.Message;

            if (dto.Priority != null)
            {
                announcement.Priority =
                    NormalizePriority(dto.Priority);
            }

            await _repository.UpdateAsync(announcement);
        }

        // Delete announcement
        public async Task DeleteAsync(int id)
        {
            var announcement =
                await _repository.GetByIdAsync(id);

            if (announcement == null)
            {
                throw new KeyNotFoundException(
                    "Announcement not found");
            }

            await _repository.DeleteAsync(announcement);
        }
    }
}