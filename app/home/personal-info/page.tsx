'use client';

import React, { ChangeEvent, ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import { LoadingScreen, Text, Button, TextInput, Modal } from '@/components'
import { IUser } from '@/interfaces';
import { DEFAULT_USER } from '@/constants/user.constant';
import { me, logout, auth } from '@/services/Auth';
import { IAccountPayload } from '@/app/api/interfaces/account-payload.interface';
import { ERoleAction } from '@/interfaces/role.interface';
import { ECollectionNames } from '@/enums';
import { EButtonType } from '@/components/button/interfaces/button-type.interface';
import Image from 'next/legacy/image';
import useNotificationsHook from '@/hooks/notifications-hook';
import { ENotificationType } from '@/components/notify/notification/notification';
import { EUserGender } from '@/enums/user-gender.enum';

// Component hiển thị trường thông tin
const FormField = React.memo(({
  label,
  editing,
  editValue,
  displayValue,
  required = false
}: {
  label: string;
  editing: boolean;
  editValue: React.ReactNode;
  displayValue: React.ReactNode;
  required?: boolean;
}) => (
  <div className="mb-0">
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-5 flex flex-col min-h-[100px] hover:shadow-md transition-shadow duration-200">
      <div className="text-gray-700 font-semibold mb-2 text-base flex items-center">
        {label} {required && <span className="text-red-500 ml-1">*</span>}
      </div>
      <div className="flex-1 text-lg text-gray-900">
        {editing ? editValue : displayValue}
      </div>
    </div>
  </div>
));

FormField.displayName = 'FormField';

// Component xử lý input đầu vào
const InputField = React.memo(({
  name,
  value,
  placeholder = "",
  onChange
}: {
  name: string;
  value: string;
  placeholder?: string;
  onChange: (name: string, value: string) => void;
}) => {
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(name, newValue);
  };

  return (
    <TextInput
      name={name}
      value={inputValue}
      placeholder={placeholder}
      onInputChange={handleChange}
    />
  );
});

InputField.displayName = 'InputField';

