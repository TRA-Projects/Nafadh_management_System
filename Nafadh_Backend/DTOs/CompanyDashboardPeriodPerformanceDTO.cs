using System.Collections.Generic;

namespace Nafadh_Backend.DTOs
{
    /// <summary>
    /// Temporary performance for a selected activity period. Not a final grade.
    /// Uses the Admin dashboard's partial-observation weighting and batch thresholds.
    /// </summary>
    public sealed class CompanyDashboardPeriodPerformanceDTO
    {
        public List<CompanyDashboardTraineeDTO> TopPerformers { get; set; } = new();
        public int TopPerformersCount { get; set; }
        public double TopPerformersAveragePercent { get; set; }
        public List<CompanyDashboardTraineeDTO> AtRiskTrainees { get; set; } = new();
    }
}
