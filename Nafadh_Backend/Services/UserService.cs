
// Implemented by Noura


using Nafadh_Backend.Common;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Exceptions;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _repository;
        private readonly IRoleRepository _roleRepository;
        private readonly IJwtTokenService _jwtTokenService;

        public UserService(
            IUserRepository repository,
            IRoleRepository roleRepository,
            IJwtTokenService jwtTokenService)
        {
            _repository = repository;
            _roleRepository = roleRepository;
            _jwtTokenService = jwtTokenService;
        }

        public async Task<UserResponseDTO> RegisterAsync(UserRegisterationDTO dto)
        {
            var role = await _roleRepository.GetByIdAsync(dto.RoleId)
                ?? throw new ValidationException($"RoleId {dto.RoleId} does not exist.");

            if (await _repository.EmailExistsAsync(dto.Email))
            {
                throw new ConflictException($"A user with email '{dto.Email}' already exists.");
            }

            var user = new NFD_User
            {
                FullName = dto.FullName.Trim(),
                Email = dto.Email.Trim().ToLower(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Phone = dto.Phone,
                RoleId = dto.RoleId,
                // No email-verification workflow exists yet in Phase 1, so new accounts are
                // usable immediately. Revisit this default if/when an activation flow is added.
                Status = NFD_UserStatus.Active,
                CreatedAt = DateTime.UtcNow
            };

            var created = await _repository.AddAsync(user);
            created.Role = role;
            return MapToResponseDTO(created);
        }

       

        private static UserResponseDTO MapToResponseDTO(NFD_User user)
        {
            return new UserResponseDTO
            {
                UserId = user.UserId,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                RoleId = user.RoleId,
                RoleName = user.Role?.RoleName ?? string.Empty,
                Status = user.Status,
                CreatedAt = user.CreatedAt
            };
        }
    }
}
