import {
  Component,
  OnInit,
  computed,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  catchError,
  forkJoin,
  of
} from 'rxjs';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  BatchDto,
  LessonDto,
  ModuleDto,
  ProgramDto,
  TrainerBatchDto,
  TrainerDto,
  TrainingMaterialDto
} from '../../../../core/models/dtos';


type ContentCreateType =
  | 'module'
  | 'lesson';


type MaterialFileType =
  | 'Pdf'
  | 'Video'
  | 'Image'
  | 'Document'
  | 'Other';


@Component({
  selector: 'app-trainer-content',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './content.html',
})
export class TrainerContent implements OnInit {

  // =====================================================
  // TRAINER
  // =====================================================

  trainer =
    signal<TrainerDto | null>(null);


  // =====================================================
  // TRAINER BATCHES
  // =====================================================

  batches =
    signal<TrainerBatchDto[]>([]);

  loadingBatches =
    signal(false);

  batchIdInput = 0;

  requestedBatchId:
    number | null = null;


  // =====================================================
  // CURRENT BATCH / PROGRAM
  // =====================================================

  batch =
    signal<BatchDto | null>(null);

  program =
    signal<ProgramDto | null>(null);


  // =====================================================
  // MODULES / LESSONS
  // =====================================================

  modules =
    signal<ModuleDto[]>([]);

  lessons =
    signal<LessonDto[]>([]);


  // المواد مقسمة حسب LessonId
  materialsByLesson =
    signal<Record<number, TrainingMaterialDto[]>>({});


  activeModules =
    computed(() =>
      this.modules().filter(
        module =>
          !module.isArchived
      )
    );


  archivedModules =
    computed(() =>
      this.modules().filter(
        module =>
          module.isArchived
      )
    );


  // =====================================================
  // PAGE STATE
  // =====================================================

  loading =
    signal(false);

  saving =
    signal(false);

  errorMessage =
    signal('');

  successMessage =
    signal('');


  // =====================================================
  // MODALS
  // =====================================================

  showModal =
    signal(false);

  showFileModal =
    signal(false);

  showRefModal =
    signal(false);

  showArchiveModal =
    signal(false);


  // =====================================================
  // CREATE MODULE / LESSON
  // =====================================================

  createType:
    ContentCreateType =
      'module';

  title = '';

  lessonContentBody = '';

  selectedModuleId:
    number | null =
      null;


  // =====================================================
  // FILE UPLOAD
  // =====================================================

  selectedFile:
    File | null =
      null;

  selectedFileType:
    MaterialFileType | null =
      null;

  fileLessonId:
    number | null =
      null;


  // =====================================================
  // REFERENCE
  // =====================================================

  refLink = '';

  referenceLessonId:
    number | null =
      null;


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private api: TrainerApi,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    const batchIdParam =
      this.route.snapshot
        .queryParamMap
        .get('batchId');


    if (batchIdParam) {

      const parsedBatchId =
        Number(batchIdParam);


      if (
        !Number.isNaN(parsedBatchId) &&
        parsedBatchId > 0
      ) {

        this.requestedBatchId =
          parsedBatchId;

      }

    }


