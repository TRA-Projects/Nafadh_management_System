import {
  Component,
  OnInit,
  ElementRef,
  inject,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import * as XLSX from 'xlsx';

// @ts-ignore
import html2pdf from 'html2pdf.js';

import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  AttendanceReportDto,
  EnrollmentDto,
  CompanyProgramSummaryDto
} from '../../../../core/models/dtos';


// ============================================================
// Interfaces
// ============================================================

interface AchievementReportDto {
  total: number;
  completed: number;
  rate: number;
}

interface CapacityProgram {
  programName: string;
  allocatedQuota: number;
  usedQuota: number;
  remainingQuota: number;
  utilizationPercentage: number;
}

interface CapacityReportDto {
  total: number;
  used: number;
  remaining: number;
  programs: CapacityProgram[];
}

interface TaskReportItem {
  taskId: number;
  title: string;
  description?: string | null;
  dueDate: string;
  priority: number | string;
  status: number | string;
  batchId: number;
  createdByUserId: number;
}

interface ProgramProgress {
  programName: string;
  shortName: string;
  progress: number;
  colorClass: string;
}


// ============================================================
// Component
// ============================================================

@Component({
  selector: 'app-company-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss'
})
export class ReportsComponent implements OnInit {

  private readonly elementRef = inject(ElementRef);
  private readonly api = inject(CompanyApi);
  private readonly auth = inject(AuthService);


  // ============================================================
  // Tabs
  // ============================================================

  readonly tab = signal<
    'attendance'
    | 'achievement'
    | 'capacity'
    | 'evaluations'
    | 'tasks'
    | 'comparison'
  >('attendance');


  // ============================================================
  // State
  // ============================================================

  readonly loading =
    signal(false);

  readonly errorMessage =
    signal<string | null>(null);


  // ============================================================
  // Reports Data
  // ============================================================

  readonly attendance =
    signal<AttendanceReportDto | null>(null);

  readonly achievement =
    signal<AchievementReportDto | null>(null);

  readonly capacity =
    signal<CapacityReportDto | null>(null);

  readonly programProgressList =
    signal<ProgramProgress[]>([]);

  readonly tasks =
    signal<TaskReportItem[]>([]);


  // ============================================================
  // Task Computed
  // ============================================================

  readonly totalTasks =
    computed(() =>
      this.tasks().length
    );


  readonly completedTasks =
    computed(() =>
      this.tasks().filter(task =>
        task.status === 1 ||
        task.status === 'Closed'
      ).length
    );


  readonly openTasks =
    computed(() =>
      this.tasks().filter(task =>
        task.status === 0 ||
        task.status === 'Open'
      ).length
    );


  readonly overdueTasks =
    computed(() =>
      this.tasks().filter(task =>
        task.status === 2 ||
        task.status === 'Overdue'
      ).length
    );


  readonly taskCompletionRate =
    computed(() => {

      const total =
        this.totalTasks();

      if (total === 0) {
        return 0;
      }

      return Math.round(
        (this.completedTasks() / total) * 100
      );

    });


  // ============================================================
  // Init
  // ============================================================

  ngOnInit(): void {

    this.loadInitialData();

  }


  // ============================================================
  // Load Reports
  // ============================================================

