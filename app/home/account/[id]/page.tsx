'use client'

import { DEFAULT_ACCOUNT } from '@/constants/account.constant';
import { ECollectionNames } from '@/enums';
import { IAccount } from '@/interfaces';
import { IPageParams } from '@/interfaces/page-params.interface'
import { getCollectionById } from '@/services/api-service';
import React, { ReactElement, use, useEffect, useState } from 'react'
import InputSection from '../../components/input-section/input-section';
import { TextInput, Text, LoadingScreen } from '@/components';
import Checkbox from '@/components/checkbox/checkbox';
import TimestampTabItem from '@/components/timestamp-tab-item/timestamp-tab-item';
import { translateCollectionName } from '@/utils/translate-collection-name';

type collectionType = IAccount;
const collectionName: ECollectionNames = ECollectionNames.ACCOUNT;
const defaultCollection: collectionType = DEFAULT_ACCOUNT;
const gridColumns: string = `200px 1fr`;

export default function Detail({
  params
}: Readonly<IPageParams>): ReactElement {
  const [collection, setCollection] = useState<collectionType>(
    defaultCollection
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { id } = use(params);

  useEffect((): void => {
    const getCollectionNameById = async () => {
      const getCollectionApiResponse: Response =
        await getCollectionById(id, collectionName);
      const getCollectionApiJson = await getCollectionApiResponse.json();
      setCollection(getCollectionApiJson);
      setIsLoading(false);
    }
    getCollectionNameById();
  }, [id]);

  return (
    <>
      <Text size={32}>Chi tiết {translateCollectionName(collectionName)} {id}</Text>

      <InputSection label={`Tên tài khoản`} gridColumns={gridColumns}>
        <TextInput
          name={`username`}
          isDisable={true}
          value={collection.username}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Mật khẩu`} gridColumns={gridColumns}>
        <TextInput
          textType={`password`}
          name={`password`}
          isDisable={true}
          value={collection.password}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Là quản trị viên`} gridColumns={gridColumns}>
        <Checkbox
          isChecked={collection.is_admin}
          isDisable={true}
        >
        </Checkbox>
      </InputSection>

      <TimestampTabItem<collectionType> collection={collection}>
      </TimestampTabItem>

      {isLoading && <LoadingScreen></LoadingScreen>}
    </>
  )
}
