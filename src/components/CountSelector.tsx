"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import HistoryPanel from '@/components/HistoryPanel';

export type ContentType = 'toddler' | 'primary';

interface CountSelectorProps {
  contentType: ContentType;
  selectedCount: number;
  onCountChange: (count: number) => void;
  onGenerateContent: () => void;
  isGenerating?: boolean;
  error?: string | null;
}

export default function CountSelector({
  contentType,
  selectedCount,
  onCountChange,
  onGenerateContent,
  isGenerating = false,
  error
}: CountSelectorProps) {

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-6 flex flex-col gap-6">
      {/* 生成配置 */}
      <div className="mt-4">
        <label className="text-sm text-gray-700 mb-2 block">
          生成数量: <span className="font-semibold text-brand-blue-600">{selectedCount}</span> 条
        </label>
        <input
          type="range"
          min="3"
          max="20"
          value={selectedCount}
          onChange={(e) => onCountChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>3条</span>
          <span>20条</span>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 生成按钮 */}
      <div className="space-y-3">
        <Button
          onClick={onGenerateContent}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-brand-blue-500 to-brand-blue-600 hover:from-brand-blue-600 hover:to-brand-blue-700 text-white font-medium py-6 text-base shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              开始生成{contentType === 'toddler' ? '幼儿段' : '小学段'}文案
            </>
          )}
        </Button>
        
        {/* 历史记录按钮 */}
        <div className="flex justify-center">
          <HistoryPanel mode={contentType} />
        </div>
      </div>
    </div>
  );
}
