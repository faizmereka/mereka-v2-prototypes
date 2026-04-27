import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { User } from '@angular/fire/auth';
import { MatIcon } from '@angular/material/icon';
import { UIAnchor } from '@ui/ui-button/ui-button';
import { COMMON_ENVIRONMENT, CommonEnvironment } from '@common/src/environments/common-environment.interface';
import { GetAuthStateUseCase } from '@common/src/app/domain/usecases/get-auth-state/get-auth-state.use-case';
import { getCookieHelper } from '@common/src/app/presentation/helpers/get-cookie/get-cookie.helper';
import { getAuthBaseUrlHelper } from '@common/src/app/presentation/helpers/get-auth-base-url/get-auth-base-url.helper';
import { MEREKA_BASE_URL_TOKEN } from '@common/src/app/presentation/tokens/mereka-base-url/mereka-base-url.token';
import { HeaderHubMenuComponent } from '../header-hub-menu/header-hub-menu.component';
import { HeaderNotificationComponent } from '../header-notification/header-notification.component';
import { HeaderUserMenuComponent } from '../header-user-menu/header-user-menu.component';

/**
 * Semantic Versioning
 * {@link HeaderUserComponent}
 * released: false
 *
 * @todo hub-dashboard-icon
 *
 * @requires {@link GetAuthStateUseCase}
 */
@Component({
  selector: 'common-header-login',
  imports: [
    HeaderHubMenuComponent,
    HeaderNotificationComponent,
    HeaderUserMenuComponent,
    UIAnchor,
    MatIcon,
  ],
  providers: [
    GetAuthStateUseCase
  ],
  templateUrl: './header-login.component.html',
  styleUrl: './header-login.component.scss'
})
export class HeaderUserComponent implements OnInit {
  private cookiePrefix: string;
  authBaseUrl: string;
  baseUrl: string;
  redirectUrl: string;
  isBrowser: boolean;
  user: User | null = null;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(COMMON_ENVIRONMENT) private commonEnvironment: CommonEnvironment,
    @Inject(MEREKA_BASE_URL_TOKEN) public merekaBaseUrl: string,
    private getAuthStateUseCase: GetAuthStateUseCase,
  ) {
    this.cookiePrefix = commonEnvironment.firebase.projectId;
    this.authBaseUrl = '';
    this.redirectUrl = '';
    this.baseUrl = '';
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const sessionCookie = getCookieHelper(
      this.document,
      `${this.cookiePrefix}__session`
    );
    this.authBaseUrl = getAuthBaseUrlHelper(
      this.document,
      this.commonEnvironment
    );

    const user$ = this.getAuthStateUseCase.execute(sessionCookie);
    user$.then((user) => {
      if (user && user.uid) {
        this.user = user;
      }
    });
    this.baseUrl = this.commonEnvironment.projects.Mereka.baseUrl;
    this.redirectUrl = this.document.location.href;
  }
}