  private loadInitialData(): void {

    const companyId =
      this.auth.companyId ?? 0;


    if (!companyId) {

      this.errorMessage.set(
        'لا يمكن تحديد الشركة الحالية من جلسة الدخول.'
      );

      return;
    }


    this.loading.set(true);
    this.errorMessage.set(null);


    forkJoin({

      // ========================================================
      // المهام
      // ========================================================

      tasks:
        this.api
          .getCompanyTasks(companyId)
          .pipe(
            catchError(() =>
              of([] as TaskReportItem[])
            )
          ),


      // ========================================================
      // حضور الشركة
      // ========================================================

      attendance:
        this.api
          .getCompanyAttendanceReport(companyId)
          .pipe(
            catchError(() =>
              of(null)
            )
          ),


      // ========================================================
      // مخطط الحضور
      // ========================================================

      attendanceChart:
        this.api
          .getAttendanceChart(companyId)
          .pipe(
            catchError(() =>
              of({
                weeks: []
              })
            )
          ),


      // ========================================================
      // الطاقة الاستيعابية
      // ========================================================

      capacity:
        this.api
          .getCapacity(companyId)
          .pipe(
            catchError(() =>
              of({
                total: 0,
                used: 0,
                remaining: 0
              } as any)
            )
          ),


      // ========================================================
      // توزيع البرامج
      // ========================================================

      distribution:
        this.api
          .getProgramDistribution(companyId)
          .pipe(
            catchError(() =>
              of([])
            )
          ),


      // ========================================================
      // ملخص البرامج
      // ========================================================

      programSummaries:
        this.api
          .getCompanyProgramSummaries(companyId)
          .pipe(
            catchError(() =>
              of(
                [] as CompanyProgramSummaryDto[]
              )
            )
          ),


      // ========================================================
      // المتدربون
      // ========================================================

      enrollments:
        this.api
          .getEnrollmentsByCompany(companyId)
          .pipe(
            catchError(() =>
              of(
                [] as EnrollmentDto[]
              )
            )
          )

    }).subscribe({

      // ========================================================
      // Success
      // ========================================================

      next: ({
        tasks,
        attendance,
        attendanceChart,
        capacity,
        distribution,
        programSummaries,
        enrollments
      }) => {


        // ======================================================
        // Tasks
        // ======================================================

        this.tasks.set(
          tasks ?? []
        );


        // ======================================================
        // Attendance
        // ======================================================

        this.attendance.set(

          attendance
            ? {
                ...attendance,

                chart:
                  attendanceChart?.weeks ?? []
              }

            : null

        );


        // ======================================================
        // No trainees
        // ======================================================

        if (!enrollments?.length) {

          this.setAchievementAndCapacity(
            [],
            distribution as any[],
            capacity as any,
            programSummaries ?? []
          );

          this.loading.set(false);

          return;
        }


        // ======================================================
        // Get progress for every trainee
        // ======================================================

        const progressRequests =
          enrollments.map((e) =>

            this.api
              .getProgressSummary(
                e.enrollmentId
              )
              .pipe(

                catchError(() =>
                  of({
                    enrollmentId:
                      e.enrollmentId,

                    totalModules: 0,

                    completedModules: 0,

                    progressPercentage: 0
                  })
                ),

                map(progress => ({
                  enrollment: e,
                  progress
                }))

              )

          );


        // ======================================================
        // Progress results
        // ======================================================

        forkJoin(progressRequests)
          .subscribe({

            // ==================================================
            // Progress Success
            // ==================================================

            next: (items) => {

              // ================================================
              // Program Progress Group
              // ================================================

              const group =
                new Map<
                  string,
                  {
                    total: number;
                    sum: number;
                  }
                >();


              items.forEach(
                ({ enrollment, progress }) => {

                  const programName =
                    enrollment.programTitle ||
                    'غير محدد';


                  const current =
                    group.get(programName) ??
                    {
                      total: 0,
                      sum: 0
                    };


                  current.total += 1;


                  current.sum +=
                    Number(
                      progress.progressPercentage ?? 0
                    );


                  group.set(
                    programName,
                    current
                  );

                }
              );


              // ================================================
              // Program Progress List
              // ================================================

              this.programProgressList.set(

                Array.from(
                  group.entries()
                ).map(
                  (
                    [programName, value],
                    index
                  ) => ({

                    programName,

                    shortName:
                      programName.length > 18
                        ? `${programName.slice(0, 18)}…`
                        : programName,

                    progress:
                      Math.round(
                        value.sum /
                        Math.max(
                          1,
                          value.total
                        )
                      ),

                    colorClass:
                      [
                        'blue',
                        'cyan',
                        'purple',
                        'orange',
                        'red',
                        'green'
                      ][index % 6]

                  })
                )

              );


              // ================================================
              // Achievement
              // ================================================

              const completed =
                items.filter(
                  ({ progress }) =>
                    Number(
                      progress.progressPercentage ?? 0
                    ) >= 100
                ).length;


              const total =
                enrollments.length;


              const rate =
                total
                  ? Math.round(
                      (completed * 100) /
                      total
                    )
                  : 0;


              this.achievement.set({

                total,

                completed,

                rate

              });


              // ================================================
              // Capacity
              // ================================================

              this.setCapacity(

                enrollments,

                distribution as any[],

                capacity as any,

                programSummaries ?? []

              );


              this.loading.set(false);

            },


            // ================================================
            // Progress Error
            // ================================================

            error: () => {

              this.setAchievementAndCapacity(

                enrollments ?? [],

                distribution as any[],

                capacity as any,

                programSummaries ?? []

              );

              this.loading.set(false);

            }

          });

      },


      // ========================================================
      // Main Error
      // ========================================================

      error: () => {

        this.errorMessage.set(
          'تعذر تحميل تقارير الشركة من قاعدة البيانات.'
        );

        this.loading.set(false);

      }

    });

  }


