import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, Inject, Input, OnInit, PLATFORM_ID } from '@angular/core';
import { User } from '@angular/fire/auth';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { UIAnchor, UIButton } from '@ui/ui-button/ui-button';
import { UIImage } from '@ui/ui-image/ui-image';
import { UILoaderSkeleton, UILoaderSkeletonGroup } from '@ui/ui-loader-skeleton/ui-loader-skeleton';
import { COMMON_ENVIRONMENT, CommonEnvironment } from '@common/src/environments/common-environment.interface';
import { UserRoleEntity } from '@common/src/app/domain/entities/user/user/user-role.entity';
import { GetUserProfileUseCase } from '@common/src/app/domain/usecases/get-user-profile/get-user-profile.use-case';
import { MEREKA_BASE_URL_TOKEN } from '@common/src/app/presentation/tokens/mereka-base-url/mereka-base-url.token';

/**
 * Semantic Versioning
 * 1. {@link HeaderHubMenuComponent}
 *    1. released: true
 */
@Component({
  selector: 'common-header-hub-menu',
  imports: [
    MatIcon,
    MatMenuModule,
    UIAnchor,
    UIButton,
    UIImage,
    UILoaderSkeleton,
    UILoaderSkeletonGroup,
  ],
  templateUrl: './header-hub-menu.component.html',
  styleUrl: './header-hub-menu.component.scss',
  providers: [GetUserProfileUseCase],
})
export class HeaderHubMenuComponent implements OnInit {
  @Input({ required: true }) user!: User;
  allRoles: UserRoleEntity[] = [];
  isDataLoading = false;
  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(COMMON_ENVIRONMENT) private commonEnvironment: CommonEnvironment,
    @Inject(MEREKA_BASE_URL_TOKEN) public merekaBaseUrl: string,
    private getUserProfile: GetUserProfileUseCase
  ) {
    this.merekaBaseUrl = '';
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.user.uid) {
      this.isDataLoading = true;
      this.getUserProfile.execute(this.user.uid).then((response) => {
        this.isDataLoading = false;
        if (!response.ok) {
          return;
        }
        this.allRoles = response?.data?.roles;
      });
    }
  }
}
