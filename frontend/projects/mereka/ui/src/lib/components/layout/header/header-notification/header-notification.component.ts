/* eslint-disable @angular-eslint/template/elements-content */

import { Component, Inject, Input, OnInit } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { UIButton } from '@ui/ui-button/ui-button';
import { MEREKA_BASE_URL_TOKEN } from '@common/src/app/presentation/tokens/mereka-base-url/mereka-base-url.token';
import { INotificationsDto } from '@common/src/app/domain/dtos/notification/notifications.dto';
import { INotificationDto } from '@common/src/app/domain/dtos/notification/notification.dto';
import { IChatRoomsDto } from '@common/src/app/domain/dtos/chat-room/chat-rooms.dto';
import { IChatRoomDto } from '@common/src/app/domain/dtos/chat-room/chat-room.dto';
import { HeaderNotificationMessageUseCase } from '../../../domain/usecases/header-notification-message/header-notification-message.use-case';
import { HeaderNotificationAlertUseCase } from '../../../domain/usecases/header-notification-alert/header-notification-alert.use-case';
import { HeaderNotificationAlertCardComponent } from './header-notification-alert-card/header-notification-alert-card.component';
import { HeaderNotificationMessageCardComponent } from './header-notification-message-card/header-notification-message-card.component';
import { User } from '@angular/fire/auth';

/**
 * Semantic Versioning
 * 1. {@link HeaderNotificationComponent}
 *    1. released: true
 */
@Component({
  selector: 'common-header-notification',
  imports: [
    SlicePipe,
    MatIcon,
    MatMenuModule,
    MatTabsModule,
    UIButton,
    HeaderNotificationAlertCardComponent,
    HeaderNotificationMessageCardComponent,
  ],
  templateUrl: './header-notification.component.html',
  styleUrl: './header-notification.component.scss',
  host: {
    'class': 'header-notification',
    '[class.unread]': 'totalNewNotifications > 0',
  },
  providers: [
    HeaderNotificationAlertUseCase,
    HeaderNotificationMessageUseCase
  ]
})
export class HeaderNotificationComponent implements OnInit {

  @Input({ required: true }) user!: User;

  notifications: INotificationDto[] = [];
  notificationData$!: Promise<INotificationsDto>;
  notificationLoadedFirstTime: boolean = false;
  totalNewNotifications: number = 0;

  chatRooms: IChatRoomDto[] = [];
  chatRoomData$!: Promise<IChatRoomsDto>;

  constructor(
    @Inject(MEREKA_BASE_URL_TOKEN) public merekaBaseUrl: string,
    private router: Router,
    private headerNotificationAlertUseCase: HeaderNotificationAlertUseCase,
    private headerNotificationChatroomUseCase: HeaderNotificationMessageUseCase,
  ) {
  }
  
  ngOnInit(): void {
    ///fetch notification by user id
    this.notificationData$ = this.headerNotificationAlertUseCase.getNotifications(this.user.uid);  
    this.notificationData$.then((notificationData: INotificationsDto) => {
      if (!notificationData || !notificationData.notifications) {
        return;
      }

      const notifications = notificationData.notifications;


      if (notifications.length > 0) {
        notifications.sort((a, b) => b.createdDate.toDate().getTime() - a.createdDate.toDate().getTime());
        this.notificationLoadedFirstTime = true;
        this.notifications = notifications.filter(notification => !notification.isHubNotification);
        this.totalNewNotifications = this.notifications.filter(_notification => !_notification.isViewed).length;
      }
    });

    this.chatRoomData$ = this.headerNotificationChatroomUseCase.getByUserUnreadMessages(this.user.uid);
    this.chatRoomData$.then((chatRoomData: IChatRoomsDto) => {     
      const chatRooms = chatRoomData.chatRooms;

      if (chatRooms.length > 0) {
        this.chatRooms = chatRooms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    });
  }

  getChatUrl(): string {
    const isHub = this.router.url.includes('/hub');
    const isDashboard = this.router.url.includes('/dashboard');
  
    if (isHub && isDashboard) {
      return this.merekaBaseUrl + '/notifications/hub';
    } else {
      return this.merekaBaseUrl + '/chats';
    }
  }
}
