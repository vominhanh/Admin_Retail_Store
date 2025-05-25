/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { Button, IconContainer, SelectDropdown, Text, TextInput } from '@/components'
import ManagerPage, { ICollectionIdNotify } from '@/components/manager-page/manager-page'
import { IColumnProps } from '@/components/table/interfaces/column-props.interface'
import { DEFAULT_USER } from '@/constants/user.constant'
import { ECollectionNames } from '@/enums'
import { IAccount, IUser } from '@/interfaces'
import { infoIcon, pencilIcon, trashIcon } from '@/public'
import { createDeleteTooltip, createMoreInfoTooltip } from '@/utils/create-tooltip'
import React, { ChangeEvent, ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import InputSection from '../components/input-section/input-section';
import { ISelectOption } from '@/components/select-dropdown/interfaces/select-option.interface';
import { enumToKeyValueArray } from '@/utils/enum-to-array';
import { EUserGender } from '@/enums/user-gender.enum';
import { getSelectedOptionIndex } from '@/components/select-dropdown/utils/get-selected-option-index';
import { fetchGetCollections } from '@/utils/fetch-get-collections';
import Image from 'next/image';
import Tabs from '@/components/tabs/tabs';
import TabItem from '@/components/tabs/components/tab-item/tab-item';
import TimestampTabItem from '@/components/timestamp-tab-item/timestamp-tab-item';
import DateInput from '@/components/date-input/date-input';
import styles from './style.module.css';
import { MINIMUM_WORKING_AGE } from '@/constants/minimum-working-age.constant';
import { MAXIMUM_WORKING_AGE } from '@/constants/maximum-working-age.constant';
import { createCollectionDetailLink } from '@/utils/create-collection-detail-link';
import useNotificationsHook from '@/hooks/notifications-hook';
import { compressImage } from '@/components/compressImage';
import { ENotificationType } from '@/components/notify/notification/notification';
import Link from 'next/link';
import { getCollectionById } from '@/services/api-service';

// Thêm CSS cho tooltip
const ActionButtonStyles = {
  tooltipContainer: `relative inline-block`,
  tooltipText: `invisible absolute z-50 bg-gray-800 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap opacity-0 transition-opacity group-hover:visible group-hover:opacity-100`
};

type collectionType = IUser;
const collectionName: ECollectionNames = ECollectionNames.USER;

// Component Modal Chi tiết người dùng
const UserDetailModal = ({
  isOpen,
  onClose,
  userId
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: string
}) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [accountInfo, setAccountInfo] = useState<IAccount | null>(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!isOpen || !userId) return;

      try {
        setLoading(true);
        const response = await getCollectionById(userId, ECollectionNames.USER);
        const userData = await response.json();

        // Chuyển đổi name và address nếu là object
        if (userData && typeof userData.name === 'object') {
          userData.name = [userData.name.first, userData.name.middle, userData.name.last].filter(Boolean).join(' ');
        }
        if (userData && typeof userData.address === 'object') {
          userData.address = Object.values(userData.address).filter(Boolean).join(', ');
        }

        setUser(userData);

        // Lấy thông tin tài khoản
        if (userData.account_id) {
          const accountResponse = await getCollectionById(userData.account_id, ECollectionNames.ACCOUNT);
          const accountData = await accountResponse.json();
          setAccountInfo(accountData);
        }

        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin chi tiết:", error);
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Thông tin chi tiết nhân viên</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : user ? (
          <div className="p-6">
            {user.avatar && (
              <div className="flex justify-center mb-6">
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 shadow-md">
                  <Image
                    src={user.avatar}
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Tài khoản</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900">{accountInfo?.username || 'N/A'}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Họ và tên</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {user.name || ''}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900">{user.email || 'Chưa cập nhật'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Giới tính</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {user.gender === EUserGender.MALE
                      ? 'Nam'
                      : user.gender === EUserGender.FEMALE
                        ? 'Nữ'
                        : 'Khác'}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Ngày sinh</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {user.birthday
                      ? new Date(user.birthday).toLocaleDateString('vi-VN')
                      : 'Chưa cập nhật'}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Địa chỉ</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {user.address || ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Ngày tạo</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                      : 'Chưa có'}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Cập nhật lần cuối</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {user.updated_at
                      ? new Date(user.updated_at).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                      : 'Chưa có'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-red-500">
            Không thể tải thông tin người dùng
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// Component Modal Chi tiết tài khoản
const AccountDetailModal = ({
  isOpen,
  onClose,
  accountId
}: {
  isOpen: boolean;
  onClose: () => void;
  accountId: string
}) => {
  const [account, setAccount] = useState<IAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAccountDetails = async () => {
      if (!isOpen || !accountId) return;

      try {
        setLoading(true);
        const response = await getCollectionById(accountId, ECollectionNames.ACCOUNT);
        const accountData = await response.json();
        setAccount(accountData);
        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin chi tiết tài khoản:", error);
        setLoading(false);
      }
    };

    fetchAccountDetails();
  }, [isOpen, accountId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 bg-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Chi tiết tài khoản {accountId}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : account ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-gray-600">Tên tài khoản</div>
                <div className="col-span-3 bg-gray-200 rounded p-2">{account.username}</div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-gray-600">Mật khẩu</div>
                <div className="col-span-3 bg-gray-200 rounded p-2">{'•'.repeat(16)}</div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-gray-600">Là quản trị viên</div>
                <div className="col-span-3">
                  <input
                    type="checkbox"
                    checked={account.is_admin}
                    readOnly
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-gray-600">Ngày tạo</div>
                <div className="col-span-3 bg-gray-200 rounded p-2">
                  {new Date(account.created_at).toLocaleDateString('vi-VN')} {new Date(account.created_at).toLocaleTimeString('vi-VN')} SA
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-gray-600">Ngày cập nhật</div>
                <div className="col-span-3 bg-gray-200 rounded p-2">
                  {new Date(account.updated_at).toLocaleDateString('vi-VN')} {new Date(account.updated_at).toLocaleTimeString('vi-VN')} SA
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-red-500">
              Không thể tải thông tin tài khoản
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Thêm util ép _id về string
function ensureStringId<T extends { _id?: string }>(obj: T): T & { _id: string } {
  return { ...obj, _id: obj._id ? obj._id : '' } as T & { _id: string };
}

// Hàm chuyển đổi name/address về string nếu là object
function normalizeUserFields(users: IUser[]): ({ _id: string } & IUser)[] {
  return users.map(user => {
    const newUser = { ...user, _id: user._id || '' };
    if (newUser && typeof newUser.name === 'object') {
      const nameObj = newUser.name as any;
      newUser.name = [nameObj.first, nameObj.middle, nameObj.last].filter(Boolean).join(' ');
    }
    if (newUser && typeof newUser.address === 'object') {
      newUser.address = Object.values(newUser.address as any).filter(Boolean).join(', ');
    }
    return newUser;
  });
}

export default function User() {
  const { createNotification, notificationElements } = useNotificationsHook();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isModalReadOnly, setIsModalReadOnly] = useState<boolean>(false);
  const [isClickShowMore, setIsClickShowMore] = useState<ICollectionIdNotify>({
    id: ``,
    isClicked: false,
  });
  const [isClickDelete, setIsClickDelete] = useState<ICollectionIdNotify>({
    id: ``,
    isClicked: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accountOptions, setAccountOptions] = useState<ISelectOption[]>([]);
  const [account, setAccount] = useState<IAccount[]>([]);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Đảm bảo _id luôn là string khi truyền vào ManagerPage và khi dùng state
  const defaultUserWithStringId: { _id: string } & IUser = { ...DEFAULT_USER, _id: DEFAULT_USER._id || '' };
  const [user, setUser] = useState<{ _id: string } & IUser>(defaultUserWithStringId);

  const getAccounts: () => Promise<void> = useCallback(
    async (): Promise<void> => {
      const newAccounts: IAccount[] = await fetchGetCollections<IAccount>(
        ECollectionNames.ACCOUNT,
      );
      setAccount([...newAccounts])

      setUser({
        ...user,
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
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [user.account_id],
  );

  const handleChangeAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > 300 * 1024) {
        createNotification({
          id: Date.now(),
          children: 'Kích thước file không được vượt quá 300KB',
          type: ENotificationType.WARNING,
          isAutoClose: true,
          title: 'Cảnh báo',
        });
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        createNotification({
          id: Date.now(),
          children: 'Chỉ chấp nhận file ảnh định dạng JPG, PNG hoặc GIF',
          type: ENotificationType.WARNING,
          isAutoClose: true,
          title: 'Cảnh báo',
        });
        return;
      }

      const compressedFile = await compressImage(file, 800, 800, 0.7);
      setAvatarFile(compressedFile);
      setAvatarPreview(URL.createObjectURL(compressedFile));

      setUser({
        ...user,
        avatar: URL.createObjectURL(compressedFile),
        _id: user._id,
      });

      createNotification({
        id: Date.now(),
        children: 'Tải ảnh lên thành công',
        type: ENotificationType.SUCCESS,
        isAutoClose: true,
        title: 'Thành công',
      });
    } catch (error) {
      console.error('Lỗi khi xử lý ảnh:', error);
      createNotification({
        id: Date.now(),
        children: 'Có lỗi xảy ra khi xử lý ảnh',
        type: ENotificationType.ERROR,
        isAutoClose: true,
        title: 'Lỗi',
      });
    }
  }

  const uploadAvatar = async (file: File): Promise<string> => {
    try {
      if (!file) {
        throw new Error('Không có file được chọn');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'user');

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi khi upload ảnh');
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error('Không nhận được URL ảnh từ server');
      }

      createNotification({
        id: Date.now(),
        children: 'Upload ảnh thành công',
        type: ENotificationType.SUCCESS,
        isAutoClose: true,
        title: 'Thành công',
      });

      return data.url;
    } catch (error) {
      console.error('Lỗi trong quá trình upload:', error);
      createNotification({
        id: Date.now(),
        children: error instanceof Error ? error.message : 'Lỗi không xác định khi upload ảnh',
        type: ENotificationType.ERROR,
        isAutoClose: true,
        title: 'Lỗi',
      });
      throw error;
    }
  };

  useEffect((): void => {
    getAccounts();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const columns: Array<IColumnProps<collectionType>> = [
    {
      key: `index`,
      ref: useRef(null),
      title: `#`,
      size: `1fr`,
    },
    {
      key: `account_id`,
      ref: useRef(null),
      title: `Tài khoản`,
      size: `3fr`,
      render: (collection: collectionType): ReactElement => {
        const foundAccount = account.find((element) => element._id === collection.account_id)
        return <p>{foundAccount?.username}</p>
      }
    },
    {
      key: `name`,
      ref: useRef(null),
      title: `Họ tên`,
      size: `3fr`,
      render: (user: collectionType): ReactElement => {
        const name: string = user.name || '';
        return <Text isEllipsis={true} tooltip={name}>{name}</Text>
      }
    },
    {
      key: `email`,
      ref: useRef(null),
      title: `Email`,
      size: `3fr`,
    },
    {
      key: `birthday`,
      ref: useRef(null),
      title: `Ngày sinh`,
      size: `3fr`,
      render: (collection: collectionType): ReactElement => {
        if (!collection.birthday)
          return <Text isEllipsis={true}>NaN</Text>

        const date: string = new Date(collection.birthday).toLocaleDateString();
        return <Text isEllipsis={true} tooltip={date}>{date}</Text>
      }
    },
    {
      key: `gender`,
      ref: useRef(null),
      title: `Giới tính`,
      size: `2fr`,
      render: (collection: collectionType): ReactElement => {
        const gender: string = collection.gender === EUserGender.MALE
          ? `Nam`
          : collection.gender === EUserGender.FEMALE
            ? `Nữ`
            : `Khác`;
        return <Text isEllipsis={true} tooltip={gender}>{gender}</Text>
      }
    },
    {
      key: `avatar`,
      ref: useRef(null),
      title: `Hình ảnh`,
      size: `2fr`,
      render: (collection: collectionType): ReactElement => collection.avatar
        ? <div className="relative">
          <Image
            src={collection.avatar}
            alt="Avatar"
            width={40}
            height={40}
            className="object-contain rounded border"
          />
        </div>
        : <Text isItalic={true}>Không có</Text>
    },
    {
      key: `created_at`,
      ref: useRef(null),
      title: `Ngày tạo`,
      size: `2fr`,
      render: (collection: collectionType): ReactElement => {
        const date: string = collection.created_at
          ? new Date(collection.created_at).toLocaleDateString()
          : '';
        return <Text isEllipsis={true} tooltip={date}>{date}</Text>
      }
    },
    {
      title: `Thao tác`,
      ref: useRef(null),
      size: `2fr`,
      render: (collection: collectionType): ReactElement => (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={(): void => {
              setSelectedUserId(collection._id || '');
              setIsModalReadOnly(true);
              setShowDetailModal(true);
            }}
            className="group relative w-6 h-6 flex items-center justify-center"
            title="Xem chi tiết nhân viên"
          >
            <IconContainer
              iconLink={infoIcon}
              style={{ width: 20, height: 20 }}
              tooltip="Xem chi tiết nhân viên"
            />
            <span className={ActionButtonStyles.tooltipText}>Xem chi tiết nhân viên</span>
          </button>

          <Link
            href={`/home/user/${collection._id}`}
            className="group relative w-6 h-6 flex items-center justify-center"
            title="Chỉnh sửa"
          >
            <IconContainer
              iconLink={pencilIcon}
              style={{ width: 20, height: 20 }}
              tooltip="Chỉnh sửa"
            />
            <span className={ActionButtonStyles.tooltipText}>Chỉnh sửa</span>
          </Link>

          <button
            onClick={(): void => {
              setIsClickDelete({
                id: collection._id || '',
                isClicked: !isClickDelete.isClicked,
              });
            }}
            className="group relative w-6 h-6 flex items-center justify-center"
            title="Xóa"
          >
            <IconContainer
              iconLink={trashIcon}
              style={{ width: 20, height: 20 }}
              tooltip={createDeleteTooltip('Người dùng')}
            />
            <span className={ActionButtonStyles.tooltipText}>{createDeleteTooltip('Người dùng')}</span>
          </button>
        </div>
      )
    },
  ];

  const handleChangeAccountId = (e: ChangeEvent<HTMLSelectElement>): void => {
    setUser({
      ...user,
      account_id: e.target.value,
      _id: user._id,
    });
  }

  const handleChangeName = (e: ChangeEvent<HTMLInputElement>): void => {
    setUser({
      ...user,
      name: e.target.value,
      _id: user._id,
    });
  }

  const handleChangeAddress = (e: ChangeEvent<HTMLInputElement>): void => {
    setUser({
      ...user,
      address: e.target.value,
      _id: user._id,
    });
  }

  const handleChangeEmail = (e: ChangeEvent<HTMLInputElement>): void => {
    setUser({
      ...user,
      email: e.target.value,
      _id: user._id,
    });
  }

  const handleChangeBirthday = (e: ChangeEvent<HTMLInputElement>): void => {
    setUser({
      ...user,
      birthday: new Date(e.target.value),
      _id: user._id,
    });
  }

  const handleChangeGender = (e: ChangeEvent<HTMLSelectElement>): void => {
    setUser({
      ...user,
      gender: e.target.value,
      _id: user._id,
    });
  }

  const handleDeleteImage = (): void => {
    setUser({
      ...user,
      avatar: undefined,
      _id: user._id,
    });
    setAvatarFile(null);
    setAvatarPreview(null);
  }

  const genderOptions: ISelectOption[] = [
    { label: 'Nam', value: EUserGender.MALE },
    { label: 'Nữ', value: EUserGender.FEMALE },
    { label: 'Khác', value: EUserGender.UNKNOWN }
  ];

  // Đặt hàm handleSaveUser ở ngoài return, ngay trước return
  const handleSaveUser = async () => {
    try {
      let avatarUrl = user.avatar;
      if (avatarFile) {
        // Upload lên Cloudinary
        avatarUrl = await uploadAvatar(avatarFile);
      }
      // Gửi dữ liệu user lên server (tùy API của bạn)
      const userToSave = { ...user, avatar: avatarUrl };
      // TODO: Gọi API lưu user ở đây, ví dụ:
      // await saveUserApi(userToSave);
      createNotification({
        id: Date.now(),
        children: 'Lưu nhân viên thành công!',
        type: ENotificationType.SUCCESS,
        isAutoClose: true,
        title: 'Thành công',
      });
    } catch (error) {
      createNotification({
        id: Date.now(),
        children: 'Lưu nhân viên thất bại!',
        type: ENotificationType.ERROR,
        isAutoClose: true,
        title: 'Lỗi',
      });
    }
  };

  return (
    <ManagerPage<{ _id: string } & IUser>
      columns={columns}
      collectionName={collectionName}
      defaultCollection={defaultUserWithStringId}
      collection={user}
      setCollection={setUser}
      isModalReadonly={isModalReadOnly}
      setIsModalReadonly={setIsModalReadOnly}
      isClickShowMore={isClickShowMore}
      isClickDelete={isClickDelete}
      isLoaded={isLoading}
      additionalProcessing={normalizeUserFields}
    >
      <>
        <Tabs>
          <TabItem label={`Thông tin nhân viên`}>
            <div className="bg-white rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-600 mr-2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <span className="text-sm font-medium">Tài khoản <span className="text-red-500">*</span></span>
                    </label>
                    <div className="relative">
                      <SelectDropdown
                        name={`account_id`}
                        isLoading={isLoading}
                        isDisable={isModalReadOnly}
                        options={accountOptions}
                        defaultOptionIndex={getSelectedOptionIndex(
                          accountOptions, user.account_id || ''
                        )}
                        onInputChange={handleChangeAccountId}
                        className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-600 mr-2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <span className="text-sm font-medium">Họ và tên <span className="text-red-500">*</span></span>
                    </label>
                    <TextInput
                      name={`fullName`}
                      isDisable={isModalReadOnly}
                      value={user.name || ''}
                      onInputChange={handleChangeName}
                      className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nhập họ và tên đầy đủ"
                    />
                  </div>

                  <div>
                    <label className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-600 mr-2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      <span className="text-sm font-medium">Địa chỉ <span className="text-red-500">*</span></span>
                    </label>
                    <TextInput
                      name={`address`}
                      isDisable={isModalReadOnly}
                      value={user.address || ''}
                      onInputChange={handleChangeAddress}
                      placeholder="Nhập địa chỉ đầy đủ"
                      className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-600 mr-2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      <span className="text-sm font-medium">Email</span>
                    </label>
                    <TextInput
                      textType={`email`}
                      name={`email`}
                      isDisable={isModalReadOnly}
                      value={user.email}
                      onInputChange={handleChangeEmail}
                      placeholder="Nhập địa chỉ email"
                      className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-600 mr-2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <span className="text-sm font-medium">Ngày sinh</span>
                    </label>
                    <div className="relative">
                      <DateInput
                        min={(() => {
                          const date = new Date();
                          date.setFullYear(date.getFullYear() - MAXIMUM_WORKING_AGE);
                          return date.toISOString().split('T')[0];
                        })()}
                        max={(() => {
                          const date = new Date();
                          date.setFullYear(date.getFullYear() - MINIMUM_WORKING_AGE);
                          return date.toISOString().split('T')[0];
                        })()}
                        name={`birthday`}
                        isDisable={isModalReadOnly}
                        value={user.birthday}
                        onInputChange={handleChangeBirthday}
                        className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                        placeholder="dd/mm/yyyy"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-600 mr-2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <span className="text-sm font-medium">Giới tính</span>
                    </label>
                    <div className="relative">
                      <SelectDropdown
                        isDisable={isModalReadOnly}
                        options={genderOptions}
                        defaultOptionIndex={getSelectedOptionIndex(
                          genderOptions,
                          (user.gender
                            ? user.gender
                            : EUserGender.FEMALE
                          ) as unknown as string
                        )}
                        onInputChange={handleChangeGender}
                        className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-600 mr-2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <span className="text-sm font-medium">Hình đại diện</span>
                    </label>
                    <div className="flex justify-center">
                      <div
                        onClick={() => document.getElementById('avatar-input')?.click()}
                        className="w-24 h-24 border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleChangeAvatar}
                          className="hidden"
                          id="avatar-input"
                          disabled={isModalReadOnly}
                        />
                        {!avatarPreview && !user.avatar ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500 mb-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs text-blue-500 text-center">Chọn ảnh avatar</span>
                          </>
                        ) : (
                          <img
                            src={avatarPreview || user.avatar}
                            alt="Avatar"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        )}
                      </div>
                      {(avatarPreview || user.avatar) && !isModalReadOnly && (
                        <button
                          type="button"
                          onClick={handleDeleteImage}
                          className="ml-2 p-1 bg-red-100 rounded-full text-red-500 hover:bg-red-200 transition-colors"
                          title="Xóa ảnh"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* <div className="flex justify-end gap-3 mt-8">
                <Button
                  onClick={() => {
                    setUser(defaultUserWithStringId);
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  }}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                >
                  Hủy bỏ
                </Button>
                <Button
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                  onClick={handleSaveUser}
                >
                  Lưu nhân viên
                </Button>
              </div> */}
            </div>
          </TabItem>
        </Tabs>

        {/* Modal Xem Chi Tiết */}
        <UserDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          userId={selectedUserId}
        />

        {/* Modal Xem Chi Tiết Tài Khoản */}
        <AccountDetailModal
          isOpen={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          accountId={selectedAccountId}
        />

        {notificationElements}
      </>
    </ManagerPage>
  )
}
