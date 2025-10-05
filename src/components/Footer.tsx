"use client"

import React from 'react';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-6">
      <div className="max-w-full mx-auto flex items-center justify-center relative min-h-[48px]">
            {/* 居中的版权信息 */}
            <div className="text-sm text-gray-600 font-medium text-center">
              © 2025 老约翰儿童阅读文案生成工具
            </div>
        
        {/* 右下角Logo - 确保不遮挡边框 */}
        <div className="absolute right-0 top-0 flex items-center h-full">
          <Image 
            src="/logo-0.jpg" 
            alt="Logo" 
            width={140} 
            height={40}
            className="object-contain"
            priority
          />
        </div>
      </div>
    </footer>
  );
}

