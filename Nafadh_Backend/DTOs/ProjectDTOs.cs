using Nafadh_Backend.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace Nafadh_Backend.DTOs
{
    public class ProjectDTOs
    {
        // DTO used to return project information to the client
        public class ProjectDto
        {

            // Primary key of the project
            public int ProjectId { get; set; }


            // Project title
            public string Title { get; set; } = string.Empty;


            // Optional project description
            public string? Description { get; set; }


            // Project start date
            public DateTime StartDate { get; set; }


            // Project end date
            public DateTime EndDate { get; set; }


            // Current project status
            public NFD_ProjectStatus Status { get; set; }


            // Related program ID
            public int ProgramId { get; set; }

        }

        public class CreateProjectDto
        {

            // Project title is required
            // Maximum length is 150 characters
            [Required(ErrorMessage = "Project title is required")]
            [MaxLength(150, ErrorMessage = "Title cannot exceed 150 characters")]
            public string Title { get; set; } = string.Empty;




            // Optional description of the project
            public string? Description { get; set; }




            // Start date of the project
            [Required(ErrorMessage = "Start date is required")]
            public DateTime StartDate { get; set; }




            // End date of the project
            [Required(ErrorMessage = "End date is required")]
            public DateTime EndDate { get; set; }




            // Initial project status
            [Required(ErrorMessage = "Project status is required")]
            public NFD_ProjectStatus Status { get; set; }




            // Program that owns this project
            [Required(ErrorMessage = "Program ID is required")]
            [Range(1, int.MaxValue, ErrorMessage = "Program ID must be greater than zero")]
            public int ProgramId { get; set; }

        }





        // DTO used when updating an existing project
        public class UpdateProjectDto
        {

            // Updated project title
            [Required(ErrorMessage = "Project title is required")]
            [MaxLength(150, ErrorMessage = "Title cannot exceed 150 characters")]
            public string Title { get; set; } = string.Empty;




            // Updated project description
            public string? Description { get; set; }




            // Updated start date
            [Required(ErrorMessage = "Start date is required")]
            public DateTime StartDate { get; set; }




            // Updated end date
            [Required(ErrorMessage = "End date is required")]
            public DateTime EndDate { get; set; }




            // Updated project status
            [Required(ErrorMessage = "Project status is required")]
            public NFD_ProjectStatus Status { get; set; }




            // Updated related program
            [Required(ErrorMessage = "Program ID is required")]
            [Range(1, int.MaxValue, ErrorMessage = "Program ID must be greater than zero")]
            public int ProgramId { get; set; }

        }

    
}
}
