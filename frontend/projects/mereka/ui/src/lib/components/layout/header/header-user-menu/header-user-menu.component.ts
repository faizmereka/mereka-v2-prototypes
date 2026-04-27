import { Component, Inject, Input, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { User } from '@angular/fire/auth';
import { MatMenuModule } from '@angular/material/menu';
import { UIImage } from '@ui/ui-image/ui-image';
import { GetUserProfileUseCase } from '@common/src/app/domain/usecases/get-user-profile/get-user-profile.use-case';
import { COMMON_ENVIRONMENT, CommonEnvironment } from '@common/src/environments/common-environment.interface';
import { getMerekaBaseUrlHelper } from '@common/src/app/presentation/helpers/get-mereka-base-url/get-mereka-base-url.helper';
import { SignOutWithSessionCookieUseCase } from '@common/src/app/domain/usecases/sign-out-with-session-cookie/sign-out-with-session-cookie.use-case';
import { getCookieHelper } from '@common/src/app/presentation/helpers/get-cookie/get-cookie.helper';
import { deleteCookieHelper } from '@common/src/app/presentation/helpers/delete-cookie/delete-cookie.helper';
import { getCanonicalHostnameHelper } from '@common/src/app/domain/helpers/get-canonical-hostname/get-canonical-hostname.helper';
import { OverlayProgressSpinnerComponent } from '@common/src/app/feat/overlay-progress-spinner/presentation/components/overlay-progress-spinner/overlay-progress-spinner.component';

/**
 * Semantic Versioning
 * released: true
 *
 * @figma https://www.figma.com/file/jBO2FrTslM4wocrRzwQaPo/mereka.io-Design-System?type=design&node-id=13326-7989&mode=dev
 *
 * @todo detect if user is not a hub
 */
@Component({
  selector: 'common-header-user-menu',
  imports: [
    MatMenuModule,
    OverlayProgressSpinnerComponent,
    UIImage,
  ],
  templateUrl: './header-user-menu.component.html',
  styleUrl: './header-user-menu.component.scss',
  providers: [GetUserProfileUseCase]
})
export class HeaderUserMenuComponent implements OnInit {
  @Input({ required: true }) user!: User;

  cookiePrefix: string;
  merekaBaseUrl: string;

  profileUrl: string = '';
  hasHub: boolean = false;
  isOverlayProgressSpinnerDisplayed: boolean;
  isDataLoaded: boolean = false

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(COMMON_ENVIRONMENT) private commonEnvironment: CommonEnvironment,
    private getUserProfile: GetUserProfileUseCase,
    private signOutUseCase: SignOutWithSessionCookieUseCase
  ) {
    this.cookiePrefix = this.commonEnvironment.firebase.projectId;
    this.merekaBaseUrl = '';
    this.isOverlayProgressSpinnerDisplayed = false;
  }

  ngOnInit(): void {
    this.merekaBaseUrl = getMerekaBaseUrlHelper(
      this.document,
      this.commonEnvironment
    );
    this.getUserProfile.execute(this.user.uid).then((response) => {
      if (!response.ok) {
        return;
      }
      this.hasHub = response.data.roles?.length>0
      this.profileUrl = response.data.profileUrl;
      this.isDataLoaded = true;
    });
  }

  /**
   * @todo UI feedback
   */
  async onLogOut() {
    this.isOverlayProgressSpinnerDisplayed = true;
    const sessionCookieName = `${this.cookiePrefix}__session`;
    const userCookieName = `${this.cookiePrefix}_sharedUserInfo`;
    const sessionCookie = getCookieHelper(this.document, sessionCookieName);
    try {
      const hostname = this.document.location.hostname;
      const canonicalHostname = getCanonicalHostnameHelper(hostname);
      deleteCookieHelper(this.document, sessionCookieName, canonicalHostname);
      deleteCookieHelper(this.document, userCookieName, canonicalHostname);
    } catch (error) {
      console.log(error);
    }

    if (!sessionCookie) {
      return;
    }
    const result = await this.signOutUseCase.execute(sessionCookie);
    if (!result) {
      return;
    }
    this.document.location.reload();
  }
}
