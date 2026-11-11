using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class BatchTrainerService : IBatchTrainerService
    {
        private readonly IBatchTrainerRepository _repository;
        private readonly IBatchRepository _batchRepository;
        private readonly ITrainerRepository _trainerRepository;
        private readonly IConversationService _conversationService;
        private readonly Nafadhcontext _context;

        public BatchTrainerService(
      IBatchTrainerRepository repository,
      IBatchRepository batchRepository,
      ITrainerRepository trainerRepository,
      IConversationService conversationService,
      Nafadhcontext context)
        {
            _repository = repository;
            _batchRepository = batchRepository;
            _trainerRepository = trainerRepository;
            _conversationService = conversationService;
            _context = context;
        }


        // =========================================================
        // Get trainers assigned to a batch
        // =========================================================

        public async Task<List<TrainerInBatchDto>> GetTrainersForBatchAsync(
            int batchId)
        {
            var links =
                await _repository.GetByBatchIdAsync(batchId);

            var result =
                new List<TrainerInBatchDto>();


            foreach (var link in links)
            {
                var trainer =
                    await _trainerRepository.GetByIdAsync(
                        link.TrainerId
                    );


                result.Add(
                    new TrainerInBatchDto
                    {
                        TrainerId =
                            link.TrainerId,

                        TrainerName =
                            trainer?.User?.FullName
                            ?? string.Empty
                    }
                );
            }


            return result;
        }


        // =========================================================
        // Get batches assigned to a trainer
        // =========================================================

        public async Task<List<BatchForTrainerDto>> GetBatchesForTrainerAsync(
            int trainerId)
        {
            var links =
                await _repository.GetByTrainerIdAsync(
                    trainerId
                );


            var result =
                new List<BatchForTrainerDto>();


            foreach (var link in links)
            {
                var batch =
                    await _batchRepository.GetByIdAsync(
                        link.BatchId
                    );


                if (batch == null)
                    continue;


                result.Add(
                    new BatchForTrainerDto
                    {
                        BatchId =
                            batch.BatchId,

                        BatchName =
                            batch.BatchName
                            ?? string.Empty,

                        StartDate =
                            batch.StartDate,

                        EndDate =
                            batch.EndDate,

                        // Return the status based on the
                        // current date instead of relying
                        // on an outdated stored status.
                        Status =
                            CalculateBatchStatus(batch)
                    }
                );
            }


            return result;
        }


        // =========================================================
        // Calculate batch status
        // =========================================================

        private static NFD_BatchStatus CalculateBatchStatus(
            NFD_Batch batch)
        {
            // A cancelled batch must remain cancelled
            // regardless of its start or end dates.
            if (batch.Status == NFD_BatchStatus.Cancelled)
            {
                return NFD_BatchStatus.Cancelled;
            }


            var today =
                DateTime.Today;


            // Batch has not started yet.
            if (today < batch.StartDate)
            {
                return NFD_BatchStatus.Upcoming;
            }


            // Batch has already ended.
            if (today > batch.EndDate)
            {
                return NFD_BatchStatus.Completed;
            }


            // Today is between StartDate and EndDate,
            // including both boundary dates.
            return NFD_BatchStatus.Ongoing;
        }



        // =========================================================
        // Assign trainer to batch
        // =========================================================

        public async Task<bool> AssignAsync(AssignTrainerDto dto)
        {
            var trainer = await _trainerRepository.GetByIdAsync(dto.TrainerId);

            var batch = await _batchRepository.GetByIdAsync(dto.BatchId);

            if (trainer?.User == null || batch == null)
            {
                return false;
            }

            // A batch may legitimately have no company. But a company-owned trainer
            // must not be assigned to another company's batch (including shared
            // batches that already contain enrollments from a different company).
            if (trainer.CompanyId.HasValue)
            {
                if (batch.CompanyId.HasValue && batch.CompanyId != trainer.CompanyId)
                    return false;
                if (!batch.CompanyId.HasValue && await _context.NFD_Enrollments
                    .AnyAsync(e => e.BatchId == batch.BatchId && e.CompanyId != trainer.CompanyId.Value))
                    return false;
            }

            // If trainer is already assigned, ensure group membership.
            if (await _repository.ExistsAsync(dto.BatchId, dto.TrainerId))
            {
                await _conversationService.CreateBatchGroupAsync(
                    new CreateBatchGroupDTO
                    {
                        BatchId = dto.BatchId,
                        TrainerUserId = trainer.User.UserId
                    }
                );

                // Keep the existing API behavior for duplicate assignments.
                return false;
            }

            // Both operations must succeed together.
            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                // Assign trainer to batch.
                await _repository.AddAsync(
                    new NFD_BatchTrainer
                    {
                        BatchId = dto.BatchId,
                        TrainerId = dto.TrainerId
                    }
                );

                // Create or join the batch group.
                await _conversationService.CreateBatchGroupAsync(
                    new CreateBatchGroupDTO
                    {
                        BatchId = dto.BatchId,
                        TrainerUserId = trainer.User.UserId
                    }
                );

                // Save both operations.
                await transaction.CommitAsync();

                return true;
            }
            catch
            {
                // Undo changes if either operation fails.
                await transaction.RollbackAsync();
                throw;
            }
        }




        // =========================================================
        // Unassign trainer from batch
        // =========================================================

        public async Task<bool> UnassignAsync(UnassignTrainerDto dto)
        {
            var trainerUserId = await _context.NFD_Trainers
                .Where(t => t.TrainerId == dto.TrainerId)
                .Select(t => (int?)t.UserId)
                .FirstOrDefaultAsync();
            if (!trainerUserId.HasValue)
                return false;

            // Keep batch-trainer assignment and batch-group membership consistent.
            // A removed trainer must not retain access to private batch conversations.
            await using var transaction = await _context.Database.BeginTransactionAsync();
            var removed = await _repository.DeleteAsync(dto.BatchId, dto.TrainerId);
            if (!removed)
            {
                await transaction.RollbackAsync();
                return false;
            }

            var groupMemberships = await _context.NFD_ConversationGroupMembers
                .Where(m => m.BatchId == dto.BatchId && m.UserId == trainerUserId.Value &&
                    _context.NFD_SupportTickets.Any(t =>
                        t.TicketId == m.ConversationId && t.Category == "BatchGroup"))
                .ToListAsync();
            if (groupMemberships.Count > 0)
            {
                _context.NFD_ConversationGroupMembers.RemoveRange(groupMemberships);
                await _context.SaveChangesAsync();
            }
            await transaction.CommitAsync();
            return true;
        }
    }
}