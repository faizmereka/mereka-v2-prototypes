import { Component, Inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '@angular/fire/auth';
import { doc, Firestore, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { UIImage } from '@ui/ui-image/ui-image';
import { ImageKitPipe } from '@common/src/app/presentation/pipes/image-kit/image-kit.pipe';
import { MerekaStatus } from '@common/src/app/data/enums/mereka-status.enum';
import { COMMON_ENVIRONMENT, CommonEnvironment } from '@common/src/environments/common-environment.interface';
import { NotificationType } from '@common/src/app/data/enums/notification-type.enum';
import { AgencyDataRealtimeModel } from '@common/src/app/data/models/agency/agency-data/agency-data.realtime.model';
import { INotificationDto } from '@common/src/app/domain/dtos/notification/notification.dto';
import { GetUserProfileUseCase } from '@common/src/app/domain/usecases/get-user-profile/get-user-profile.use-case';
import { NotificationDataActionEntity } from '@common/src/app/domain/entities/notifications/notification-data-action.entity';
import { GetAuthStateUseCase } from '@common/src/app/domain/usecases/get-auth-state/get-auth-state.use-case';
import { GetAgencyRealtimeDataSource } from '@common/src/app/data/datasources/get-agency/get-agency.realtime.data-source';
import { NotificationDataDataEntity } from '@common/src/app/domain/entities/notifications/notification-data-data.entity';
import { HeaderNotificationAlertUseCase } from '../../../../domain/usecases/header-notification-alert/header-notification-alert.use-case';


@Component({
  selector: 'common-header-notification-alert-card, [common-header-notification-alert-card]',
  imports: [
    CommonModule,
    ImageKitPipe,
    UIImage,
  ],
  templateUrl: './header-notification-alert-card.component.html',
  styleUrl: './header-notification-alert-card.component.scss',
  host: {
    'class': 'common-header-notification-alert-card',
  },
  providers: [
    GetAgencyRealtimeDataSource,
    GetUserProfileUseCase,
    GetAuthStateUseCase,
    HeaderNotificationAlertUseCase,
  ]
})
export class HeaderNotificationAlertCardComponent {
  @Input({ required: true }) notification!: INotificationDto;
  @Input({ required: true }) user!: User

  merekaBaseUrl: string = '';
  notificationType = NotificationType;
  myAgency!: AgencyDataRealtimeModel;

  constructor(
    @Inject(COMMON_ENVIRONMENT) private commonEnvironment: CommonEnvironment,
    private firestore: Firestore,
    private headerNotificationUseCase: HeaderNotificationAlertUseCase,
    private router: Router,
    // private experiencesService: ExperiencesService
  ) {
    this.merekaBaseUrl = this.commonEnvironment.projects.Mereka.baseUrl;
    // console.log('this.merekaBaseUrl', this.merekaBaseUrl);
  }



  // checkInvitationToken(token: string, notificationId: string): void {
  // async checkInvitationToken(notification: INotificationDto): Promise<void> {
    // const invitationId = notification.invitationId;
    // const notificationId = notification.id;
  // }

  checkInvitationToken(invitationId: string, notificationId: string): void {
    this.headerNotificationUseCase.getInvitationById(invitationId).then(async invitation => {
      if (this.user.email == invitation?.email) {
        // this._appService.showInfoToast('Accepting invitation...');

        try {
          await this.headerNotificationUseCase.updateNotification(notificationId, { status: MerekaStatus.COMPLETED });

          // await this.hubService.acceptInvitation(this._stateManagementService.userData, invitation);
          // await this._stateManagementService.setDataToStatemanagement(this._stateManagementService.userData.uid);
          // this._appService.showSuccessToast('Invitation accepted successfully.');
        } catch (e) {
          console.log(e);
          // this._appService.showErrorToast('Failed to accept the invitation. Please try again.');
        }
        return;
      }
      
    });

  }
    // this.getInvitationByToken(invitationId).then(async invitation => {
      // if (this._stateManagementService.userData.email === invitation.email) {
      //   this._appService.showInfoToast('Accepting invitation...');

      //   try {
      //     await this._notificationService.updateNotification(notificationId, {
      //       status: MerekaStatus.COMPLETED
      //     });
      //     await this.hubService.acceptInvitation(this._stateManagementService.userData, invitation);
      //     await this._stateManagementService.setDataToStatemanagement(this._stateManagementService.userData.uid);
      //     // this._appService.showSuccessToast('Invitation accepted successfully.');
      //   } catch (e) {
      //     console.log(e);
      //     // this._appService.showErrorToast('Failed to accept the invitation. Please try again.');
      //   }
      //   return;
      // }
    // });
    
    // async getInvitationByToken(token): Promise<iInvitation> {
    //   const res = await this.angularFirestore
    //     .doc(`${FirebaseCollectionName.INVITATIONS}/${token}`)
    //     .get().pipe(first()).toPromise();
  
    //   return {
    //     ...(res.data() as any),
    //     uid: res.id
    //   } as iInvitation;
    // }

    // this.hubService.getInvitationByToken(token).then(async invitation => {
    //   if (this._stateManagementService.userData.email === invitation.email) {
    //     this._appService.showInfoToast('Accepting invitation...');

    //     try {
    //       await this._notificationService.updateNotification(notificationId, {
    //         status: MerekaStatus.COMPLETED
    //       });
    //       await this.hubService.acceptInvitation(this._stateManagementService.userData, invitation);
    //       await this._stateManagementService.setDataToStatemanagement(this._stateManagementService.userData.uid);
    //       // this._appService.showSuccessToast('Invitation accepted successfully.');
    //     } catch (e) {
    //       console.log(e);
    //       // this._appService.showErrorToast('Failed to accept the invitation. Please try again.');
    //     }
    //     return;
    //   }
    // });

  // @todo: move this to a Hub or notification service
  async getInvitationByToken(token: string): Promise<NotificationDataDataEntity> {

      //   try {
      //     await this._notificationService.updateNotification(notificationId, {
      //       status: MerekaStatus.COMPLETED
      //     });
      //     await this.hubService.acceptInvitation(this._stateManagementService.userData, invitation);
      //     await this._stateManagementService.setDataToStatemanagement(this._stateManagementService.userData.uid);
      //     // this._appService.showSuccessToast('Invitation accepted successfully.');
      //   } catch (e) {
      //     console.log(e);
      //     // this._appService.showErrorToast('Failed to accept the invitation. Please try again.');
      //   }
      //   return;

    const docRef = doc(this.firestore, 'invitations', token);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      throw new Error('Document not found');
    }
  }

  goToProfile(): void {
    // this.myAgency = { ...this._stateManagementService.userAgency };
    this.router.navigateByUrl(`/hub-onboard/profile?id=${this.myAgency.expertUid}`);
  }

  async notificationAction(notification: INotificationDto, action: NotificationDataActionEntity): Promise<void> {
    try {
      await this.updateNotificationAsViewed(notification.id);

      // Handle different action types
      switch (action.btnType) {
        case 'HUB_INVITATION_ACCEPTED':
          this.checkInvitationToken(notification.invitationId, notification.id);
          break;
        case 'HUB_INVITATION_CANCELLED':
          this.cancelInvitation(notification);
          break;
        case 'MANAGE_EXPERIENCE':
          await this.handleManageExperienceAction(notification);
          break;
        case 'DISABLE_BOOKING_ENQUIRY':
          await this.handleDisableBookingEnquiryAction(notification);
          break;
        case 'CREATE_USER_PROFILE':
        case 'COMPLETE_USER_PROFILE': {
          const { path, queryParams } = this.parseUrl(this.merekaBaseUrl + '/' + action.btnUrl);
          this.router.navigate([this.merekaBaseUrl + '/' + path], { queryParams });
          break;
        }
        case 'COMPLETE_HUB_PROFILE':
          await this.completeHubProfile(notification);
          break;
        case 'VIEW_BOOKING':
          this.router.navigate([`${this.merekaBaseUrl}/hub/${notification.hubId}/dashboard/bookings/expertise`]);
          break;
        case 'VIEW_REQUEST':
          this.router.navigate(
            [`${this.merekaBaseUrl}/hub/${notification.hubId}/dashboard/messages/`],
            { queryParams: { roomId: notification.data.roomId } }
          );
          break;
        case 'VIEW_DETAILS':
          if (notification.isHubNotification) {
            this.router.navigate([`${this.merekaBaseUrl}/hub/${notification.hubId}/dashboard/messages/`], { queryParams: { roomId: notification.data.roomId } });
          } else {
            this.router.navigate([`${this.merekaBaseUrl}/chats/`], { queryParams: { roomId: notification.data.roomId } });
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error in checkForBookingEnquiry:', error);
      // Handle the error as needed
    }
  }
  
  /* Parses the URL and returns the path and query parameters */
  parseUrl(fullUrl: string): { path: string; queryParams: { [key: string]: string; }; } {
    const [path, queryString] = fullUrl.split('?');
    const queryParams: { [key: string]: string } = {};


    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        queryParams[key] = decodeURIComponent(value);
      });
    }

    return { path, queryParams };
  }

  async updateNotificationAsViewed(notificationId: string): Promise<void> {
    await this.headerNotificationUseCase.updateNotification(notificationId, { isViewed: true });
  }

  async handleManageExperienceAction(notification: INotificationDto): Promise<void> {
    const { hubId, experienceId } = notification.data;
    this.router.navigate([`${this.merekaBaseUrl}/hub/${hubId}/dashboard/service/experiences/${experienceId}/booking-enquiry/booking-enquiry`]);
  }

  async handleDisableBookingEnquiryAction(notification: INotificationDto): Promise<void> {
    localStorage.setItem('showBookingEnquiryDialog', 'true');
    await this.handleManageExperienceAction(notification);
  }

  async completeHubProfile(notification: INotificationDto): Promise<void> {
    const { hubId } = notification;
    const url = `${this.merekaBaseUrl}/hub-onboard/profile?id=${hubId}`;
    this.router.navigateByUrl(url);
  }

  async cancelInvitation(notification: INotificationDto) {
    const notificationId = notification.id;

    await this.headerNotificationUseCase.updateNotification(
      notificationId, { status: MerekaStatus.CANCELLED }
    );
    // @todo: create a toast service
    // this._appService.showSuccessToast('Invitation declined successfully.');
  }

  goToChatRoom(notification: INotificationDto): void {
    if (notification.type === 'EXPERTISE_BOOKING_REQUEST_HUB_TO_LEARNER' && !notification.isHubNotification) {
      this.router.navigate([`${this.merekaBaseUrl}/chats/`], { queryParams: { roomId: notification.data.roomId } });
    }
    if (notification.type === 'EXPERTISE_BOOKING_REQUEST_LEARNER_TO_HUB' && notification.isHubNotification) {
      this.router.navigate([`${this.merekaBaseUrl}/hub/${notification.hubId}/dashboard/messages/`], { queryParams: { roomId: notification.data.roomId } });
    }
  }

}
