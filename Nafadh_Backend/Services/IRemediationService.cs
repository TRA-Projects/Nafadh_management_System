using System.Collections.Generic;
using System.Threading.Tasks;
using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Interfaces
{
    public interface IRemediationService
    {
        Task<IEnumerable<RemediationRequestDto>> GetAllRequestsAsync(string? searchTerm = null, int? status = null);
        Task<RemediationRequestDto?> GetRequestByIdAsync(int id);
        Task<RemediationRequestDto> CreateRequestAsync(CreateRemediationRequestDto dto);
        Task<bool> ReviewRequestAsync(int id, ReviewRemediationRequestDto dto);
    }
}