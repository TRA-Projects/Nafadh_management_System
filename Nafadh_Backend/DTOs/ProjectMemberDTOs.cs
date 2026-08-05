using Nafadh_Backend.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace Nafadh_Backend.DTOs
{
    public class ProjectMemberDTOs
    {

        public int MemberId { get; set; }

        public int ProjectId { get; set; }

        public int TraineeId { get; set; }

        public NFD_ProjectMemberRole Role { get; set; }
    }

    public class CreateProjectMemberDTO
    {
        public int ProjectId { get; set; }

        public int TraineeId { get; set; }

        public NFD_ProjectMemberRole Role { get; set; }
    }

          public class UpdateProjectMemberDTO
        {
        public NFD_ProjectMemberRole Role { get; set; }
    
    
    }
}
