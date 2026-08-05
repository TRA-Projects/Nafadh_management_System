
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

        public async Task<UserLoginResponseDTO> LoginAsync(UserLoginDTO dto)
        {
            var user = await _repository.GetByEmailAsync(dto.Email)
                ?? throw new AuthenticationException("Invalid email or password.");

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                throw new AuthenticationException("Invalid email or password.");
            }

            if (user.Status != NFD_UserStatus.Active)
            {
                throw new AuthenticationException($"This account is {user.Status.ToString().ToLower()} and cannot sign in.");
            }

            var (token, expiresAtUtc) = _jwtTokenService.GenerateToken(user);

            return new UserLoginResponseDTO
            {
                Token = token,
                ExpiresAtUtc = expiresAtUtc,
                UserId = user.UserId,
                FullName = user.FullName,
                Email = user.Email,
                RoleId = user.RoleId,
                RoleName = user.Role?.RoleName ?? string.Empty
            };
        }

        public async Task<UserResponseDTO?> GetByIdAsync(int userId)
        {
            var user = await _repository.GetByIdWithRoleAsync(userId);
            return user is null ? null : MapToResponseDTO(user);
        }

        public async Task<UserResponseDTO> UpdateAsync(int userId, UserUpdateDTO dto)
        {
            var user = await _repository.GetByIdWithRoleAsync(userId)
                ?? throw new NotFoundException($"User {userId} was not found.");

            user.FullName = dto.FullName.Trim();
            user.Phone = dto.Phone;

            await _repository.UpdateAsync(user);
            return MapToResponseDTO(user);
        }

        public async Task<UserResponseDTO> UpdateStatusAsync(int userId, UserStatusUpdateDTO dto)
        {
            var user = await _repository.GetByIdWithRoleAsync(userId)
                ?? throw new NotFoundException($"User {userId} was not found.");

            user.Status = dto.Status;
            await _repository.UpdateAsync(user);
            return MapToResponseDTO(user);
        }

        public async Task ResetPasswordAsync(int userId, AdminResetPasswordDTO dto)
        {
            var user = await _repository.GetByIdAsync(userId)
                ?? throw new NotFoundException($"User {userId} was not found.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _repository.UpdateAsync(user);
        }

        public async Task<PagedResult<UserResponseDTO>> SearchAsync(
                                                                     int? roleId,
                                                                     NFD_UserStatus? status,
                                                                     string? search,
                                                                     int page,
                                                                     int pageSize)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;

            var (items, totalCount) = await _repository.SearchAsync(roleId, status, search, page, pageSize);

            return new PagedResult<UserResponseDTO>
            {
                Items = items.Select(MapToResponseDTO).ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<List<string>> GetEffectivePermissionsAsync(int userId)
        {
            var user = await _repository.GetByIdAsync(userId)
                ?? throw new NotFoundException($"User {userId} was not found.");

            return await _repository.GetPermissionKeysForUserAsync(user.UserId);
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
