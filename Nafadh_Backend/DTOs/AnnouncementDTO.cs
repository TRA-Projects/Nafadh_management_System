using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class AnnouncementDTO
    {
        public int AnnouncementId { get; set; }

        public NFD_AnnouncementScopeType ScopeType { get; set; }

        public int? ScopeId { get; set; }

        public string? Title { get; set; }

        public string Message { get; set; } = string.Empty;

        public string? TargetScope { get; set; }

        public DateTime Date { get; set; }

        public int CreatedByUserId { get; set; }
    }

    public class AnnouncementChannelsDTO
    {
        public bool InApp { get; set; } = true;
        public bool Email { get; set; } = true;
        public bool Sms { get; set; } = false;
    }

    public class CreateAnnouncementDTO
    {
        public NFD_AnnouncementScopeType ScopeType { get; set; }

        public int? ScopeId { get; set; }

        public string? TargetScope { get; set; }

        public string? Title { get; set; }

        [Required]
        public string Message { get; set; } = string.Empty;

        public string? Priority { get; set; }

        public int CreatedByUserId { get; set; }

        public List<int>? CompanyIds { get; set; }
        public List<int>? TraineeIds { get; set; }
        public List<int>? TrainerIds { get; set; }

        public AnnouncementChannelsDTO? Channels { get; set; }
    }

    public class UpdateAnnouncementDTO
    {
        [Required]
        public NFD_AnnouncementScopeType ScopeType { get; set; }

        public int? ScopeId { get; set; }

        [Required]
        public string Message { get; set; } = string.Empty;
    }
}