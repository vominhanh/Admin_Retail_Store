'use client'

import { ECollectionNames } from '@/enums';
import Image from 'next/image';
import { IPageParams } from '@/interfaces/page-params.interface'
import { getCollectionById } from '@/services/api-service';
import React, { ReactElement, use, useEffect, useState } from 'react'
import InputSection from '../../components/input-section/input-section';
import { TextInput, Text, LoadingScreen } from '@/components';
import TimestampTabItem from '@/components/timestamp-tab-item/timestamp-tab-item';
import { translateCollectionName } from '@/utils/translate-collection-name';
import { IBusiness } from '@/interfaces/business.interface';
import { DEFAULT_BUSINESS } from '@/constants/business.constant';
import styles from '../style.module.css'

type collectionType = IBusiness;
const collectionName: ECollectionNames = ECollectionNames.BUSINESS;
const defaultCollection: collectionType = DEFAULT_BUSINESS;
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

      <InputSection label={`Tên doanh nghiệp`} gridColumns={gridColumns}>
        <TextInput
          name={`name`}
          isDisable={true}
          value={collection.name}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Email`} gridColumns={gridColumns}>
        <TextInput
          name={`email`}
          isDisable={true}
          value={collection.email}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Số điện thoại`} gridColumns={gridColumns}>
        <TextInput
          name={`phone`}
          isDisable={true}
          value={collection.phone}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Địa chỉ`} gridColumns={gridColumns}>
        <TextInput
          name={`address`}
          isDisable={true}
          value={collection.address}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Hình ảnh`} gridColumns={gridColumns}>
        <div>
          <div className={`relative flex flex-wrap gap-2 overflow-scroll no-scrollbar`}>
            {
              collection.logo ? <div
                className={`relative ${styles[`image-container`]}`}
              >
                <Image
                  className={`w-full max-w-full max-h-full`}
                  src={collection.logo}
                  alt={``}
                  width={0}
                  height={0}
                  quality={10}
                >
                </Image>
              </div> : <></>
            }
          </div>
        </div>
      </InputSection>

      <TimestampTabItem<collectionType> collection={collection}>
      </TimestampTabItem>

      {isLoading && <LoadingScreen></LoadingScreen>}
    </>
  )
}
