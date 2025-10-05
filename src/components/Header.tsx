"use client"

import React from 'react';
import Image from 'next/image';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImagePlus } from 'lucide-react';

export type TabType = 'morning' | 'toddler' | 'primary' | 'quote';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 左侧标题 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 relative flex items-center justify-center">
            <Image 
              src="/logo-1.jpg" 
              alt="Logo" 
              width={40} 
              height={40}
              className="object-contain rounded-lg"
              priority
            />
          </div>
          <h1 className="text-xl font-bold text-gray-900">儿童阅读文案生成控制台</h1>
        </div>

        {/* 中间导航栏 */}
        <div className="flex-1 flex justify-center">
          <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as TabType)}>
            <TabsList className="grid w-full max-w-5xl grid-cols-4 h-14 bg-gray-100 p-1.5 gap-2">
              <TabsTrigger 
                value="morning" 
                className="text-base font-medium px-20 h-full rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
              >
                早安语
              </TabsTrigger>
              <TabsTrigger 
                value="toddler" 
                className="text-base font-medium px-20 h-full rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
              >
                幼儿段
              </TabsTrigger>
              <TabsTrigger 
                value="primary" 
                className="text-base font-medium px-20 h-full rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
              >
                小学段
              </TabsTrigger>
              <TabsTrigger 
                value="quote" 
                className="text-base font-medium px-20 h-full rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
              >
                名人名言
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 右上角外链 */}
        <div className="flex items-center mr-12">
          <a
            href="https://image.skyline666.top/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-blue-500 to-brand-blue-600 text-white rounded-lg hover:from-brand-blue-600 hover:to-brand-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <ImagePlus className="w-5 h-5" />
            <span className="font-medium text-sm">去配图</span>
          </a>
        </div>

      </div>
    </header>
  );
}