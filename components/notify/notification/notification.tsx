'use client'

import React, { ReactElement, ReactNode, useEffect, useState } from 'react'
import styles from './style.module.css';
import createContainer from '../create-container/create-container';
import { createPortal } from 'react-dom';
import Button from '@/components/button/button';
import IconContainer from '@/components/icon-container/icon-container';
import { xIcon } from '@/public';

export enum ENotificationType {
  INFO = `info`,
  SUCCESS = `success`,
  ERROR = `error`,
  WARNING = `warning`,
}

const notificationIcons = {
  [ENotificationType.INFO]: '/icons/info-circle.svg',
  [ENotificationType.SUCCESS]: null,
  [ENotificationType.ERROR]: '/icons/x-circle.svg',
  [ENotificationType.WARNING]: '/icons/exclamation-circle.svg',
};

const notificationTitles = {
  [ENotificationType.INFO]: 'Thông tin',
  [ENotificationType.SUCCESS]: 'Thành công',
  [ENotificationType.ERROR]: 'Lỗi',
  [ENotificationType.WARNING]: 'Cảnh báo',
};

export interface INotification {
  children: ReactNode
  id?: number
  type: ENotificationType
  isAutoClose: boolean
  title?: string
}

interface INotificationProps {
  children: ReactNode
  type?: ENotificationType
  onDelete?: () => void
  timeToDelete?: number
  isAutoClose?: boolean
  title?: string
}

export default function CustomNotification({
  children,
  type = ENotificationType.INFO,
  onDelete = () => { },
  timeToDelete = 3000,
  isAutoClose = true,
  title,
}: Readonly<INotificationProps>): ReactElement {
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const container: HTMLElement = createContainer(document);

  useEffect((): (() => void) | undefined => {
    if (isAutoClose) {
      const timeOutId: ReturnType<typeof setTimeout> =
        setTimeout((): void => setIsClosing(true), timeToDelete);

      return (): void => {
        clearTimeout(timeOutId);
      }
    }
  }, [isAutoClose, timeToDelete]);

  useEffect((): (() => void) | undefined => {
    if (isClosing) {
      const timeOutId: ReturnType<typeof setTimeout> =
        setTimeout(onDelete, 300);

      return (): void => {
        clearTimeout(timeOutId);
      }
    }
  }, [isClosing, onDelete, timeToDelete]);

  return createPortal(
    <div className={`${styles.container} ${isClosing ? styles.shrink : ``}`}>
      <div className={`${styles.notification} ${styles[type]} ${isClosing ? styles[`slide-out`] : styles[`slide-in`]} overflow-hidden relative flex gap-2 items-center p-3 rounded-lg`}>
        <div className={styles.iconWrapper}>
          {type === ENotificationType.SUCCESS ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={24} height={24} style={{ color: '#389e0d' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={notificationIcons[type]}
              alt={type}
              className={styles.typeIcon}
              width={24}
              height={24}
            />
          )}
        </div>
        <div className={styles.contentWrapper}>
          {title || notificationTitles[type] ? (
            <div className={styles.title}>
              {title || notificationTitles[type]}
            </div>
          ) : null}
          <div className={styles.message}>{children}</div>
        </div>
        <div className={styles.closeButtonWrapper}>
          <Button onClick={(): void => setIsClosing(true)} className={styles.closeButton}>
            <IconContainer iconLink={xIcon}></IconContainer>
          </Button>
        </div>
      </div>
    </div>,
    container,
  )
}
