export type Role = 'admin' | 'creator' | 'collaborator' | 'editor' | 'viewer';

export interface RequestContext {
  familyId: string;
  role: Role;
}

// v0.2: 权限等级，用于权限继承判断
// admin > creator > collaborator > viewer
export const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 100,
  creator: 80,
  collaborator: 60,
  editor: 60, // 兼容旧数据，等同于collaborator
  viewer: 20,
};
