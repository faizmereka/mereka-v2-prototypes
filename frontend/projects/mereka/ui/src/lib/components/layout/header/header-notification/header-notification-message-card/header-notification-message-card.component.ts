import { CommonModule } from '@angular/common';
import { Component, Inject, Input, OnInit } from '@angular/core';
import { User } from '@angular/fire/auth';
import { IChatRoomDto } from '@common/src/app/domain/dtos/chat-room/chat-room.dto';
import { ImageKitPipe } from '@common/src/app/presentation/pipes/image-kit/image-kit.pipe';
import { MEREKA_BASE_URL_TOKEN } from '@common/src/app/presentation/tokens/mereka-base-url/mereka-base-url.token';
import { StringUtils } from '@common/src/app/presentation/utilities/strings.utils';
import { UIImage } from '@ui/ui-image/ui-image';
import dayjs from 'dayjs';

@Component({
  selector: 'common-header-notification-message-card, [common-header-notification-message-card]',
  imports: [
    CommonModule,
    UIImage,
    ImageKitPipe,
  ],
  templateUrl: './header-notification-message-card.component.html',
  styleUrl: './header-notification-message-card.component.scss',
  host: {
    'class': 'common-header-notification-message-card',
  }
})
export class HeaderNotificationMessageCardComponent implements OnInit {

  @Input({ required: true }) chat!: IChatRoomDto;
  @Input({ required: true }) user!: User

  message: string = "";

  constructor(
    @Inject(MEREKA_BASE_URL_TOKEN) public merekaBaseUrl: string,
  ) {}

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    const lastMessage = this.chat.lastMessage;

    this.message = StringUtils.stripHtml(lastMessage?.message ?? '');

  }

  getChatRoomUrl(): string {
    // @todo: To be converted for Hub 
    // if (this.chatRoomService.isHubView()) {
    //   const expertUid = this._stateManagementService?.userAgency?.expertUid ?? '';
    //   const roomId = this.chat.id ?? '';
    //   return `/hub/${expertUid}/dashboard/messages?roomId=${roomId}`;
    // } else {
      const roomId = this.chat.id ?? '';
      return this.merekaBaseUrl + '/chats?roomId=' + roomId
    // }
  }

  getCreatedDate(date: string, format: string): string {
    return dayjs(date).format(format);
  }
}
