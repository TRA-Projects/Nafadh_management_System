using Nafadh_Backend.Models;

public interface ICertificateRepository
{
    Task<NFD_Certificate?> GetCertificateByIdAsync(int certificateId);

    Task AddCertificateAsync(NFD_Certificate certificate);

    Task UpdateCertificateAsync(NFD_Certificate certificate);

    Task DeleteCertificateAsync(NFD_Certificate certificate);
}