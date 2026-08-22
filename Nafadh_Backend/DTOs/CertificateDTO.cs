using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
  
        public class CertificateInputDTO
        {
            public NFD_CertificateType Type { get; set; }

            public DateTime IssueDate { get; set; }
            [MaxLength(300)]
            public string? FileUrl { get; set; }

            public int EnrollmentId { get; set; }
        }

        public class CertificateOutputDTO
        {
            public int CertificateId { get; set; }

            public NFD_CertificateType Type { get; set; }

            public DateTime IssueDate { get; set; }

            public string? FileUrl { get; set; }

            public int EnrollmentId { get; set; }
        }

        public class UpdateCertificateStatusDTO
        {
            public bool IsIssued { get; set; }
        }



    //=================-- Admin portal =================--


        public class TraineeCertificateStatusDTO
        {
            public int TraineeId { get; set; }
            public int EnrollmentId { get; set; }
            public string FullName { get; set; }
            public bool IsIssued { get; set; }
            public int? CertificateId { get; set; }   
            public string? FileUrl { get; set; }
            public decimal? Grade { get; set; }
        }



}

