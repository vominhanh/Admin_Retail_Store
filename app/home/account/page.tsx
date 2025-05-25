'use client';

import { Button, IconContainer, Text, TextInput } from '@/components'
import ManagerPage, { ICollectionIdNotify } from '@/components/manager-page/manager-page'
import { IColumnProps } from '@/components/table/interfaces/column-props.interface'
import { ECollectionNames } from '@/enums'
import { IAccount } from '@/interfaces'
import React, { ChangeEvent, ReactElement, useRef, useState } from 'react'
import InputSection from '../components/input-section/input-section';
import { infoIcon, trashIcon } from '@/public';
import { createDeleteTooltip, createMoreInfoTooltip } from '@/utils/create-tooltip';
import { DEFAULT_ACCOUNT } from '@/constants/account.constant';
import TabItem from '@/components/tabs/components/tab-item/tab-item';
import Tabs from '@/components/tabs/tabs';
import Checkbox from '@/components/checkbox/checkbox';
import { translateCollectionName } from '@/utils/translate-collection-name';
import { createCollectionDetailLink } from '@/utils/create-collection-detail-link';

type collectionType = IAccount;
const collectionName: ECollectionNames = ECollectionNames.ACCOUNT;

export default function Account() {
  const [account, setAccount] = useState<collectionType>(DEFAULT_ACCOUNT);
  const [isModalReadOnly, setIsModalReadOnly] = useState<boolean>(false);
  const [isClickShowMore, setIsClickShowMore] = useState<ICollectionIdNotify>({
    id: ``,
    isClicked: false
  });
  const [isClickDelete, setIsClickDelete] = useState<ICollectionIdNotify>({
    id: ``,
    isClicked: false
  });

  const columns: Array<IColumnProps<collectionType>> = [
    {
      key: `index`,
      ref: useRef(null),
      title: `#`,
      size: `1fr`,
    },
    // {
    //   key: `_id`,
    //   ref: useRef(null), 
    //   title: `Mã`,
    //   size: `6fr`,
    // },
    {
      key: `username`,
      ref: useRef(null),
      title: `Tài khoản`,
      size: `3fr`,
    },
    {
      key: `password`,
      ref: useRef(null),
      title: `Mật khẩu`,
      size: `3fr`,
    },
    {
      key: `is_admin`,
      ref: useRef(null),
      title: `Là quản trị viên`,
      size: `3fr`,
      render: (collection: collectionType): ReactElement => {
        return <Text isEllipsis={true}>{collection.is_admin ? `Có` : `Không`}</Text>
      }
    },
    {
      key: `created_at`,
      ref: useRef(null),
      title: `Ngày tạo`,
      size: `4fr`,
      render: (collection: collectionType): ReactElement => {
        const date: string = new Date(collection.created_at).toLocaleDateString();
        return <Text isEllipsis={true} tooltip={date}>{date}</Text>
      }
    },
    {
      key: `updated_at`,
      ref: useRef(null),
      title: `Ngày cập nhật`,
      size: `4fr`,
      render: (collection: collectionType): ReactElement => {
        const date: string = new Date(collection.updated_at).toLocaleDateString();
        return <Text isEllipsis={true} tooltip={date}>{date}</Text>
      }
    },
    {
      title: `Thao tác`,
      ref: useRef(null),
      size: `4fr`,
      render: (collection: collectionType): ReactElement => (
        <div className="flex items-center justify-center gap-3">
          <Button
            title={createMoreInfoTooltip(collectionName)}
            onClick={(): void => {
              setIsClickShowMore({
                id: collection._id,
                isClicked: !isClickShowMore.isClicked,
              });
            }}
            className="p-2 rounded-md hover:bg-blue-100 transition-all"
          >
            <IconContainer
              tooltip={createMoreInfoTooltip(collectionName)}
              iconLink={infoIcon}
              className="w-5 h-5"
            />
          </Button>

          <div className="p-2 rounded-md hover:bg-blue-100 transition-all">
            {createCollectionDetailLink(
              collectionName,
              collection._id
            )}
          </div>

          <Button
            title={createDeleteTooltip(collectionName)}
            onClick={(): void => {
              setIsClickDelete({
                id: collection._id,
                isClicked: !isClickShowMore.isClicked,
              });
            }}
            className="p-2 rounded-md hover:bg-red-100 transition-all"
          >
            <IconContainer
              tooltip={createDeleteTooltip(collectionName)}
              iconLink={trashIcon}
              className="w-5 h-5"
            />
          </Button>
        </div>
      )
    },
  ];

  const handleChangeAccount = (e: ChangeEvent<HTMLInputElement>): void => {
    setAccount({
      ...account,
      [e.target.name]: e.target.value,
    });
  }

  const handleChangeIsAdmin = (e: ChangeEvent<HTMLInputElement>): void => {
    setAccount({
      ...account,
      is_admin: e.target.checked,
    });
  }

  const gridColumns: string = `200px 1fr`;

  return (
    <ManagerPage<collectionType>
      columns={columns}
      collectionName={collectionName}
      defaultCollection={DEFAULT_ACCOUNT}
      collection={account}
      setCollection={setAccount}
      isModalReadonly={isModalReadOnly}
      setIsModalReadonly={setIsModalReadOnly}
      isClickShowMore={isClickShowMore}
      isClickDelete={isClickDelete}
    >
      <Tabs>
        <TabItem label={`${translateCollectionName(collectionName)}`}>
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="space-y-6">
              <InputSection label={`Tên tài khoản`} gridColumns={gridColumns}>
                <TextInput
                  name={`username`}
                  isDisable={isModalReadOnly}
                  value={account.username}
                  onInputChange={handleChangeAccount}
                  className="rounded-md border border-gray-300 px-4 py-2 w-full focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="Nhập tên tài khoản"
                />
              </InputSection>

              <InputSection label={`Mật khẩu`} gridColumns={gridColumns}>
                <TextInput
                  textType={`password`}
                  name={`password`}
                  isDisable={isModalReadOnly}
                  value={account.password}
                  onInputChange={handleChangeAccount}
                  className="rounded-md border border-gray-300 px-4 py-2 w-full focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="Nhập mật khẩu"
                />
              </InputSection>

              <InputSection label={`Là quản trị viên`} gridColumns={gridColumns}>
                <div className="flex items-center">
                  <Checkbox
                    isChecked={account.is_admin}
                    isDisable={isModalReadOnly}
                    onInputChange={handleChangeIsAdmin}
                    size={20}
                    borderWidth={1}
                    borderColor="#3b82f6"
                    background={{
                      light: "#ffffff",
                      dark: "#1e40af"
                    }}
                  />
                </div>
              </InputSection>
            </div>
          </div>
        </TabItem>
      </Tabs>
    </ManagerPage>
  );
}
