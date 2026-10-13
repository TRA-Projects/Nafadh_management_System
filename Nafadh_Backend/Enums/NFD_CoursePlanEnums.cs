namespace Nafadh_Backend.Enums
{
    // Course-plan workflow enums (Company Portal "Tasks & Projects").
    // Kept in their own file so the shared NFD_Enums.cs is untouched.

    /// <summary>Authority (Hay'a) approval state of a course plan.</summary>
    public enum NFD_CoursePlanApprovalStatus
    {
        Draft,
        PendingApproval,
        Approved,
        Rejected
    }

    /// <summary>Execution state of an approved plan. Only meaningful once Approved.</summary>
    public enum NFD_CoursePlanExecutionStatus
    {
        NotStarted,
        InProgress,
        OnHold,
        Completed
    }

    public enum NFD_CoursePlanItemType
    {
        Task,
        Project
    }

    /// <summary>Progress state shared by stages and their tasks/projects.</summary>
    public enum NFD_CoursePlanProgressStatus
    {
        NotStarted,
        InProgress,
        Completed
    }
}
