'use client'

import React, { Children, isValidElement, ReactElement, useEffect, useState } from 'react'
import TabItem, { ITabProps } from './components/tab-item/tab-item';
import { Button } from '..';

interface ITabsProps {
  activeTabIndex?: number
  children: ReactElement<ITabProps> | ReactElement<ITabProps>[]
}

export default function Tabs({
  activeTabIndex = 0,
  children,
}: Readonly<ITabsProps>): ReactElement {
  const [activeTab, setActiveTab] = useState<number>(activeTabIndex);

  useEffect((): () => void => {
    return (): void => {
      setActiveTab(0);
    }
  }, []);

  const handleTabClick = (tab: ReactElement<ITabProps>, index: number) => {
    if (!tab.props.isDisable)
      setActiveTab(index);
  }

  const tabs = Children.toArray(children).filter(
    (child): child is ReactElement<ITabProps> =>
      isValidElement(child) && child.type === TabItem
  );

  return (
    <div className="flex flex-col">
      <div className="relative mb-4">
        <ul className="flex flex-nowrap overflow-x-auto scrollbar-hide">
          {tabs.map((
            tab: ReactElement<ITabProps>, index: number
          ): ReactElement => (
            <li
              key={`tab-${index}`}
              className={`relative transition-all duration-300 ease-in-out`}
            >
              <Button
                onClick={(): void => handleTabClick(tab, index)}
                className={`relative whitespace-nowrap px-5 py-3 font-medium text-base transition-all duration-200 ${activeTab === index
                  ? 'text-blue-600'
                  : tab.props.isDisable
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-blue-500'
                  }`}
              >
                {tab.props.label}
                {activeTab === index && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform transition-transform duration-300 ease-out"></span>
                )}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="transition-all duration-300 ease-in-out min-h-[200px]">
        {tabs[activeTab]}
      </div>
    </div>
  )
}
