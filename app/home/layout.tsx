'use client';

import { CSSProperties, ReactElement, useState, useEffect } from 'react';
import NavbarItem from '@/app/home/components/navbar-item/navbar-item';
import chevronRightIcon from '@/public/chevron-right.svg?url';
import chevronLeftIcon from '@/public/chevron-left.svg?url';
import homeIcon from '@/public/home.svg?url';
import scrollIcon from '@/public/scroll.svg?url';
import plusIcon from '@/public/plus.svg?url';
import listRestartIcon from '@/public/list-restart.svg?url';
import warehouseIcon from '@/public/warehouse.svg?url';
import truckIcon from '@/public/truck.svg?url';
import circleUserRoundIcon from '@/public/circle-user-round.svg?url';
import userIcon from '@/public/user.svg?url';
import factoryIcon from '@/public/factory.svg?url';
import circleSmallIcon from '@/public/circle-small.svg?url';
import toyBrickIcon from '@/public/toy-brick.svg?url';
import boxIcon from '@/public/box.svg?url';
import boxesIcon from '@/public/boxes.svg?url';
import chartBarIcon from '@/public/chart-bar.svg?url';
import dollarSignIcon from '@/public/dollar-sign.svg?url';
import settingIcon from '@/public/setting.svg?url';
import newspaperIcon from '@/public/newspaper.svg?url';
import logOutIcon from '@/public/log-out.svg?url';
import { IRootLayout } from '@/interfaces/root-layout.interface';
import styles from './style.module.css';

export interface CNavbarItem {
  link?: string
  label: string
  icon: string
  onClick?: () => void
  children?: CNavbarItem[]
  isExpanded?: boolean
  requiredAdmin?: boolean
}

