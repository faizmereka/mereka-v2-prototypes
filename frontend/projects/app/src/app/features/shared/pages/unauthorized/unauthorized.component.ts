import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthStateService } from '../../../../core/services/auth-state.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div class="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8">
        <!-- Lock Icon -->
        <div class="text-center mb-6">
          <div class="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h1 class="text-2xl font-bold text-neutral-900 mb-2">Access Denied</h1>
          <p class="text-neutral-600">
            You don't have permission to access this page. Contact your hub administrator if you need access.
          </p>
        </div>

        <!-- Error Details -->
        @if (requiredPermission() || requiredRole()) {
          <div class="bg-red-50 border border-red-300 rounded-xl p-4 mb-6">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 mt-0.5">
                <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="flex-1">
                <div class="font-semibold text-red-800 mb-1">
                  @if (requiredPermission()) {
                    PERMISSION_DENIED
                  } @else {
                    ROLE_REQUIRED
                  }
                </div>
                <p class="text-sm text-red-700">
                  @if (requiredPermission()) {
                    You are missing the required permission: <code class="font-mono bg-red-100 px-1 rounded">{{ requiredPermission() }}</code>
                  } @else if (requiredRole()) {
                    You are missing the required role: <code class="font-mono bg-red-100 px-1 rounded">{{ requiredRole() }}</code>
                  }
                </p>
                @if (permissionMode() === 'all' && requiredPermissionList().length > 1) {
                  <p class="text-xs text-red-600 mt-1">All listed permissions are required to access this page.</p>
                }
              </div>
            </div>
          </div>
        }

        <!-- User Info -->
        @if (userInfo()) {
          <div class="bg-neutral-50 rounded-xl p-4 mb-6">
            <div class="flex items-center gap-3 mb-4 pb-4 border-b border-neutral-200">
              <div class="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center">
                <span class="text-sm font-semibold text-neutral-600">
                  {{ userInfo()!.name?.charAt(0)?.toUpperCase() || 'U' }}
                </span>
              </div>
              <div>
                <div class="font-medium text-neutral-900">{{ userInfo()!.name }}</div>
                <div class="text-sm text-neutral-500">{{ userInfo()!.email }}</div>
              </div>
            </div>

            <!-- Role -->
            <div class="mb-4">
              <div class="text-xs font-semibold text-neutral-400 uppercase mb-2">Your Role</div>
              <div class="flex flex-wrap gap-2">
                @for (role of userRoles(); track role) {
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {{ role }}
                  </span>
                }
                @if (userRoles().length === 0) {
                  <span class="text-sm text-neutral-500">No role assigned</span>
                }
              </div>
            </div>

            <!-- Permissions -->
            <div>
              <div class="text-xs font-semibold text-neutral-400 uppercase mb-2">
                Your Permissions ({{ userPermissions().length }})
              </div>
              @if (userPermissions().length > 0) {
                <div class="max-h-40 overflow-y-auto">
                  <div class="flex flex-wrap gap-1.5">
                    @for (permission of userPermissions(); track permission) {
                      <code class="inline-flex px-2 py-0.5 rounded text-xs bg-neutral-100 text-neutral-700 font-mono">
                        {{ permission }}
                      </code>
                    }
                  </div>
                </div>
              } @else {
                <span class="text-sm text-neutral-500">No permissions assigned</span>
              }
            </div>
          </div>
        }

        <!-- Actions -->
        <div class="flex flex-col gap-3">
          <button
            type="button"
            (click)="goToDashboard()"
            class="w-full px-6 py-3 bg-[#1a1623] text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Go to Dashboard
          </button>
          <button
            type="button"
            (click)="goBack()"
            class="w-full px-6 py-3 border border-neutral-200 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  `,
})
export class UnauthorizedComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authState = inject(AuthStateService);

  // Query params for required permission/role
  readonly requiredPermission = signal<string | null>(null);
  readonly permissionMode = signal<string>('any');
  readonly requiredRole = signal<string | null>(null);

  readonly requiredPermissionList = computed(() => {
    const perm = this.requiredPermission();
    if (!perm) return [];
    return perm.split(', ').map((p) => p.trim());
  });

  readonly requiredRoleList = computed(() => {
    const role = this.requiredRole();
    if (!role) return [];
    return role.split(', ').map((r) => r.trim());
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['required']) {
        this.requiredPermission.set(params['required']);
      }
      if (params['mode']) {
        this.permissionMode.set(params['mode']);
      }
      if (params['requiredRole']) {
        this.requiredRole.set(params['requiredRole']);
      }
    });
  }

  readonly userInfo = computed(() => {
    const user = this.authState.user();
    if (!user) return null;
    return {
      name: user.name,
      email: user.email,
    };
  });

  readonly userRoles = computed(() => {
    const roles = this.authState.roles();
    if (!roles || roles.length === 0) return [];
    return roles.map((r) => r.name);
  });

  readonly userPermissions = computed(() => {
    return this.authState.permissions();
  });

  goToDashboard(): void {
    this.router.navigate(['/hub/overview']);
  }

  goBack(): void {
    window.history.back();
  }
}
