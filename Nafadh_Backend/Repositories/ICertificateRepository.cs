using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;

public interface ICertificateRepository
{

        Task<NFD_Certificate?> GetCertificateByEnrollmentIdAsync(int enrollmentId);
        Task AddCertificateAsync(NFD_Certificate certificate);
        Task<NFD_Certificate?> GetCertificateByIdAsync(int certificateId);
        Task<List<NFD_Certificate>> GetCertificatesByTraineeIdAsync(int traineeId);
        Task<List<TraineeCertificateStatusDTO>> GetBatchCertificatesStatusAsync(int batchId);
        Task<bool> DeleteCertificateByEnrollmentIdAsync(int enrollmentId);

}