/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  animate,
  AnimationTriggerMetadata,
  group,
  query,
  sequence,
  stagger,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';

/** Time and timing curve for expansion panel animations. */
// Note: Keep this in sync with the Sass variable for the panel header animation.
export const MENU_ANIMATION_TIMING_ENTRY = '120ms ease';
export const MENU_ANIMATION_TIMING_LEAVE = '120ms ease';

export const HeaderAnimation: {
  readonly fadeInOut: AnimationTriggerMetadata;
  readonly searchExpand: AnimationTriggerMetadata;
  readonly panelSlideUpDown: AnimationTriggerMetadata;
  readonly panelDropdown: AnimationTriggerMetadata;
  // readonly panelDrawer: AnimationTriggerMetadata;
  readonly searchMenuDropdown: AnimationTriggerMetadata;
} = {
  fadeInOut: trigger('fadeInOut', [
    state('void', style({ opacity: 0 })),
    state('*', style({ opacity: 1 })),
    transition(':enter', animate('250ms ease')),
    transition(':leave', animate('250ms ease')),
  ]),
  /** Animation that expands and collapses the panel content. */
  searchExpand: trigger('searchExpand', [
    // state('*', style({height: '*', visibility: 'visible', overflow: 'visible'})),
    // state('void', style({height: '0px', visibility: 'hidden', overflow: 'hidden'})),
    transition(':enter', [ 
      style({ transform: 'scaleX(0)', height: '0', opacity: '0' }),
      sequence([
        group([
          animate(MENU_ANIMATION_TIMING_ENTRY, style({ transform: 'scaleX(1)' })),
          animate(MENU_ANIMATION_TIMING_ENTRY, style({ height: '*' })),
        ]),
        animate(MENU_ANIMATION_TIMING_ENTRY, style({ opacity: '1' })),
      ])
    ]),
    // :leave is alias to '* => void'
    transition(':leave', [ 
      group([
        animate(MENU_ANIMATION_TIMING_LEAVE, style({ transform: 'scaleX(0)' })),
        animate(MENU_ANIMATION_TIMING_LEAVE, style({ height: '0' })),
        animate(MENU_ANIMATION_TIMING_LEAVE, style({ opacity: '0' })),
      ])
    ])
  ]),
  panelDropdown: trigger('panelDropdown', [
    state("*", style({
        transform: 'scaleY(1)',
        opacity: 1,
      })
    ),
    state('void', style({
        transform: 'scaleY(0)',
        opacity: 0,
      })
    ),
    transition('void => false', []),
    transition('false => void', []),
    transition(':enter, :leave', animate(200)),
  ]),
  panelSlideUpDown: trigger('panelSlideUpDown', [
    state("*", style({
        transform: 'translateY(0%)',
        opacity: 1,
      })
    ),
    state('void', style({
        transform: 'translateY(80%)',
        opacity: 0,
      })
    ),
    transition(':enter, :leave', animate('250ms 200ms ease-in-out')),
  ]),
  searchMenuDropdown: trigger("searchMenuDropdown", [
    transition(':enter', [
      style({ height: 0, overflow: 'hidden' }),
      query('.navbar-menu-item', [style({ opacity: 0, transform: 'translateY(-20px)' })]),
      sequence([
        animate(MENU_ANIMATION_TIMING_LEAVE, style({ height: '*' })),
        query('.navbar-menu-item', [stagger(-30, [animate(MENU_ANIMATION_TIMING_ENTRY, style({ opacity: 1, transform: 'none' }))])]),
      ]),
    ]),
    transition(':leave', [
      style({ height: '*', overflow: 'hidden' }),
      query('.navbar-menu-item', [style({ opacity: 1, transform: 'none' })]),
      sequence([
        query('.navbar-menu-item', [
          stagger(30, [animate(MENU_ANIMATION_TIMING_LEAVE, style({ opacity: 0, transform: 'translateY(-20px)' }))]),
        ]),
        animate(MENU_ANIMATION_TIMING_LEAVE, style({ height: 0 })),
      ]),
    ]),
  ]),
};