// Component cho form đổi mật khẩu
interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  onChangePassword: (data: { current_password: string, password: string }) => Promise<void>;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  isLoading: parentLoading,
  onChangePassword
}) => {
  // Sử dụng useRef thay vì useState để tránh re-render khi nhập liệu
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // State để quản lý việc hiển thị/ẩn mật khẩu
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Reset form khi đóng modal
  const handleClose = useCallback((): void => {
    if (currentPasswordRef.current) currentPasswordRef.current.value = '';
    if (newPasswordRef.current) newPasswordRef.current.value = '';
    if (confirmPasswordRef.current) confirmPasswordRef.current.value = '';
    setError('');
    // Reset các trạng thái hiển thị mật khẩu
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  }, [onClose]);

  // Các hàm xử lý việc hiển thị/ẩn mật khẩu
  const toggleCurrentPasswordVisibility = useCallback((): void => {
    setShowCurrentPassword(prev => !prev);
  }, []);

  const toggleNewPasswordVisibility = useCallback((): void => {
    setShowNewPassword(prev => !prev);
  }, []);

  const toggleConfirmPasswordVisibility = useCallback((): void => {
    setShowConfirmPassword(prev => !prev);
  }, []);

  // Xử lý khi submit form đổi mật khẩu
  const handleSubmit = useCallback(async (): Promise<void> => {
    try {
      // Lấy giá trị từ các input fields
      const currentPassword = currentPasswordRef.current?.value.trim() || '';
      const newPassword = newPasswordRef.current?.value.trim() || '';
      const confirmPassword = confirmPasswordRef.current?.value.trim() || '';

      // Kiểm tra các trường nhập liệu
      if (!currentPassword) {
        setError('Vui lòng nhập mật khẩu hiện tại');
        currentPasswordRef.current?.focus();
        return;
      }

      if (!newPassword) {
        setError('Vui lòng nhập mật khẩu mới');
        newPasswordRef.current?.focus();
        return;
      }

      if (newPassword.length < 5) {
        setError('Mật khẩu mới phải có ít nhất 5 ký tự');
        newPasswordRef.current?.focus();
        return;
      }

      if (!confirmPassword) {
        setError('Vui lòng xác nhận mật khẩu mới');
        confirmPasswordRef.current?.focus();
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp với mật khẩu mới');
        confirmPasswordRef.current?.focus();
        return;
      }

      // Bắt đầu quá trình submit
      setIsSubmitting(true);
      setError('');

      console.log('Chuẩn bị gửi yêu cầu đổi mật khẩu...');

      // Gọi hàm onChangePassword được truyền vào từ props
      await onChangePassword({
        current_password: currentPassword,
        password: newPassword
      });

      // Xử lý sau khi đổi mật khẩu thành công
      handleClose();
      alert('Đổi mật khẩu thành công!');
    } catch (error) {
      // Xử lý lỗi
      const errorMessage = error instanceof Error ? error.message : 'Không xác định';
      console.error('Lỗi khi đổi mật khẩu:', errorMessage);

      // Hiển thị lỗi và xử lý các trường hợp đặc biệt
      if (errorMessage.toLowerCase().includes('mật khẩu hiện tại không đúng') ||
        errorMessage.toLowerCase().includes('unauthorized') ||
        errorMessage.includes('401')) {
        setError('Mật khẩu hiện tại không đúng. Vui lòng kiểm tra lại.');

        // Xóa nội dung ô mật khẩu hiện tại và focus vào đó
        if (currentPasswordRef.current) {
          currentPasswordRef.current.value = '';
          currentPasswordRef.current.focus();
        }
      } else {
        setError(`Lỗi: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [handleClose, onChangePassword]);

  return (
    <Modal
      isOpen={isOpen}
      setIsOpen={onClose}
      title="Đổi mật khẩu"
      showButtons={false}
    >
      <div className="space-y-4 p-4">
        {error && (
          <div className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-md mb-2">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Text>Mật khẩu hiện tại <span className="text-red-500">*</span></Text>
          <div className="relative">
            <input
              ref={currentPasswordRef}
              type={showCurrentPassword ? "text" : "password"}
              name="currentPassword"
              placeholder="Nhập mật khẩu hiện tại"
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              defaultValue=""
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={toggleCurrentPasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
            >
              {showCurrentPassword ? (
                <Image
                  src="/hide.svg"
                  alt="Ẩn mật khẩu"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              ) : (
                <Image
                  src="/view.svg"
                  alt="Hiển thị mật khẩu"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Text>Mật khẩu mới <span className="text-red-500">*</span></Text>
          <div className="relative">
            <input
              ref={newPasswordRef}
              type={showNewPassword ? "text" : "password"}
              name="newPassword"
              placeholder="Tối thiểu 5 ký tự"
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={toggleNewPasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
            >
              {showNewPassword ? (
                <Image
                  src="/hide.svg"
                  alt="Ẩn mật khẩu"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              ) : (
                <Image
                  src="/view.svg"
                  alt="Hiển thị mật khẩu"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Text>Xác nhận mật khẩu mới <span className="text-red-500">*</span></Text>
          <div className="relative">
            <input
              ref={confirmPasswordRef}
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Nhập lại mật khẩu mới"
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={toggleConfirmPasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? (
                <Image
                  src="/hide.svg"
                  alt="Ẩn mật khẩu"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              ) : (
                <Image
                  src="/view.svg"
                  alt="Hiển thị mật khẩu"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button type={EButtonType.INFO} onClick={handleClose}>
            <Text>Hủy</Text>
          </Button>

          <Button
            type={EButtonType.SUCCESS}
            onClick={handleSubmit}
            isDisable={isSubmitting || parentLoading}
          >
            <Text>{isSubmitting ? 'Đang xử lý...' : 'Lưu thay đổi'}</Text>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default function PersonalInfo(): ReactElement {
  // --------------------------------------------------
  // STATE DEFINITIONS
  // --------------------------------------------------
  // Các trạng thái chính
  const [user, setUser] = useState<IUser>(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editableUser, setEditableUser] = useState<IUser>(DEFAULT_USER);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { createNotification, notificationElements } = useNotificationsHook();

  // Trạng thái modal đổi mật khẩu
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);

  // Refs cho các input fields
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);
  const birthdayRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLSelectElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------
  // HELPER FUNCTIONS
  // --------------------------------------------------

  // Cập nhật giá trị từ refs vào state khi người dùng bấm lưu
  const updateFromRefs = useCallback(() => {
    if (isEditing) {
      const updatedUser = { ...editableUser };

      if (nameRef.current) updatedUser.name = nameRef.current.value.trim();
      if (emailRef.current) updatedUser.email = emailRef.current.value.trim();
      if (addressRef.current) updatedUser.address = addressRef.current.value.trim();
      if (genderRef.current) updatedUser.gender = genderRef.current.value;

      if (birthdayRef.current && birthdayRef.current.value) {
        try {
          const dateValue = birthdayRef.current.value;
          const birthDate = new Date(dateValue);

          if (!isNaN(birthDate.getTime())) {
            updatedUser.birthday = birthDate;
          }
        } catch (error) {
          console.error("Lỗi khi xử lý ngày sinh:", error);
        }
      } else {
        updatedUser.birthday = undefined;
      }

      setEditableUser(updatedUser);
    }
  }, [editableUser, isEditing]);

  // Cập nhật giá trị vào refs khi bắt đầu chỉnh sửa
  useEffect(() => {
    if (isEditing) {
      if (nameRef.current) nameRef.current.value = editableUser.name || '';
      if (emailRef.current) emailRef.current.value = editableUser.email || '';
      if (addressRef.current) addressRef.current.value = editableUser.address || '';
      if (genderRef.current) genderRef.current.value = editableUser.gender || EUserGender.UNKNOWN;
      if (birthdayRef.current && editableUser.birthday) {
        birthdayRef.current.value = new Date(editableUser.birthday).toISOString().split('T')[0];
      }
      if (phoneRef.current) phoneRef.current.value = "0369445470"; // Giả định số điện thoại cố định
    }
  }, [isEditing, editableUser]);

  // --------------------------------------------------
  // API HANDLERS
  // --------------------------------------------------
  /**
   * Lấy thông tin người dùng hiện tại từ API
   */
  const getCurrentUser = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const meApiResponse = await me();
      if (!meApiResponse.ok) {
        if (meApiResponse.status === 401) {
          // Nếu lỗi là 401 Unauthorized, chuyển hướng người dùng đến trang đăng nhập
          window.location.href = '/auth/login';
          return;
        }
        throw new Error(`Lỗi API me: ${meApiResponse.status} ${meApiResponse.statusText}`);
      }

      const responseText = await meApiResponse.text();
      if (!responseText) {
        throw new Error('Phản hồi API me trống');
      }

      const meApiJson: IAccountPayload = JSON.parse(responseText);
      const accountId = meApiJson._id;
      if (!accountId) {
        throw new Error('Không tìm thấy ID tài khoản');
      }

      // Kiểm tra quyền quản trị
      const isAdmin = await checkAdminPrivilege();
      await fetchUserData(accountId, isAdmin);
    } finally {
      setIsLoading(false);
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  /**
   * Kiểm tra quyền quản trị của người dùng
   */
  const checkAdminPrivilege = useCallback(async (): Promise<boolean> => {
    try {
      const authResponse = await auth(ERoleAction.READ, ECollectionNames.ACCOUNT);
      if (authResponse.ok) {
        const authData = await authResponse.json();
        return authData.isAccountHadPrivilage === true;
      }
    } catch {
      // Xử lý lỗi mặc định
    }
    return false;
  }, []);

  /**
   * Lấy thông tin người dùng dựa trên ID tài khoản
   */
  const fetchUserData = useCallback(async (accountId: string, isAdmin: boolean): Promise<void> => {
    try {
      const userApiResponse = await fetch(`/api/user/account/${accountId}`);

      if (userApiResponse.ok) {
        const userResponseText = await userApiResponse.text();
        if (!userResponseText) {
          throw new Error('Phản hồi API user trống');
        }

        const userApiJson: IUser = JSON.parse(userResponseText);
        const completeUser = {
          ...DEFAULT_USER,
          ...userApiJson,
          position: isAdmin ? 'Quản lý' : 'Nhân viên'
        };

        setUser(completeUser);
        setEditableUser(completeUser);
      } else if (userApiResponse.status === 404) {
        // Người dùng mới
        const emptyUserInfo: IUser = {
          ...DEFAULT_USER,
          account_id: accountId,
          name: '',
          email: '',
          address: '',
          position: isAdmin ? 'Quản lý' : 'Nhân viên'
        };

        setUser(emptyUserInfo);
        setEditableUser(emptyUserInfo);
        setIsEditing(true);

        createNotification({
          id: new Date().getTime(),
          children: <Text>Vui lòng cập nhật thông tin cá nhân của bạn</Text>,
          type: ENotificationType.INFO,
          isAutoClose: true,
        });
      } else {
        throw new Error(`Lỗi API user: ${userApiResponse.status} ${userApiResponse.statusText}`);
      }
    } catch (error) {
      createNotification({
        id: new Date().getTime(),
        children: <Text>Lỗi: {error instanceof Error ? error.message : 'Không xác định'}</Text>,
        type: ENotificationType.ERROR,
        isAutoClose: true,
      });
    }
  }, [createNotification]);

  // --------------------------------------------------
  // UPDATE HANDLERS
  // --------------------------------------------------
  /**
   * Lưu thông tin cho người dùng lần đầu
   */
  const handleSaveFirstTimeUser = useCallback(async (): Promise<void> => {
    // Cập nhật thông tin từ refs trước khi lưu
    updateFromRefs();

    // Kiểm tra thông tin đầu vào
    if (!editableUser.name || editableUser.name.trim() === '') {
      alert('Vui lòng nhập họ tên của bạn!');
      return;
    }

    if (!editableUser.address || editableUser.address.trim() === '') {
      alert('Vui lòng nhập địa chỉ của bạn!');
      return;
    }

    // Kiểm tra email hợp lệ
    if (!editableUser.email || editableUser.email.trim() === '') {
      alert('Vui lòng nhập email của bạn!');
      return;
    }

    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editableUser.email.trim())) {
      alert('Email không đúng định dạng!');
      return;
    }

    setIsLoading(true);

    try {
      // Tạo bản sao để tránh thay đổi trực tiếp state
      const userData: IUser = {
        ...editableUser,
        account_id: user.account_id,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Đảm bảo email được cập nhật đúng
      if (emailRef.current) {
        userData.email = emailRef.current.value.trim();
      }

      // Xử lý ngày sinh nếu có
      // if (userData.birthday instanceof Date) {
      //   userData.birthday = userData.birthday.toISOString();
      // } else if (userData.birthday) {
      //   userData.birthday = new Date(userData.birthday).toISOString();
      // }

      console.log("Dữ liệu người dùng mới gửi lên server:", userData);

      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error(`Lưu thông tin không thành công: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Phản hồi API tạo thông tin trống');
      }

      const createdUser = JSON.parse(responseText);
      setUser(createdUser);
      setIsEditing(false);
      alert('Lưu thông tin cá nhân thành công!');

      // Làm mới dữ liệu từ server sau một khoảng thời gian ngắn
      setTimeout(() => {
        getCurrentUser();
      }, 500);
    } catch (error) {
      alert(`Lỗi khi lưu thông tin: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
    } finally {
      setIsLoading(false);
    }
  }, [editableUser, user.account_id, updateFromRefs, getCurrentUser]);

  // Cập nhật giá trị vào refs khi bắt đầu chỉnh sửa - không còn cần thiết
  useEffect(() => {
    if (isEditing) {
      // Không cần làm gì vì đã dùng defaultValue cho tất cả các trường
      console.log("Bắt đầu chỉnh sửa với dữ liệu:", editableUser);
    }
  }, [isEditing, editableUser]);

  // Cập nhật handleSaveChanges để đọc từ refs
  const handleSaveChanges = useCallback(async (): Promise<void> => {
    if (!user._id) {
      return handleSaveFirstTimeUser();
    }

    // Cập nhật thông tin từ refs trước khi lưu
    updateFromRefs();

    // Kiểm tra thông tin đầu vào
    if (!editableUser.name || editableUser.name.trim() === '') {
      alert('Vui lòng nhập họ tên của bạn!');
      return;
    }

    if (!editableUser.address || editableUser.address.trim() === '') {
      alert('Vui lòng nhập địa chỉ của bạn!');
      return;
    }

    // Kiểm tra email hợp lệ
    if (!editableUser.email || editableUser.email.trim() === '') {
      alert('Vui lòng nhập email của bạn!');
      return;
    }

    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editableUser.email.trim())) {
      alert('Email không đúng định dạng!');
      return;
    }

    setIsLoading(true);

    try {
      // Chuẩn bị dữ liệu gửi lên
      // Tạo bản sao của editableUser để tránh thay đổi trực tiếp state
      const userData: IUser = {
        ...editableUser,
        _id: user._id,
        account_id: user.account_id,
        updated_at: new Date()
      };

      // Đảm bảo email được cập nhật đúng
      if (emailRef.current) {
        userData.email = emailRef.current.value.trim();
      }

      // Đảm bảo ngày sinh đúng định dạng khi gửi lên API
      // Chuyển đổi ngày sinh thành ISO string nếu có
      // if (userData.birthday instanceof Date) {
      //   userData.birthday = userData.birthday.toISOString();
      // } else if (userData.birthday) {
      //   // Nếu birthday không phải Date object nhưng có giá trị
      //   userData.birthday = new Date(userData.birthday).toISOString();
      // }

      console.log("Dữ liệu gửi lên server:", userData);

      const response = await fetch(`/api/user/${user._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (!errorText) {
          throw new Error(`Cập nhật thông tin không thành công: ${response.status} ${response.statusText}`);
        }

        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || 'Cập nhật thông tin không thành công');
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Phản hồi API cập nhật thông tin trống');
      }

      // Cập nhật thông tin người dùng
      const updatedUser = JSON.parse(responseText);
      console.log("Dữ liệu nhận về từ server:", updatedUser);
      setUser(updatedUser);
      setIsEditing(false);
      alert('Cập nhật thông tin cá nhân thành công!');

      // Làm mới dữ liệu từ server sau một khoảng thời gian ngắn
      setTimeout(() => {
        getCurrentUser();
      }, 500);
    } catch (error) {
      alert(`Lỗi khi cập nhật thông tin: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
    } finally {
      setIsLoading(false);
    }
  }, [editableUser, handleSaveFirstTimeUser, user._id, user.account_id, updateFromRefs, getCurrentUser]);

  // --------------------------------------------------
  // USER INTERACTION HANDLERS
  // --------------------------------------------------
  /**
   * Bắt đầu hoặc lưu thông tin chỉnh sửa
   */
  const handleEditActions = useCallback((): void => {
    if (isEditing) {
      handleSaveChanges();
    } else {
      // Đặt dữ liệu ban đầu khi bắt đầu chỉnh sửa
      setEditableUser({ ...user });
      setIsEditing(true);
    }
  }, [isEditing, user, handleSaveChanges]);

  /**
   * Xử lý khi người dùng thay đổi avatar
   */
  const handleImageChange = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditableUser(prev => ({
          ...prev,
          avatar: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  /**
   * Xử lý khi người dùng chọn ảnh từ thiết bị
   */
  const handleSelectImage = useCallback((): void => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  /**
   * Hiển thị giới tính người dùng dưới dạng văn bản
   */
  const getGenderText = useCallback((genderValue: string | undefined): string => {
    switch (genderValue) {
      case EUserGender.MALE: return "Nam";
      case EUserGender.FEMALE: return "Nữ";
      default: return "Không xác định";
    }
  }, []);

  // --------------------------------------------------
  // PASSWORD MANAGEMENT
  // --------------------------------------------------
  /**
   * Mở modal đổi mật khẩu
   */
  const handleOpenChangePasswordModal = useCallback((): void => {
    setIsChangePasswordModalOpen(true);
  }, []);

  /**
   * Đóng modal đổi mật khẩu
   */
  const handleCloseChangePasswordModal = useCallback((): void => {
    setIsChangePasswordModalOpen(false);
  }, []);

  /**
   * Thực hiện đổi mật khẩu
   */
  const handleChangePassword = useCallback(async (data: { current_password: string, password: string }): Promise<void> => {
    if (!user.account_id) {
      throw new Error('Không tìm thấy ID tài khoản');
    }

    try {
      // Đảm bảo trim dữ liệu đầu vào
      const currentPassword = data.current_password.trim();
      const newPassword = data.password.trim();

      console.log('Thông tin đổi mật khẩu:', {
        _id: user.account_id,
        current_password: currentPassword,
        password: newPassword
      });

      // Gửi yêu cầu đổi mật khẩu
      const response = await fetch(`/api/account/change-password/${user.account_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _id: user.account_id,
          current_password: currentPassword,
          password: newPassword
        }),
      });

      const responseText = await response.text();
      console.log('API response:', response.status, responseText);

      if (!response.ok) {
        let errorMessage = `Đổi mật khẩu không thành công: ${response.status} ${response.statusText}`;

        try {
          if (responseText) {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorMessage;
          }
        } catch (parseError) {
          console.error('Lỗi khi parse JSON response:', parseError);
        }

        if (response.status === 401) {
          throw new Error('Mật khẩu hiện tại không đúng. Vui lòng kiểm tra lại.');
        } else if (response.status === 404) {
          throw new Error('Không tìm thấy tài khoản. Vui lòng đăng nhập lại.');
        } else if (response.status === 400) {
          throw new Error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.');
        } else {
          throw new Error(errorMessage);
        }
      }

      return; // Trả về khi thành công
    } catch (error) {
      console.error("Lỗi khi đổi mật khẩu:", error);
      throw error; // Ném lỗi để component ModalChangePassword xử lý
    }
  }, [user.account_id]);

  /**
   * Xử lý đăng xuất khỏi hệ thống
   */
  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      const response = await logout();
      if (response.ok) {
        window.location.href = '/';
      } else {
        createNotification({
          id: new Date().getTime(),
          children: <Text>Đăng xuất không thành công, vui lòng thử lại sau!</Text>,
          type: ENotificationType.ERROR,
          isAutoClose: true,
        });
      }
    } catch (error) {
      createNotification({
        id: new Date().getTime(),
        children: <Text>Lỗi khi đăng xuất: {error instanceof Error ? error.message : 'Lỗi không xác định'}</Text>,
        type: ENotificationType.ERROR,
        isAutoClose: true,
      });
    }
  }, [createNotification]);

  const handleCancelEdit = useCallback((): void => {
    setEditableUser({ ...user });
    setIsEditing(false);
  }, [user]);

  // --------------------------------------------------
  // EFFECTS
  // --------------------------------------------------
  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  // ----- RENDER COMPONENTS -----

  // Component cho ảnh đại diện
  const AvatarSection = useCallback(() => (
    <div className="flex flex-col items-center mb-6 mt-4">
      <div
        className={`w-48 h-48 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center relative shadow-lg border-4 border-white ${isEditing ? 'cursor-pointer hover:opacity-90 transition-opacity duration-300' : ''}`}
        onClick={isEditing ? handleSelectImage : undefined}
      >
        {editableUser.avatar && isEditing ? (
          <Image src={editableUser.avatar} alt="Avatar" width={192} height={192} className="object-cover w-full h-full" unoptimized={true} />
        ) : user.avatar ? (
          <Image src={user.avatar} alt="Avatar" width={192} height={192} className="object-cover w-full h-full" unoptimized={true} />
        ) : (
          <Image src="/avatar.svg" alt="Default avatar" width={192} height={192} className="object-cover w-full h-full" priority />
        )}
        {isEditing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="text-white text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <Text className="text-sm font-medium">Thay đổi ảnh</Text>
            </div>
          </div>
        )}
      </div>
      {!isEditing && user.position && (
        <div className="mt-4 bg-blue-100 text-blue-700 px-6 py-2 rounded-full font-semibold text-lg shadow-sm">
          {user.position}
        </div>
      )}
    </div>
  ), [editableUser.avatar, user.avatar, user.position, isEditing, handleSelectImage]);

  // Component cho phần thông tin người dùng

  // Component cho phần actions
  const ActionButtons = useCallback(() => (
    <div className="flex gap-4 mt-8 justify-center w-full">
      <Button
        type={isEditing ? EButtonType.SUCCESS : EButtonType.INFO}
        onClick={handleEditActions}
        className={`px-8 py-3 rounded-xl text-lg font-semibold transition-all duration-300 ${isEditing ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        <Text className="font-semibold text-white">{isEditing ? 'Lưu thay đổi' : 'Chỉnh sửa'}</Text>
      </Button>
      <Button
        type={EButtonType.INFO}
        onClick={handleOpenChangePasswordModal}
        className="px-8 py-3 rounded-xl text-lg font-semibold bg-blue-600 hover:bg-blue-700 transition-all duration-300"
      >
        <Text className="font-semibold text-white">Đổi mật khẩu</Text>
      </Button>
      <Button
        type={EButtonType.ERROR}
        onClick={handleLogout}
        className="px-8 py-3 rounded-xl text-lg font-semibold bg-red-600 hover:bg-red-700 transition-all duration-300"
      >
        <Text className="font-semibold text-white">Đăng xuất</Text>
      </Button>
    </div>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [isEditing, handleEditActions, handleOpenChangePasswordModal, handleLogout, handleCancelEdit]);

  // ----- MAIN RENDER -----
  return (
    <>
      {isLoading && <LoadingScreen />}

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageChange}
        style={{ display: 'none' }}
      />

      <div className="min-h-screen bg-gray-50 py-10 px-2">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 flex flex-col md:flex-row gap-10 items-center md:items-start">
          {/* Avatar + chức vụ */}
          <div className="flex flex-col items-center md:items-start md:w-1/3 w-full">
            <AvatarSection />
          </div>
          {/* Thông tin cá nhân */}
          <div className="flex-1 w-full">
            <Text size={28} className="font-bold mb-6 text-gray-800 text-center md:text-left">Thông tin cá nhân</Text>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Họ tên */}
              <FormField
                label="Họ tên"
                editing={isEditing}
                editValue={
                  <input
                    ref={nameRef}
                    type="text"
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 w-full"
                    placeholder="Nhập họ và tên đầy đủ"
                    defaultValue={editableUser.name || ''}
                  />
                }
                displayValue={<Text>{user.name || 'Chưa cập nhật'}</Text>}
              />
              {/* Email */}
              <FormField
                label="Email"
                editing={isEditing}
                editValue={
                  <input
                    ref={emailRef}
                    type="email"
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 w-full"
                    placeholder="Nhập địa chỉ email"
                    defaultValue={editableUser.email || ''}
                  />
                }
                displayValue={<Text>{user.email || 'Chưa cập nhật'}</Text>}
              />
              {/* Số điện thoại */}
              <FormField
                label="Số điện thoại"
                editing={isEditing}
                editValue={
                  <input
                    ref={phoneRef}
                    type="text"
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 w-full"
                    placeholder="Nhập số điện thoại"
                    defaultValue="0369445470"
                    readOnly
                  />
                }
                displayValue={<Text>0369445470</Text>}
              />
              {/* Địa chỉ */}
              <FormField
                label="Địa chỉ"
                editing={isEditing}
                editValue={
                  <textarea
                    ref={addressRef}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Nhập địa chỉ đầy đủ"
                    defaultValue={editableUser.address || ''}
                    rows={3}
                  />
                }
                displayValue={<Text>{user.address || 'Chưa cập nhật'}</Text>}
              />
              {/* Ngày sinh */}
              <FormField
                label="Ngày sinh"
                editing={isEditing}
                editValue={
                  <input
                    ref={birthdayRef}
                    type="date"
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 w-full"
                    defaultValue={editableUser.birthday ? new Date(editableUser.birthday).toISOString().split('T')[0] : ''}
                  />
                }
                displayValue={<Text>{user.birthday ? new Date(user.birthday).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</Text>}
              />
              {/* Giới tính */}
              <FormField
                label="Giới tính"
                editing={isEditing}
                editValue={
                  <select
                    ref={genderRef}
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 w-full"
                    defaultValue={editableUser.gender || EUserGender.UNKNOWN}
                  >
                    <option value={EUserGender.MALE}>Nam</option>
                    <option value={EUserGender.FEMALE}>Nữ</option>
                    <option value={EUserGender.UNKNOWN}>Không xác định</option>
                  </select>
                }
                displayValue={<Text>{getGenderText(user.gender)}</Text>}
              />
              {/* Chức vụ */}
              <FormField
                label="Chức vụ"
                editing={isEditing}
                editValue={<Text>{user.position || 'Nhân viên'}</Text>}
                displayValue={<Text>{user.position || 'Quản lý'}</Text>}
              />
            </div>
            {/* Nút thao tác */}
            <div className="flex flex-col md:flex-row gap-3 mt-8 justify-center md:justify-end">
              <ActionButtons />
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={handleCloseChangePasswordModal}
        isLoading={isLoading}
        onChangePassword={handleChangePassword}
      />

      {notificationElements}
    </>
  )
}
