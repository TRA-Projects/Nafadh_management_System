using System;
using System.Collections.Generic;
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
            // Prevent duplicate trainer assignment.
            if (await _repository.ExistsAsync(dto.BatchId, dto.TrainerId))
            {
                return false;
            }

            var trainer = await _trainerRepository.GetByIdAsync(dto.TrainerId);

            var batchExists =
                await _batchRepository.GetByIdAsync(dto.BatchId) != null;

            if (trainer?.User == null || !batchExists)
            {
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

        public async Task<bool> UnassignAsync(
            UnassignTrainerDto dto)
        {
            return await _repository.DeleteAsync(
                dto.BatchId,
                dto.TrainerId
            );
        }
    }
}