export type Role = 'admin' | 'editor' | 'viewer';

export interface RequestContext {
  familyId: string;
  role: Role;
}