  // ============================================================
  // Achievement + Capacity fallback
  // ============================================================

  private setAchievementAndCapacity(

    enrollments: EnrollmentDto[],

    distribution: any[],

    capacity: any,

    programSummaries:
      CompanyProgramSummaryDto[]

  ): void {


    const completed =
      enrollments.filter(
        e =>
          /Completed/i.test(
            e.completionStatus ?? ''
          )
      ).length;


    const total =
      enrollments.length;


    this.achievement.set({

      total,

      completed,

      rate:
        total
          ? Math.round(
              (completed * 100) /
              total
            )
          : 0

    });


    this.setCapacity(

      enrollments,

      distribution,

      capacity,

      programSummaries

    );


    this.programProgressList.set([]);

  }


  // ============================================================
  // Capacity
  // ============================================================

  private setCapacity(

    enrollments: EnrollmentDto[],

    distribution: any[],

    capacity: any,

    programSummaries:
      CompanyProgramSummaryDto[]

  ): void {


    const total =
      Number(
        capacity?.total ?? 0
      );


    const used =
      Number(
        capacity?.used ??
        enrollments.length
      );


    const remaining =
      Number(
        capacity?.remaining ??
        Math.max(
          0,
          total - used
        )
      );


    // ==========================================================
    // Programs
    // ==========================================================

    const programs:
      CapacityProgram[] =

      programSummaries?.length

        ? programSummaries.map(
            program => ({

              programName:
                program.title,

              allocatedQuota:
                Number(
                  program.allocatedCapacity ?? 0
                ),

              usedQuota:
                Number(
                  program.usedCapacity ?? 0
                ),

              remainingQuota:
                Number(
                  program.remainingCapacity ?? 0
                ),

              utilizationPercentage:
                Number(
                  program.utilizationPercentage ?? 0
                )

            })
          )

        : (distribution ?? []).map(
            (item: any) => ({

              programName:
                String(
                  item?.label ??
                  'غير محدد'
                ),

              allocatedQuota:
                0,

              usedQuota:
                Number(
                  item?.value ?? 0
                ),

              remainingQuota:
                0,

              utilizationPercentage:
                0

            })
          );


    this.capacity.set({

      total,

      used,

      remaining,

      programs

    });

  }


  // ============================================================
  // Tab
  // ============================================================

  selectTab(
    tab:
      | 'attendance'
      | 'achievement'
      | 'capacity'
      | 'evaluations'
      | 'tasks'
      | 'comparison'
  ): void {

    this.tab.set(tab);

  }


  // ============================================================
  // Attendance Computed
  // ============================================================

  readonly attendanceChart =
    computed(
      () =>
        this.attendance()?.chart ?? []
    );


  readonly totalTrainees =
    computed(
      () =>
        this.attendance()?.rows?.length ?? 0
    );


  readonly totalPresentDays =
    computed(
      () =>
        this.attendance()
          ?.rows
          ?.reduce(
            (total, row) =>
              total +
              Number(
                row.presentDays ?? 0
              ),
            0
          ) ?? 0
    );


  readonly totalExcusedDays =
    computed(
      () =>
        this.attendance()
          ?.rows
          ?.reduce(
            (total, row) =>
              total +
              Number(
                row.excusedDays ?? 0
              ),
            0
          ) ?? 0
    );


  readonly attendanceRate =
    computed(
      () =>
        Number(
          this.attendance()
            ?.overallAttendanceRate ?? 0
        )
    );


  readonly totalAbsentDays =
    computed(
      () =>
        this.attendance()
          ?.rows
          ?.reduce(
            (total, row) =>
              total +
              Number(
                row.absentDays ?? 0
              ),
            0
          ) ?? 0
    );


  readonly totalLateDays =
    computed(
      () =>
        this.attendance()
          ?.rows
          ?.reduce(
            (total, row) =>
              total +
              Number(
                row.lateDays ?? 0
              ),
            0
          ) ?? 0
    );


  // ============================================================
  // Attendance Helper
  // ============================================================

  attendanceLabel(
    rate: number
  ): string {

    return rate >= 90
      ? 'ممتاز'
      : rate >= 75
        ? 'جيد'
        : 'يحتاج متابعة';

  }


