
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Nafadh_Backend.Repositories
{
    public class TraineePaymentScheduleRepository
        : ITraineePaymentScheduleRepository
    {
        private readonly Nafadhcontext _context;

        public TraineePaymentScheduleRepository(
            Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<NFD_TraineePaymentSchedule>>
            GetByPaymentIdAsync(int traineePaymentId)
        {
            return await _context.NFD_TraineePaymentSchedules
                .Where(x =>
                    x.TraineePaymentId == traineePaymentId)
                .ToListAsync();
        }

        public async Task AddRangeAsync(
            IEnumerable<NFD_TraineePaymentSchedule> schedules)
        {
            await _context.NFD_TraineePaymentSchedules
                .AddRangeAsync(schedules);

            await _context.SaveChangesAsync();
        }

        public async Task<NFD_TraineePaymentSchedule?>
            GetByIdAsync(int id)
        {
            return await _context.NFD_TraineePaymentSchedules
                .FirstOrDefaultAsync(x =>
                    x.ScheduleId == id);
        }

        public async Task UpdateAsync(
            NFD_TraineePaymentSchedule schedule)
        {
            _context.NFD_TraineePaymentSchedules
                .Update(schedule);

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<NFD_TraineePaymentSchedule>>
            GetOverdueAsync()
        {
            return await _context.NFD_TraineePaymentSchedules
                .Where(x =>
                    x.DueDate < DateTime.Now &&
                    x.Status != NFD_PaymentScheduleStatus.Paid)
                .ToListAsync();
        }
    }
}

