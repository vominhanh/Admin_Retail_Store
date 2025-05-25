/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { ECollectionNames } from '@/enums';
import { IPageParams } from '@/interfaces/page-params.interface'
import { getCollectionById } from '@/services/api-service';
import React, { ReactElement, use, useCallback, useEffect, useState } from 'react'
import InputSection from '../../components/input-section/input-section';
import { TextInput, Text, SelectDropdown, LoadingScreen } from '@/components';
import TimestampTabItem from '@/components/timestamp-tab-item/timestamp-tab-item';
import { translateCollectionName } from '@/utils/translate-collection-name';
import { IAccount, IUser } from '@/interfaces';
import { DEFAULT_USER } from '@/constants/user.constant';
import styles from '../style.module.css'
import { getSelectedOptionIndex } from '@/components/select-dropdown/utils/get-selected-option-index';
import DateInput from '@/components/date-input/date-input';
import Image from 'next/image';
import { ISelectOption } from '@/components/select-dropdown/interfaces/select-option.interface';
import { fetchGetCollections } from '@/utils/fetch-get-collections';
import { enumToKeyValueArray } from '@/utils/enum-to-array';
import { EUserGender } from '@/enums/user-gender.enum';
import { createCollectionDetailLink } from '@/utils/create-collection-detail-link';

type collectionType = IUser;
const collectionName: ECollectionNames = ECollectionNames.USER;
const defaultCollection: collectionType = DEFAULT_USER;
const genderOptions: ISelectOption[] = enumToKeyValueArray(EUserGender)
  .map((array: string[]): ISelectOption => ({
    label: array[0],
    value: array[1],
  }));

export default function Detail({
  params
}: Readonly<IPageParams>): ReactElement {
  const [collection, setCollection] = useState<collectionType>(
    defaultCollection
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { id } = use(params);
  const [accountOptions, setAccountOptions] = useState<ISelectOption[]>([]);

  const getAccounts: () => Promise<void> = useCallback(
    async (): Promise<void> => {
      const newAccounts: IAccount[] = await fetchGetCollections<IAccount>(
        ECollectionNames.ACCOUNT,
      );

      setCollection({
        ...collection,
        account_id: newAccounts[0]._id,
      });
      setAccountOptions([
        ...newAccounts.map((account: IAccount): ISelectOption => ({
          label: `${account.username}`,
          value: account._id,
        }))
      ]);
      setIsLoading(false);
    },
     
    [collection.account_id],
  );

  useEffect((): void => {
    getAccounts();
     
  }, []);

  useEffect((): void => {
    const getCollectionNameById = async () => {
      const getCollectionApiResponse: Response =
        await getCollectionById(id, collectionName);
      const getCollectionApiJson = await getCollectionApiResponse.json();
      setCollection(getCollectionApiJson);
      setIsLoading(false);
    }
    getCollectionNameById();
  }, []);

  return (
    <>
      <Text size={32}>Chi tiết {translateCollectionName(collectionName)} {id}</Text>

      <InputSection label={`Cho tài khoản`}>
        <div className={`flex items-center justify-center gap-2`}>
          {createCollectionDetailLink(
            ECollectionNames.ACCOUNT,
            collection.account_id
          )}

          <SelectDropdown
            name={`account_id`}
            isLoading={isLoading}
            isDisable={true}
            options={accountOptions}
            defaultOptionIndex={getSelectedOptionIndex(
              accountOptions, collection.account_id
            )}
          >
          </SelectDropdown>
        </div>
      </InputSection>

      <InputSection label={`Họ`}>
        <TextInput
          name={`first`}
          isDisable={true}
          value={collection.name.first}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Tên đệm`}>
        <TextInput
          name={`middle`}
          isDisable={true}
          value={collection.name.middle}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Tên`}>
        <TextInput
          name={`last`}
          isDisable={true}
          value={collection.name.last}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Số nhà`}>
        <TextInput
          name={`number`}
          isDisable={true}
          value={collection.address.number}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Đường`}>
        <TextInput
          name={`street`}
          isDisable={true}
          value={collection.address.street}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Phường`}>
        <TextInput
          name={`ward`}
          isDisable={true}
          value={collection.address.ward}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Quận`}>
        <TextInput
          name={`district`}
          isDisable={true}
          value={collection.address.district}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Thành phố`}>
        <TextInput
          name={`city`}
          isDisable={true}
          value={collection.address.city}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Quốc gia`}>
        <TextInput
          name={`country`}
          isDisable={true}
          value={collection.address.country}
        >
        </TextInput>
      </InputSection>

      <InputSection label={`Email`}>
        <TextInput
          textType={`email`}
          name={`email`}
          isDisable={true}
          value={collection.email}
        >
        </TextInput>
      </InputSection>

      {collection.birthday ?
        <InputSection label={`Ngày sinh`}>
          <DateInput
            name={`birthday`}
            isDisable={true}
            value={collection.birthday}
          >
          </DateInput>
        </InputSection> : <Text>{collection.birthday}</Text>
      }

      <InputSection label={`Giới tính`}>
        <SelectDropdown
          isDisable={true}
          options={genderOptions}
          defaultOptionIndex={getSelectedOptionIndex(
            genderOptions,
            (collection.gender
              ? collection.gender
              : EUserGender.FEMALE
            ) as unknown as string
          )}
        >
        </SelectDropdown>
      </InputSection>

      <InputSection label={`Hình đại diện của nhân viên`}>
        <div>
          <div className={`relative flex flex-wrap gap-2 overflow-scroll no-scrollbar`}>
            {
              collection.avatar ? <div
                className={`relative ${styles[`image-container`]}`}
              >
                <Image
                  className={`w-full max-w-full max-h-full`}
                  src={collection.avatar}
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
