using Nafadh_Backend.Models;

public interface ICertificateRepository
{
    public interface ICertificateRepository
    {
        // TODO: define data-access contract methods for this entity

        Task<NFD_Certificate?> GetCertificateByEnrollmentIdAsync(int enrollmentId);
        Task AddCertificateAsync(NFD_Certificate certificate);
        Task<NFD_Certificate?> GetCertificateByIdAsync(int certificateId);
        Task<List<NFD_Certificate>> GetCertificatesByTraineeIdAsync(int traineeId);
    }
}