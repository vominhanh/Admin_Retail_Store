/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { CSSProperties, Dispatch, ReactElement, SetStateAction } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CNavbarItem } from '../../layout';
import { IconContainer, Text } from '@/components';
import styles from './style.module.css';
import chevronRightIcon from '@/public/chevron-right.svg?url';

// Định nghĩa kiểu dữ liệu chính xác cho NavbarItem
type NavItemLink = string | undefined | null;

interface INavbarItemProps {
  setIsLoading?: Dispatch<SetStateAction<boolean>>
  navbarItem: CNavbarItem,
  isExpand?: boolean,
  setIsExpand?: Dispatch<SetStateAction<boolean>>
}

export default function NavbarItem({
  setIsLoading,
  navbarItem,
  isExpand = true,
  setIsExpand,
}: Readonly<INavbarItemProps>): ReactElement {
  const pathname = usePathname();
  const navbarItemStyle: CSSProperties = {
    gridTemplateColumns: isExpand ? `24px auto 24px` : `24px`,
    alignItems: 'center',
  }

  const handleRedirect = (): void => {
    if (setIsLoading)
      setIsLoading(true);
  }

  const iconStyle: CSSProperties = {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  // Chuẩn hóa đường dẫn để so sánh
  function normalizePath(path: string | undefined) {
    if (!path) return '';
    return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  }

  const normalizedPathname = normalizePath(pathname || '');
  const normalizedNavLink = navbarItem.link ? normalizePath(String(navbarItem.link)) : '';
  const isActive = navbarItem.link && normalizedPathname === normalizedNavLink;

  const renderMenuItem = () => (
    <>
      <div style={iconStyle}>
        <IconContainer iconLink={navbarItem.icon as string} size={24} color="#222" />
      </div>
      {isExpand && (
        <Text weight={600} isEllipsis={true}>{navbarItem.label}</Text>
      )}
      {isExpand && navbarItem.children && (
        <div className={styles.chevronIcon}>
          <IconContainer
            iconLink={chevronRightIcon}
            size={20}
            color="#888"
            style={{
              transform: navbarItem.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </div>
      )}
    </>
  );

  const handleGroupClick = () => {
    if (navbarItem.onClick) navbarItem.onClick();
    if (!isExpand && setIsExpand) setIsExpand(true);
  }

  if (navbarItem.children) {
    return (
      <div className="flex flex-col">
        <div
          className={`
            p-2 grid gap-4 rounded-2xl transition-all select-none cursor-pointer
            ${navbarItem.isExpanded ? styles.expanded : ''} ${styles.navItem}
          `}
          style={navbarItemStyle}
          title={navbarItem.label}
          onClick={handleGroupClick}
        >
          {renderMenuItem()}
        </div>
        <div
          className={
            `${styles.collapseWrapper} ${navbarItem.isExpanded && isExpand ? styles.open : ''}`
          }
        >
          <div className={`ml-4 flex flex-col gap-2 ${styles.childrenContainer}`}>
            {navbarItem.isExpanded && isExpand && navbarItem.children.map((child, index) => (
              <NavbarItem
                key={index}
                navbarItem={child}
                setIsLoading={setIsLoading}
                isExpand={isExpand}
                setIsExpand={setIsExpand}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (navbarItem.link)
    return (
      <Link
        href={navbarItem.link}
        onClick={handleRedirect}
        className={`
          p-2 grid gap-4 rounded-2xl transition-all select-none ${styles.navItem} ${isActive ? styles.active : ''}
        `}
        style={navbarItemStyle}
        title={navbarItem.label}
      >
        {renderMenuItem()}
      </Link>
    );

  return (
    <div
      className={`
        p-2 grid gap-4 rounded-2xl transition-all select-none cursor-pointer ${styles.navItem}
      `}
      style={navbarItemStyle}
      title={navbarItem.label}
      onClick={navbarItem.onClick}
    >
      {renderMenuItem()}
    </div>
  );
}
