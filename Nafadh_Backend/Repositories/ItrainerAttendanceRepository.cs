using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface ITrainerAttendanceRepository
    {
        // Trainers that teach at least one batch the company has enrollments in.
        Task<List<NFD_Trainer>> GetCompanyTrainersAsync(int companyId);

        Task<bool> TrainerBelongsToCompanyAsync(int companyId, int trainerId);

        Task<List<NFD_TrainerAttendance>> GetRangeAsync(int companyId, DateTime from, DateTime to, int? trainerId);

        Task<List<NFD_TrainerAttendance>> GetDayAsync(int companyId, DateTime date);

        Task<NFD_TrainerAttendance?> GetAsync(int companyId, int trainerId, DateTime date);

        Task<NFD_TrainerAttendance?> GetByIdAsync(int id);

        Task AddAsync(NFD_TrainerAttendance attendance);

        Task<bool> SaveChangesAsync();
    }
}