export default function RootLayout({
  children
}: Readonly<IRootLayout>): ReactElement {
  const [isExpand, setIsExpand] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    // Kiểm tra quyền admin khi component được tải
    const checkAdminStatus = async () => {
      try {
        const meResponse = await fetch('/api/auth/me');
        if (!meResponse.ok) {
          window.location.href = '/';
          return;
        }

        const userData = await meResponse.json();
        console.log('userData:', userData); // Debug: Xem thông tin người dùng

        const authResponse = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });

        if (authResponse.ok) {
          const authData = await authResponse.json();
          console.log('authData:', authData); // Debug: Xem thông tin phản hồi từ API
          setIsAdmin(authData.isAccountHadPrivilage === true);
        }
      } catch (error) {
        console.error('Lỗi khi kiểm tra quyền:', error);
      }
    };

    checkAdminStatus();
  }, []);

  const toggleNavbar = (): void => {
    setIsExpand((prev: boolean): boolean => !prev);
  }

  const toggleGroup = (groupKey: string): void => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  }

  const currentPath: string = `/home`;

  // Xác định các mục menu dựa trên quyền admin
  let navbarItems: CNavbarItem[] = [
    {
      label: isExpand ? `Thu gọn` : `Mở rộng`,
      icon: isExpand ? chevronLeftIcon : chevronRightIcon,
      onClick: toggleNavbar,
    },
    {
      link: `${currentPath}/`,
      label: `Trang chủ`,
      icon: homeIcon,
    },
    {
      label: `Quản lý bán hàng`,
      icon: scrollIcon,
      isExpanded: expandedGroups['sales'],
      onClick: () => toggleGroup('sales'),
      children: [
        {
          link: `${currentPath}/order`,
          label: `Danh sách đơn hàng`,
          icon: scrollIcon,
        },
        {
          link: `${currentPath}/order/create`,
          label: `Thêm đơn hàng`,
          icon: plusIcon,
        },
        {
          link: `${currentPath}/shipping`,
          label: `Quản lý vận chuyển`,
          icon: truckIcon,
        },
        {
          link: `${currentPath}/return-exchange`,
          label: `Đổi đơn hàng`,
          icon: listRestartIcon,
        },
      ]
    },
  ];

  // Menu cho người dùng admin
  if (isAdmin) {
    navbarItems = [
      ...navbarItems,
      {
        label: `Quản lý đặt hàng`,
        icon: scrollIcon,
        isExpanded: expandedGroups['orderForm'],
        onClick: () => toggleGroup('orderForm'),
        children: [
          {
            link: `${currentPath}/order-form`,
            label: `Danh sách phiếu đặt hàng`,
            icon: scrollIcon,
          },
          {
            link: `${currentPath}/order-form/create`,
            label: `Thêm phiếu đặt hàng`,
            icon: plusIcon,
          },
          // {
          //   link: `${currentPath}/return-exchange`,
          //   label: `Đổi đơn hàng`,
          //   icon: listRestartIcon,
          // },
        ]
      },
      {
        label: `Quản lý nhập kho`,
        icon: warehouseIcon,
        isExpanded: expandedGroups['warehouseReceipt'],
        onClick: () => toggleGroup('warehouseReceipt'),
        children: [
          {
            link: `${currentPath}/warehouse-receipt`,
            label: `Danh sách phiếu nhập kho`,
            icon: warehouseIcon,
          },
          {
            link: `${currentPath}/warehouse-receipt/create`,
            label: `Thêm phiếu nhập kho`,
            icon: truckIcon,
          },
        ]
      },
      {
        label: `Quản lý danh mục`,
        icon: boxesIcon,
        isExpanded: expandedGroups['warehouse'],
        onClick: () => toggleGroup('warehouse'),
        children: [
          {
            link: `${currentPath}/account`,
            label: `Tài khoản`,
            icon: circleUserRoundIcon,
          },
          {
            link: `${currentPath}/user`,
            label: `Nhân viên`,
            icon: userIcon,
          },
          {
            link: `${currentPath}/business`,
            label: `Nhà cung cấp`,
            icon: factoryIcon,
          },
          {
            link: `${currentPath}/unit`,
            label: `Đơn vị tính`,
            icon: circleSmallIcon,
          },
          {
            link: `${currentPath}/category`,
            label: `Loại sản phẩm`,
            icon: toyBrickIcon,
          },
          {
            link: `${currentPath}/product`,
            label: `Sản phẩm`,
            icon: boxIcon,
          },
          {
            link: `${currentPath}/customer`,
            label: `Khách hàng`,
            icon: userIcon,
          },
        ]
      },
    ];
  }

  // Thêm các mục luôn hiển thị cho mọi người dùng
  navbarItems = [
    ...navbarItems,
    {
      label: `Báo cáo thống kê`,
      icon: chartBarIcon,
      isExpanded: expandedGroups['report'],
      onClick: () => toggleGroup('report'),
      children: [
        {
          link: `${currentPath}/product-detail`,
          label: `Báo cáo tồn kho`,
          icon: boxesIcon,
        },
        {
          link: `${currentPath}/report-date`,
          label: `Báo cáo hạn sử dụng`,
          icon: newspaperIcon,
        },
        {
          link: `${currentPath}/stock-history`,
          label: `Lịch sử nhập/xuất kho`,
          icon: truckIcon,
        },
        {
          link: `${currentPath}/price-history`,
          label: `Lịch sử cập nhật giá`,
          icon: chartBarIcon,
        },
        {
          link: `${currentPath}/report`,
          label: `Thống kê doanh thu`,
          icon: dollarSignIcon,
        },
      ]
    },
    {
      label: `Cài đặt`,
      icon: settingIcon,
      isExpanded: expandedGroups['settings'],
      onClick: () => toggleGroup('settings'),
      children: [
        {
          link: `${currentPath}/personal-info`,
          label: `Thông tin cá nhân`,
          icon: circleUserRoundIcon,
        },

      ]
    },
    {
      label: `Đăng xuất`,
      icon: logOutIcon,
      onClick: () => {
        // Nếu có API logout thì gọi ở đây, tạm thời chuyển hướng về trang chủ
        window.location.href = '/';
      },
    },
  ];

  const pageStyle: CSSProperties = {
    gridTemplateColumns: `${isExpand
      ? `max-content`
      : `calc(24px + 16px * 2 + 8px * 2)`
      } auto`,
  }

  return (
    <div className={`h-lvh grid`} style={pageStyle}>
      <nav className={`h-lvh overflow-y-scroll flex flex-col gap-4 no-scrollbar p-4 ${styles.nav}`}>
        {navbarItems.map((navbarItem: CNavbarItem, index: number) => (
          <NavbarItem
            navbarItem={navbarItem}
            key={index}
            isExpand={isExpand}
            setIsExpand={setIsExpand}
          >
          </NavbarItem>
        ))}
      </nav>

      <main className={`h-lvh p-4 tab-color flex flex-col gap-4 ${styles.main}`}>
        {children}
      </main>
    </div>
  );
}