  // ============================================================
  // Initials
  // ============================================================

  getInitials(
    name?: string
  ): string {

    const parts =
      (name ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);


    return parts.length

      ? parts
          .slice(0, 2)
          .map(
            x => x[0]
          )
          .join('')

      : '?';

  }


  // ============================================================
  // Percentage
  // ============================================================

  clampPercentage(
    value: number | undefined
  ): number {

    return Math.max(
      0,
      Math.min(
        100,
        Number(
          value ?? 0
        )
      )
    );

  }


  // ============================================================
  // Achievement Computed
  // ============================================================

  readonly achievementRate =
    computed(
      () =>
        this.achievement()?.rate ?? 0
    );


  readonly bestProgram =
    computed(() => {

      const list =
        this.programProgressList();


      return list.length

        ? [...list].sort(
            (a, b) =>
              b.progress -
              a.progress
          )[0]

        : null;

    });


  readonly weakestProgram =
    computed(() => {

      const list =
        this.programProgressList();


      return list.length

        ? [...list].sort(
            (a, b) =>
              a.progress -
              b.progress
          )[0]

        : null;

    });


  // ============================================================
  // Capacity Computed
  // ============================================================

  readonly capacityPercentage =
    computed(() => {

      const data =
        this.capacity();


      return data?.total

        ? this.clampPercentage(
            (data.used /
              data.total) *
              100
          )

        : 0;

    });


  readonly ringCircumference =
    2 *
    Math.PI *
    78;


  readonly ringDashoffset =
    computed(() =>

      this.ringCircumference *
      (
        1 -
        this.capacityPercentage() /
        100
      )

    );


  // ============================================================
  // Task Helpers
  // ============================================================

  getTaskStatusLabel(
    status: number | string
  ): string {

    if (
      status === 1 ||
      status === 'Closed'
    ) {

      return 'مكتملة';

    }


    if (
      status === 2 ||
      status === 'Overdue'
    ) {

      return 'متأخرة';

    }


    return 'مفتوحة';

  }


  getTaskPriorityLabel(
    priority: number | string
  ): string {

    if (
      priority === 0 ||
      priority === 'Low'
    ) {

      return 'منخفضة';

    }


    if (
      priority === 1 ||
      priority === 'Medium'
    ) {

      return 'متوسطة';

    }


    if (
      priority === 2 ||
      priority === 'High'
    ) {

      return 'عالية';

    }


    return 'حرجة';

  }


  // ============================================================
  // Refresh
  // ============================================================

  refreshReports(): void {

    this.loadInitialData();

  }


  // ============================================================
  // Export PDF
  // ============================================================

  exportPdf(): void {

    const element =
      this.elementRef.nativeElement
        .querySelector(
          '.reports-page'
        );


    if (!element) {

      return;

    }


    (html2pdf as any)()

      .set({

        margin: 8,

        filename:
          `report_${new Date()
            .toISOString()
            .slice(0, 10)}.pdf`,

        image: {
          type: 'jpeg',
          quality: 0.95
        },

        html2canvas: {
          scale: 2,
          useCORS: true
        },

        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'landscape'
        }

      })

      .from(element)

      .save();

  }


  // ============================================================
  // Export Excel
  // ============================================================

  exportExcel(): void {

    const workbook =
      XLSX.utils.book_new();


    // ========================================================
    // الحضور
    // ========================================================

    XLSX.utils.book_append_sheet(

      workbook,

      XLSX.utils.json_to_sheet(
        this.attendance()?.rows ?? []
      ),

      'الحضور'

    );


    // ========================================================
    // الطاقة الاستيعابية
    // ========================================================

    XLSX.utils.book_append_sheet(

      workbook,

      XLSX.utils.json_to_sheet(
        this.capacity()?.programs ?? []
      ),

      'الطاقة الاستيعابية'

    );


    // ========================================================
    // الإنجاز
    // ========================================================

    XLSX.utils.book_append_sheet(

      workbook,

      XLSX.utils.json_to_sheet(
        this.programProgressList()
      ),

      'الإنجاز'

    );


    // ========================================================
    // المهام
    // ========================================================

    XLSX.utils.book_append_sheet(

      workbook,

      XLSX.utils.json_to_sheet(
        this.tasks()
      ),

      'المهام'

    );


    // ========================================================
    // Save
    // ========================================================

    XLSX.writeFile(

      workbook,

      `تقرير_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`

    );

  }

}
