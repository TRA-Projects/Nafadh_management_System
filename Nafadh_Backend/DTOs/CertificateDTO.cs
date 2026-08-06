using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class CertificateDTO
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

    }
}
