import React, { Dispatch, ReactElement, SetStateAction } from 'react'
import { Modal } from '@/components';
import { ECollectionNames } from '@/enums';
import { translateCollectionName } from '@/utils/translate-collection-name';

interface ICollectionFormProps<T> {
  children: ReactElement
  collection: T
  collectionName: ECollectionNames
  isModalOpen?: boolean
  setIsModalOpen?: Dispatch<SetStateAction<boolean>>
  okAction?: (collection: T) => void
  isReadOnly?: boolean
  isUpdateCollection?: boolean
  isLoading?: boolean
}

export default function CollectionForm<T extends { _id: string, index?: number }>({
  children,
  collection,
  collectionName,
  isModalOpen = false,
  setIsModalOpen = () => { },
  okAction = () => { },
  isReadOnly = false,
  isUpdateCollection = false,
  isLoading = true,
}: Readonly<ICollectionFormProps<T>>): ReactElement {
  const getActionName: string = isReadOnly
    ? `Xem Thông tin`
    : isUpdateCollection
      ? `Cập nhật`
      : `Lưu`;

  const getOkText = () => {
    if (isReadOnly) return `Xem Thông tin sản phẩm`;
    if (isUpdateCollection) return `Cập nhật sản phẩm`;
    return `Lưu sản phẩm`;
  };

  return (
    <Modal
      okText={getOkText()}
      okAction={(): void => okAction(collection)}
      title={`${getActionName} ${translateCollectionName(collectionName)}`}
      isOpen={isModalOpen}
      setIsOpen={setIsModalOpen}
      isOkDisable={isLoading}
    >
      <div className={`flex flex-col gap-2`}>
        {children}
      </div>
    </Modal>
  )
}
