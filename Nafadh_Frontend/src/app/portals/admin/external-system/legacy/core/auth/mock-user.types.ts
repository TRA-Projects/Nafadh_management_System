/** Rows from `/assets/mocks/mock-users.json` (mock API only). */
export interface MockUserRow {
  id: string;
  email: string;
  displayName: string;
  role: string;
  vendorTypeId: number;
  profileTypeId: number;
  profile: Record<string, unknown>;
  /** When true, {@link authGuard} sends the job seeker to `/complete-profile` until cleared. */
  profileCompletionPending?: boolean;
}
