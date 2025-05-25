'use client'

import { ECollectionNames } from '@/enums';
import { IPageParams } from '@/interfaces/page-params.interface'
import { getCollectionById } from '@/services/api-service';
import React, { ReactElement, use, useEffect, useState } from 'react'
import InputSection from '../../components/input-section/input-section';
import { TextInput, Text, NumberInput, LoadingScreen } from '@/components';
import TimestampTabItem from '@/components/timestamp-tab-item/timestamp-tab-item';
import { translateCollectionName } from '@/utils/translate-collection-name';
import { IUnit } from '@/interfaces/unit.interface';
import { DEFAULT_UNIT } from '@/constants/unit.constant';

type collectionType = IUnit;
const collectionName: ECollectionNames = ECollectionNames.UNIT;
const defaultCollection: collectionType = DEFAULT_UNIT;
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

      <InputSection label={`Tên`} gridColumns={gridColumns}>
        <TextInput
          name={`name`}
          isDisable={true}
          value={collection.name}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Số lượng quy đổi`} gridColumns={gridColumns}>
        <NumberInput
          name={`equal`}
          isDisable={true}
          value={collection.equal + ``}
        >
        </NumberInput>
      </InputSection>

      <TimestampTabItem<collectionType> collection={collection}>
      </TimestampTabItem>

      {isLoading && <LoadingScreen></LoadingScreen>}
    </>
  )
}
