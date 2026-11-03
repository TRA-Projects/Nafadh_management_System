import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

const PERMISSIONS_STORAGE_KEY = 'nafadh_page_permissions';

export interface UserPagePermission {
    pageCode: string;
    nameAr: string;
    nameEn: string;
    url: string;
    actionFlags: number;
    dataScope: string;
    allowedActions: string[];
}

export type NavItemWithPermission<T extends { children?: T[] }> = Omit<T, 'children'> & {
    pageCode?: string;
    children?: NavItemWithPermission<T>[];
};

@Injectable({ providedIn: 'root' })
export class PagePermissionService {
    private permissionsSignal = signal<UserPagePermission[]>(this.readFromStorage());
    private loadedSignal = signal<boolean>(this.hasStoredPermissions());

    readonly permissions = computed(() => this.permissionsSignal());
    readonly loaded = computed(() => this.loadedSignal());

    constructor(private http: HttpClient) {
        // عند تحديث المتصفح (F5) والمستخدم مسجل دخول، يحدّث الصلاحيات تلقائياً من الباك إند
        if (localStorage.getItem('nafadh_session')) {
            queueMicrotask(() => {
                this.loadPermissions().subscribe();
            });
        }
    }

    loadPermissions(): Observable<UserPagePermission[]> {
        return this.http
            .get<UserPagePermission[]>(`${environment.apiBaseUrl}/PagePermission`)
            .pipe(
                tap((list) => {
                    const safeList = Array.isArray(list) ? list : [];
                    this.permissionsSignal.set(safeList);
                    this.loadedSignal.set(true);
                    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(safeList));
                }),
                catchError((err) => {
                    console.error('[PagePermission] Failed to load permissions:', err);
                    return of(this.permissionsSignal());
                })
            );
    }

    clear(): void {
        this.permissionsSignal.set([]);
        this.loadedSignal.set(false);
        localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
    }

    // فحص صلاحية إجراء معين على صفحة (View / Create / Edit / Approve / Award)
    can(pageCode: string, action: string = 'View'): boolean {
        const match = this.permissionsSignal().find(
            (p) => p.pageCode.toLowerCase() === pageCode.toLowerCase()
        );
        if (!match || !Array.isArray(match.allowedActions)) return false;
        return match.allowedActions.some(
            (a) => a.toLowerCase() === action.toLowerCase()
        );
    }

    canAny(pageCodes: string[], action: string = 'View'): boolean {
        return pageCodes.some((code) => this.can(code, action));
    }

    // جلب نطاق البيانات للصفحة (mine / assigned / department / organization / everything)
    getDataScope(pageCode: string): string {
        const match = this.permissionsSignal().find(
            (p) => p.pageCode.toLowerCase() === pageCode.toLowerCase()
        );
        return match?.dataScope ?? 'mine';
    }

    // فلترة عناصر القائمة الجانبية تلقائياً حسب صلاحية العرض (View)
    filterNavItems<T extends { children?: T[] }>(
        items: NavItemWithPermission<T>[]
    ): T[] {
        if (!this.loadedSignal() && this.permissionsSignal().length === 0) {
            return items as unknown as T[];
        }

        const result: T[] = [];

        for (const item of items) {
            if (item.children && item.children.length > 0) {
                const visibleChildren = this.filterNavItems(item.children);
                if (visibleChildren.length > 0) {
                    const { pageCode: _ignored, ...rest } = item;
                    result.push({
                        ...(rest as unknown as T),
                        children: visibleChildren,
                    });
                }
                continue;
            }

            if (!item.pageCode || this.can(item.pageCode, 'View')) {
                const { pageCode: _ignored, ...rest } = item;
                result.push(rest as unknown as T);
            }
        }

        return result;
    }

    private hasStoredPermissions(): boolean {
        return localStorage.getItem(PERMISSIONS_STORAGE_KEY) !== null;
    }

    private readFromStorage(): UserPagePermission[] {
        const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? (parsed as UserPagePermission[]) : [];
        } catch {
            return [];
        }
    }
}