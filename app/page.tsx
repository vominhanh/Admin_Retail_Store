'use client';

import React, { ChangeEvent, ReactElement, useState } from 'react';
import { EStatusCode } from '@/enums/status-code.enum';
import { login } from '@/services/Auth';
import { Button, LoadingScreen, Text, TextInput } from '@/components';
import { EButtonType } from '@/components/button/interfaces/button-type.interface';
import styles from './style.module.css';
import useNotificationsHook from '@/hooks/notifications-hook';
import { ENotificationType } from '@/components/notify/notification/notification';

export default function Login(): ReactElement {
  const [username, setUsername] = useState<string>(``);
  const [password, setPassword] = useState<string>(``);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { createNotification, notificationElements } = useNotificationsHook();

  const handleChangeUsername = (e: ChangeEvent<HTMLInputElement>): void => {
    setUsername(e.target.value);
  }

  const handleChangePassword = (e: ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
  }

  const handleLogin = async (): Promise<void> => {
    setIsLoading(true);
    const loginApiResponse: Response = await login(username, password);
    setIsLoading(false);

    let errorText: string;

    switch (loginApiResponse.status) {
      case EStatusCode.OK:
        window.location.href = '/home';
        return;
      case EStatusCode.UNAUTHORIZED:
        errorText = `Đăng nhập thất bại! Tên đăng nhập hoặc mật khẩu không đúng.`;
        break;
      default:
        errorText = `Đăng nhập thất bại! Không rõ lỗi.`;
        break;
    }

    createNotification({
      id: 0,
      children: <Text>{errorText}</Text>,
      type: ENotificationType.ERROR,
      isAutoClose: true,
    });
  }

  return (
    <div className={`h-lvh flex items-center justify-center`}>
      <div
        className={`p-10 flex flex-col gap-2 rounded-xl ${styles[`login-section`]}`}
      >
        <Text weight={600} size={24}>Đăng nhập vào hệ thống quản lý bán lẻ</Text>

        <Text weight={600}>Tên đăng nhập:</Text>
        <TextInput
          value={username}
          onInputChange={handleChangeUsername}
        >
        </TextInput>

        <Text weight={600}>Mật khẩu:</Text>
        <TextInput
          value={password}
          textType={`password`}
          onInputChange={handleChangePassword}
        >
        </TextInput>

        <Button
          onClick={handleLogin}
          type={EButtonType.SUCCESS}
          isLoading={isLoading}
        >
          <Text weight={600}>Đăng nhập</Text>
        </Button>
      </div>

      {isLoading && <LoadingScreen></LoadingScreen>}

      {notificationElements}
    </div>
  )
}
