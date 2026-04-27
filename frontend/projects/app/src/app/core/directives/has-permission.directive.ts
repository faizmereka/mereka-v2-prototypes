import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
  input,
} from '@angular/core';
import { AuthStateService } from '../services/auth-state.service';

/**
 * Structural directive for permission-based rendering
 *
 * Usage:
 * <button *hasPermission="'experience.create'">Create Experience</button>
 * <div *hasPermission="['experience.edit', 'experience.delete']; mode: 'any'">...</div>
 * <div *hasPermission="['experience.edit', 'experience.delete']; mode: 'all'">...</div>
 */
@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly authState = inject(AuthStateService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  private hasView = false;

  /**
   * Permission key(s) to check
   * Can be a single string or array of strings
   */
  readonly permission = input.required<string | string[]>({ alias: 'hasPermission' });

  /**
   * Check mode: 'any' (default) or 'all'
   * 'any' - user has at least one of the permissions
   * 'all' - user has all of the permissions
   */
  readonly mode = input<'any' | 'all'>('any', { alias: 'hasPermissionMode' });

  constructor() {
    // Use effect to reactively update the view when permissions change
    effect(() => {
      const permissionValue = this.permission();
      const modeValue = this.mode();
      const permissions = this.authState.permissions();

      // Trigger re-evaluation when permissions change
      void permissions;

      this.updateView(permissionValue, modeValue);
    });
  }

  private updateView(permission: string | string[], mode: 'any' | 'all'): void {
    const hasPermission = this.checkPermission(permission, mode);

    if (hasPermission && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private checkPermission(permission: string | string[], mode: 'any' | 'all'): boolean {
    if (typeof permission === 'string') {
      return this.authState.hasPermission(permission);
    }

    if (mode === 'all') {
      return this.authState.hasAllPermissions(permission);
    }

    return this.authState.hasAnyPermission(permission);
  }
}

/**
 * Structural directive for role-based rendering
 *
 * Usage:
 * <button *hasRole="'owner'">Owner Only</button>
 * <div *hasRole="['owner', 'admin']">...</div>
 */
@Directive({
  selector: '[hasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private readonly authState = inject(AuthStateService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  private hasView = false;

  /**
   * Role key(s) to check
   * Can be a single string or array of strings
   */
  readonly role = input.required<string | string[]>({ alias: 'hasRole' });

  constructor() {
    effect(() => {
      const roleValue = this.role();
      const roles = this.authState.roles();

      // Trigger re-evaluation when roles change
      void roles;

      this.updateView(roleValue);
    });
  }

  private updateView(role: string | string[]): void {
    const hasRole = this.checkRole(role);

    if (hasRole && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasRole && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private checkRole(role: string | string[]): boolean {
    if (typeof role === 'string') {
      return this.authState.hasRole(role);
    }

    return this.authState.hasAnyRole(role);
  }
}

/**
 * Structural directive that shows content when user is NOT permitted
 *
 * Usage:
 * <div *noPermission="'experience.create'">You don't have permission to create</div>
 */
@Directive({
  selector: '[noPermission]',
  standalone: true,
})
export class NoPermissionDirective {
  private readonly authState = inject(AuthStateService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  private hasView = false;

  readonly permission = input.required<string | string[]>({ alias: 'noPermission' });
  readonly mode = input<'any' | 'all'>('any', { alias: 'noPermissionMode' });

  constructor() {
    effect(() => {
      const permissionValue = this.permission();
      const modeValue = this.mode();
      const permissions = this.authState.permissions();

      void permissions;

      this.updateView(permissionValue, modeValue);
    });
  }

  private updateView(permission: string | string[], mode: 'any' | 'all'): void {
    const hasPermission = this.checkPermission(permission, mode);

    // Show when user does NOT have permission
    if (!hasPermission && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private checkPermission(permission: string | string[], mode: 'any' | 'all'): boolean {
    if (typeof permission === 'string') {
      return this.authState.hasPermission(permission);
    }

    if (mode === 'all') {
      return this.authState.hasAllPermissions(permission);
    }

    return this.authState.hasAnyPermission(permission);
  }
}