    this.loadCurrentTrainer();

  }


  // =====================================================
  // LOAD CURRENT TRAINER
  // =====================================================

  private loadCurrentTrainer(): void {

    const userId =
      this.auth.session()?.userId;


    if (!userId) {

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي.'
      );

      this.batches.set([]);

      return;
    }


    this.loadingBatches.set(true);

    this.errorMessage.set('');


    this.api
      .getTrainerByUserId(userId)
      .subscribe({

        next: (trainer) => {

          this.trainer.set(
            trainer
          );


          this.loadTrainerBatches(
            trainer.trainerId
          );

        },


        error: (error) => {

          console.error(
            'Error loading trainer:',
            error
          );


          this.loadingBatches.set(false);

          this.batches.set([]);

          this.errorMessage.set(
            'تعذر تحميل بيانات المدرب.'
          );

        }

      });

  }


  // =====================================================
  // LOAD TRAINER BATCHES
  // =====================================================

  private loadTrainerBatches(
    trainerId: number
  ): void {

    this.api
      .getMyBatches(trainerId)
      .subscribe({

        next: (data) => {

          const result =
            data ?? [];


          this.batches.set(
            result
          );


          this.loadingBatches.set(
            false
          );


          if (
            result.length === 0
          ) {

            this.clearContent();

            this.errorMessage.set(
              'لا توجد دفعات مسندة لهذا المدرب.'
            );

            return;
          }


          const requestedBatch =
            this.requestedBatchId
              ? result.find(
                  item =>
                    item.batchId ===
                    this.requestedBatchId
                )
              : undefined;


          const selectedBatch =
            requestedBatch ??
            result[0];


          this.batchIdInput =
            selectedBatch.batchId;


          this.updateBatchQueryParam();

          this.loadSelectedBatch();

        },


        error: (error) => {

          console.error(
            'Error loading trainer batches:',
            error
          );


          this.loadingBatches.set(false);

          this.batches.set([]);

          this.clearContent();

          this.errorMessage.set(
            'تعذر تحميل دفعات المدرب.'
          );

        }

      });

  }


  // =====================================================
  // BATCH CHANGE
  // =====================================================

  onBatchChange(): void {

    if (
      !this.batchIdInput
    ) {

      this.clearContent();

      return;
    }


    this.errorMessage.set('');

    this.successMessage.set('');

    this.updateBatchQueryParam();

    this.loadSelectedBatch();

  }


  // =====================================================
  // UPDATE URL
  // =====================================================

  private updateBatchQueryParam(): void {

    if (
      !this.batchIdInput
    ) {

      return;

    }


    this.router.navigate(
      [],
      {
        relativeTo:
          this.route,

        queryParams: {
          batchId:
            this.batchIdInput
        },

        queryParamsHandling:
          'merge',

        replaceUrl:
          true
      }
    );

  }


  // =====================================================
  // SELECTED TRAINER BATCH
  // =====================================================

  selectedTrainerBatch():
    TrainerBatchDto | undefined {

    return this.batches()
      .find(
        item =>
          item.batchId ===
          this.batchIdInput
      );

  }


  // =====================================================
  // LOAD SELECTED BATCH
  // =====================================================

  private loadSelectedBatch(): void {

    if (
      !this.batchIdInput
    ) {

      this.clearContent();

      return;
    }


    this.loading.set(true);

    this.errorMessage.set('');

    this.successMessage.set('');


    // نمسح بيانات الدفعة السابقة
    this.batch.set(null);

    this.program.set(null);

    this.modules.set([]);

    this.lessons.set([]);

    this.materialsByLesson.set({});

    this.selectedModuleId =
      null;

    this.fileLessonId =
      null;

    this.referenceLessonId =
      null;


    this.api
      .getBatch(
        this.batchIdInput
      )
      .subscribe({

        next: (batch) => {

          this.batch.set(
            batch
          );


          this.loadProgramContent(
            batch.programId
          );

        },


        error: (error) => {

          console.error(
            'Error loading batch:',
            error
          );


          this.loading.set(false);

          this.clearContent();

          this.errorMessage.set(
            'تعذر تحميل بيانات الدفعة.'
          );

        }

      });

  }


  // =====================================================
  // LOAD PROGRAM + MODULES
  // =====================================================

  private loadProgramContent(
    programId: number
  ): void {

    forkJoin({

      program:
        this.api
          .getProgram(programId)
          .pipe(
            catchError(
              error => {

                console.error(
                  'Error loading program:',
                  error
                );


                return of(
                  null as ProgramDto | null
                );

              }
            )
          ),


      modules:
        this.api
          .getModulesByProgram(
            programId
          )

    })
      .subscribe({

        next: ({
          program,
          modules
        }) => {

          this.program.set(
            program
          );


          const sortedModules =
            [...(modules ?? [])]
              .sort(
                (a, b) =>
                  a.orderIndex -
                  b.orderIndex
              );


          this.modules.set(
            sortedModules
          );


          const firstActiveModule =
            sortedModules.find(
              module =>
                !module.isArchived
            );


          this.selectedModuleId =
            firstActiveModule
              ?.moduleId ??
            null;


          this.loadAllLessons(
            sortedModules
          );

        },


        error: (error) => {

          console.error(
            'Error loading program content:',
            error
          );


          this.loading.set(false);

          this.modules.set([]);

          this.lessons.set([]);

          this.materialsByLesson.set({});

          this.errorMessage.set(
            'تعذر تحميل محتوى البرنامج.'
          );

        }

      });

  }


  // =====================================================
  // LOAD ALL LESSONS
  // =====================================================

  private loadAllLessons(
    modules: ModuleDto[]
  ): void {

    if (
      modules.length === 0
    ) {

      this.lessons.set([]);

      this.materialsByLesson.set({});

      this.fileLessonId =
        null;

      this.referenceLessonId =
        null;

      this.loading.set(false);

      return;
    }


    const requests =
      modules.map(
        module =>
          this.api
            .getLessonsByModule(
              module.moduleId
            )
            .pipe(
              catchError(
                error => {

                  console.error(
                    `Error loading lessons for module ${module.moduleId}:`,
                    error
                  );


                  return of(
                    [] as LessonDto[]
                  );

                }
              )
            )
      );


    forkJoin(requests)
      .subscribe({

        next: (results) => {

          const allLessons =
            results
              .flat()
              .sort(
                (a, b) =>
                  (a.orderIndex ?? 0) -
                  (b.orderIndex ?? 0)
              );


          this.lessons.set(
            allLessons
          );


          const firstLesson =
            allLessons[0];


          this.fileLessonId =
            firstLesson
              ?.lessonId ??
            null;


          this.referenceLessonId =
            firstLesson
              ?.lessonId ??
            null;


          // بعد تحميل الدروس
          // نجيب المواد المرتبطة بكل درس
          this.loadAllMaterials(
            allLessons
          );

        },


        error: (error) => {

          console.error(
            'Error loading lessons:',
            error
          );


          this.lessons.set([]);

          this.materialsByLesson.set({});

          this.fileLessonId =
            null;

          this.referenceLessonId =
            null;

          this.loading.set(false);

        }

      });

  }


  // =====================================================
  // LOAD ALL TRAINING MATERIALS
  // =====================================================

  private loadAllMaterials(
    lessons: LessonDto[]
  ): void {

    if (
      lessons.length === 0
    ) {

      this.materialsByLesson.set({});

      this.loading.set(false);

      return;
    }


    const requests =
      lessons.map(
        lesson =>
          this.api
            .getTrainingMaterialsByLesson(
              lesson.lessonId
            )
            .pipe(
              catchError(
                error => {

                  console.error(
                    `Error loading materials for lesson ${lesson.lessonId}:`,
                    error
                  );


                  return of(
                    [] as TrainingMaterialDto[]
                  );

                }
              )
            )
      );


    forkJoin(requests)
      .subscribe({

        next: (results) => {

          const materialsMap:
            Record<number, TrainingMaterialDto[]> =
            {};


          lessons.forEach(
            (lesson, index) => {

              materialsMap[
                lesson.lessonId
              ] =
                results[index] ?? [];

            }
          );


          this.materialsByLesson.set(
            materialsMap
          );


          this.loading.set(false);

        },


        error: (error) => {

          console.error(
            'Error loading training materials:',
            error
          );


          this.materialsByLesson.set({});

          this.loading.set(false);

        }

      });

  }


  // =====================================================
  // RELOAD MATERIALS FOR ONE LESSON
  // =====================================================

  private loadMaterialsForLesson(
    lessonId: number
  ): void {

    this.api
      .getTrainingMaterialsByLesson(
        lessonId
      )
      .subscribe({

        next: (materials) => {

          this.materialsByLesson.update(
            current => ({

              ...current,

              [lessonId]:
                materials ?? []

            })
          );

        },


        error: (error) => {

          console.error(
            `Error reloading materials for lesson ${lessonId}:`,
            error
          );

        }

      });

  }


  // =====================================================
  // CLEAR CONTENT
  // =====================================================

  private clearContent(): void {

    this.batch.set(null);

    this.program.set(null);

    this.modules.set([]);

    this.lessons.set([]);

    this.materialsByLesson.set({});

    this.selectedModuleId =
      null;

    this.fileLessonId =
      null;

    this.referenceLessonId =
      null;

    this.loading.set(false);

  }


  // =====================================================
  // OPEN CREATE MODAL
  // =====================================================

  openCreateModal(
    type: ContentCreateType
  ): void {

    if (
      !this.batch()
    ) {

      this.errorMessage.set(
        'اختاري الدفعة أولاً.'
      );

      return;
    }


    if (
      type === 'lesson' &&
      this.activeModules().length === 0
    ) {

      this.errorMessage.set(
        'يجب إنشاء وحدة أولاً قبل إنشاء درس.'
      );

      return;
    }


    this.errorMessage.set('');

    this.successMessage.set('');

    this.createType =
      type;

    this.title = '';

    this.lessonContentBody = '';


    if (
      type === 'lesson'
    ) {

      this.selectedModuleId =
        this.activeModules()[0]
          ?.moduleId ??
        null;

    }


    this.showModal.set(
      true
    );

  }


  // =====================================================
  // CREATE MODULE / LESSON
  // =====================================================

  create(): void {

    const cleanTitle =
      this.title.trim();


    if (
      !cleanTitle
    ) {

      this.errorMessage.set(
        'اكتبي عنوان المحتوى.'
      );

      return;
    }


    const currentBatch =
      this.batch();


    if (
      !currentBatch
    ) {

      this.errorMessage.set(
        'اختاري الدفعة أولاً.'
      );

      return;
    }


    this.saving.set(true);

    this.errorMessage.set('');

    this.successMessage.set('');


    // ===================================================
    // CREATE MODULE
    // ===================================================

    if (
      this.createType ===
      'module'
    ) {

      this.api
        .createModule({

          programId:
            currentBatch.programId,

          title:
            cleanTitle,

          orderIndex:
            this.getNextModuleOrderIndex(),

          availableFrom:
            null,

          availableTo:
            null,

          prerequisiteModuleId:
            null

        })
        .subscribe({

          next: () => {

            this.afterCreate(
              'تم إنشاء الوحدة بنجاح.'
            );

          },


          error: (error) => {

            console.error(
              'Error creating module:',
              error
            );


            this.saving.set(false);

            this.errorMessage.set(
              'تعذر إنشاء الوحدة.'
            );

          }

        });


      return;

    }


    // ===================================================
    // CREATE LESSON
    // ===================================================

    if (
      !this.selectedModuleId
    ) {

      this.saving.set(false);

      this.errorMessage.set(
        'اختاري الوحدة أولاً.'
      );

      return;
    }


    const moduleLessons =
      this.lessons()
        .filter(
          lesson =>
            lesson.moduleId ===
            this.selectedModuleId
        );


    const nextOrderIndex =
      moduleLessons.length > 0
        ? Math.max(
            ...moduleLessons.map(
              lesson =>
                lesson.orderIndex ?? 0
            )
          ) + 1
        : 1;


    this.api
      .createLesson({

        moduleId:
          this.selectedModuleId,

        title:
          cleanTitle,

        contentBody:
          this.lessonContentBody
            .trim() ||
          null,

        orderIndex:
          nextOrderIndex

      })
      .subscribe({

        next: () => {

          this.afterCreate(
            'تم إنشاء الدرس بنجاح.'
          );

        },


        error: (error) => {

          console.error(
            'Error creating lesson:',
            error
          );


          this.saving.set(false);

          this.errorMessage.set(
            'تعذر إنشاء الدرس.'
          );

        }

      });

  }


  // =====================================================
  // AFTER CREATE
  // =====================================================

  private afterCreate(
    message: string
  ): void {

    this.showModal.set(false);

    this.saving.set(false);

    this.title = '';

    this.lessonContentBody = '';

    this.successMessage.set(
      message
    );


    const currentBatch =
      this.batch();


    if (
      currentBatch
    ) {

      this.loadProgramContent(
        currentBatch.programId
      );

    }

  }


  // =====================================================
  // NEXT MODULE ORDER
  // =====================================================

  private getNextModuleOrderIndex():
    number {

    const currentModules =
      this.modules();


    if (
      currentModules.length === 0
    ) {

      return 1;

    }


    return (
      Math.max(
        ...currentModules.map(
          module =>
            module.orderIndex
        )
      ) + 1
    );

  }


  // =====================================================
  // FILE SELECTED
  // =====================================================

  onFileSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    const file =
      input.files?.[0] ??
      null;


    this.selectedFile =
      file;


    this.selectedFileType =
      file
        ? this.detectFileType(file)
        : null;

  }


  // =====================================================
  // DETECT FILE TYPE
  // =====================================================

  private detectFileType(
    file: File
  ): MaterialFileType {

    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() ??
      '';


    if (
      extension === 'pdf'
    ) {

      return 'Pdf';

    }


    if (
      [
        'mp4',
        'mov',
        'avi',
        'mkv',
        'webm'
      ].includes(extension)
    ) {

      return 'Video';

    }


    if (
      [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp'
      ].includes(extension)
    ) {

      return 'Image';

    }


    if (
      [
        'doc',
        'docx',
        'ppt',
        'pptx',
        'xls',
        'xlsx',
        'txt'
      ].includes(extension)
    ) {

      return 'Document';

    }


    return 'Other';

  }


  // =====================================================
  // UPLOAD FILE
  // =====================================================

  uploadFile(): void {

    const userId =
      this.auth.session()?.userId;


    if (
      !userId
    ) {

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي.'
      );

      return;
    }


    if (
      !this.fileLessonId
    ) {

      this.errorMessage.set(
        'اختاري الدرس أولاً.'
      );

      return;
    }


    if (
      !this.selectedFile ||
      !this.selectedFileType
    ) {

      this.errorMessage.set(
        'اختاري الملف أولاً.'
      );

      return;
    }


    const lessonId =
      this.fileLessonId;


    this.saving.set(true);

    this.errorMessage.set('');

    this.successMessage.set('');


    this.api
      .uploadTrainingMaterial(
        this.selectedFile,
        this.selectedFileType,
        lessonId,
        userId
      )
      .subscribe({

        next: () => {

          this.saving.set(false);

          this.showFileModal.set(
            false
          );

          this.selectedFile =
            null;

          this.selectedFileType =
            null;


          this.successMessage.set(
            'تم رفع المادة بنجاح.'
          );


          // نحدث مواد هذا الدرس مباشرة
          this.loadMaterialsForLesson(
            lessonId
          );

        },


        error: (error) => {

          console.error(
            'Error uploading material:',
            error
          );


          this.saving.set(false);

          this.errorMessage.set(
            'تعذر رفع المادة.'
          );

        }

      });

  }


  // =====================================================
  // ADD REFERENCE
  // =====================================================

  addReference(): void {

    const userId =
      this.auth.session()?.userId;


    const link =
      this.refLink.trim();


    if (
      !userId
    ) {

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي.'
      );

      return;
    }


    if (
      !this.referenceLessonId
    ) {

      this.errorMessage.set(
        'اختاري الدرس أولاً.'
      );

      return;
    }


    if (
      !link
    ) {

      this.errorMessage.set(
        'أدخلي رابط المرجع.'
      );

      return;
    }


    if (
      !link.startsWith('http://') &&
      !link.startsWith('https://')
    ) {

      this.errorMessage.set(
        'الرابط يجب أن يبدأ بـ http:// أو https://'
      );

      return;
    }


    const lessonId =
      this.referenceLessonId;


    this.saving.set(true);

    this.errorMessage.set('');

    this.successMessage.set('');


    this.api
      .createMaterial({

        fileUrl:
          link,

        fileType:
          'Link',

        lessonId,

        uploadedByUserId:
          userId

      })
      .subscribe({

        next: () => {

          this.saving.set(false);

          this.showRefModal.set(
            false
          );

          this.refLink = '';


          this.successMessage.set(
            'تمت إضافة المرجع بنجاح.'
          );


          // نحدث مواد هذا الدرس مباشرة
          this.loadMaterialsForLesson(
            lessonId
          );

        },


        error: (error) => {

          console.error(
            'Error adding reference:',
            error
          );


          this.saving.set(false);

          this.errorMessage.set(
            'تعذر إضافة المرجع.'
          );

        }

      });

  }


  // =====================================================
  // HELPERS
  // =====================================================

  getModuleTitle(
    moduleId: number
  ): string {

    return (
      this.modules()
        .find(
          module =>
            module.moduleId ===
            moduleId
        )
        ?.title ??
      'وحدة'
    );

  }


  getLessonsForModule(
    moduleId: number
  ): LessonDto[] {

    return this.lessons()
      .filter(
        lesson =>
          lesson.moduleId ===
          moduleId
      );

  }


  getProgramName(): string {

    const currentProgram =
      this.program();


    return (
      currentProgram?.title ||
      currentProgram?.name ||
      'البرنامج'
    );

  }


  // =====================================================
  // MATERIAL ICON
  // =====================================================

  getMaterialIcon(
    fileType: TrainingMaterialDto['fileType']
  ): string {

    switch (
      fileType
    ) {

      case 'Pdf':
        return '📕';

      case 'Video':
        return '🎬';

      case 'Image':
        return '🖼️';

      case 'Document':
        return '📄';

      case 'Link':
        return '🔗';

      default:
        return '📎';

    }

  }


  // =====================================================
  // MATERIAL NAME
  // =====================================================

  getMaterialName(
    material: TrainingMaterialDto
  ): string {

    if (
      material.fileType ===
      'Link'
    ) {

      return material.fileUrl;

    }


    const parts =
      material.fileUrl
        .split('/');


    return (
      parts[
        parts.length - 1
      ] ||
      'ملف'
    );

  }

}