import { SetMetadata } from '@nestjs/common';
import { Role } from '../types';

/**
 * 角色权限装饰器 - 用于标注接口所需的最低角色权限
 * 支持权限继承：admin > creator > collaborator > viewer
 * 使用方式：@Roles('admin', 'creator')
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
