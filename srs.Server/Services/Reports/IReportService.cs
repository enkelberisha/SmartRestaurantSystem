using srs.Server.Dtos.Reports;

namespace srs.Server.Services.Reports
{
    public interface IReportService
    {
        Task<List<ReportResponseDto>> GetAllAsync();
        Task<ReportResponseDto> CreateAsync(CreateReportDto dto);
    }
}
