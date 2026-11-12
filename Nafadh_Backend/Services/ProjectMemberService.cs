
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class ProjectMemberService : IProjectMemberService
    {
        private readonly IProjectMemberRepository _repository;
        private readonly Nafadhcontext _context;

        public ProjectMemberService(
            IProjectMemberRepository repository,
            Nafadhcontext context)
        {
            _repository = repository;
            _context = context;
        }

        // GET PROJECT MEMBERS BY PROJECT ID
        // Returns team roster for a project.
        public async Task<List<ProjectMemberDTOs>> GetByProjectAsync(int projectId)
        {
            var members = await _repository.GetByProjectAsync(projectId);

            return members.Select(x => new ProjectMemberDTOs
            {
                MemberId = x.MemberId,
                ProjectId = x.ProjectId,
                TraineeId = x.TraineeId,
                Role = x.Role
            }).ToList();
        }

        // GET PROJECTS BY TRAINEE ID
        // Returns all projects where trainee participated.
        public async Task<List<ProjectMemberDTOs>> GetByTraineeAsync(int traineeId)
        {
            var members = await _repository.GetByTraineeAsync(traineeId);

            return members.Select(x => new ProjectMemberDTOs
            {
                MemberId = x.MemberId,
                ProjectId = x.ProjectId,
                TraineeId = x.TraineeId,
                Role = x.Role
            }).ToList();
        }

        // ADD PROJECT MEMBER
        // Assign trainee to project and automatically link
        // the project to all eligible trainee batches.
        public async Task<ProjectMemberDTOs> AddAsync(
            CreateProjectMemberDTO dto)
        {
            // Verify that the project exists.
            var projectProgramId = await _context.NFD_Projects
                .AsNoTracking()
                .Where(p => p.ProjectId == dto.ProjectId)
                .Select(p => (int?)p.ProgramId)
                .FirstOrDefaultAsync();

            if (projectProgramId == null)
                throw new InvalidOperationException(
                    "Project not found.");

            // Get all batches where the trainee is enrolled
            // in the same program as the project.
            var batchIds = await _context.NFD_Enrollments
                .AsNoTracking()
                .Where(e =>
                    e.TraineeId == dto.TraineeId &&
                    e.Batch.ProgramId == projectProgramId.Value)
                .Select(e => e.BatchId)
                .Distinct()
                .ToListAsync();

            if (batchIds.Count == 0)
                throw new InvalidOperationException(
                    "Trainee has no enrollment in the project's program.");

            // Keep member creation and batch linking in one transaction.
            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                var member = new NFD_ProjectMember
                {
                    ProjectId = dto.ProjectId,
                    TraineeId = dto.TraineeId,
                    Role = dto.Role
                };

                // Save the project member using the existing repository.
                await _repository.AddAsync(member);

                // Find existing project-batch links.
                var existingBatchIds = await _context.NFD_ProjectBatches
                    .Where(pb =>
                        pb.ProjectId == dto.ProjectId &&
                        batchIds.Contains(pb.BatchId))
                    .Select(pb => pb.BatchId)
                    .ToListAsync();

                // Create only missing project-batch links.
                var newLinks = batchIds
                    .Except(existingBatchIds)
                    .Select(batchId => new NFD_ProjectBatch
                    {
                        ProjectId = dto.ProjectId,
                        BatchId = batchId
                    })
                    .ToList();

                if (newLinks.Count > 0)
                {
                    await _context.NFD_ProjectBatches.AddRangeAsync(newLinks);
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                return new ProjectMemberDTOs
                {
                    MemberId = member.MemberId,
                    ProjectId = member.ProjectId,
                    TraineeId = member.TraineeId,
                    Role = member.Role
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        // UPDATE MEMBER ROLE
        // Changes role of existing project member.
        public async Task<bool> UpdateAsync(
            int id,
            UpdateProjectMemberDTO dto)
        {
            var member = await _repository.GetByIdAsync(id);

            if (member == null)
                return false;

            member.Role = dto.Role;

            await _repository.UpdateAsync(member);

            return true;
        }

        // DELETE MEMBER
        // Removes trainee from project team.
        public async Task<bool> DeleteAsync(int id)
        {
            var member = await _repository.GetByIdAsync(id);

            if (member == null)
                return false;

            await _repository.DeleteAsync(member);

            return true;
        }
    }
}
