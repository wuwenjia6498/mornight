"use client"

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sunrise, BookOpen, School, Loader2, Sparkles } from 'lucide-react';

export type QuoteType = 'morning' | 'toddler' | 'primary';

interface QuoteSelectorProps {
  selectedType: QuoteType | null;
  onTypeSelect: (type: QuoteType) => void;
  count: number;
  onCountChange: (count: number) => void;
  onGenerateContent: () => void;
  isGenerating: boolean;
  error: string | null;
}

export default function QuoteSelector({
  selectedType,
  onTypeSelect,
  count,
  onCountChange,
  onGenerateContent,
  isGenerating,
  error
}: QuoteSelectorProps) {

  const quoteTypes = [
    {
      type: 'morning' as QuoteType,
      icon: Sunrise,
      title: '早安语场景',
      color: 'text-brand-blue-700',
      bgColor: 'bg-brand-blue-50',
      borderColor: 'border-brand-blue-200',
      hoverColor: 'hover:border-brand-blue-400',
      description: '适合早晨问候的温暖名人名言，结合时节与阅读主题'
    },
    {
      type: 'toddler' as QuoteType,
      icon: BookOpen,
      title: '幼儿段场景',
      color: 'text-brand-blue-700',
      bgColor: 'bg-brand-blue-50',
      borderColor: 'border-brand-blue-200',
      hoverColor: 'hover:border-brand-blue-400',
      description: '适合0-6岁儿童的温馨教育名言，强调陪伴与启蒙'
    },
    {
      type: 'primary' as QuoteType,
      icon: School,
      title: '小学段场景',
      color: 'text-brand-blue-700',
      bgColor: 'bg-brand-blue-50',
      borderColor: 'border-brand-blue-200',
      hoverColor: 'hover:border-brand-blue-400',
      description: '适合小学生的励志名言，关注阅读能力与学习成长'
    }
  ];

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-6 flex flex-col gap-6">
      {/* 场景选择 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">选择应用场景</h3>
        {quoteTypes.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedType === item.type;
          
          return (
            <Card
              key={item.type}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? `${item.bgColor} ${item.borderColor} border-2 shadow-md`
                  : `border-gray-200 hover:border-gray-300 hover:shadow-sm`
              }`}
              onClick={() => onTypeSelect(item.type)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className={`${isSelected ? item.bgColor : 'bg-gray-100'} p-1.5 rounded-lg`}>
                    <Icon className={`w-4 h-4 ${isSelected ? item.color : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold text-sm mb-0.5 ${isSelected ? item.color : 'text-gray-700'}`}>
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 生成配置 */}
      {selectedType && (
        <div className="mt-4">
          <label className="text-sm text-gray-700 mb-2 block">
            生成数量: <span className="font-semibold text-brand-blue-600">{count}</span> 条
          </label>
          <input
            type="range"
            min="3"
            max="10"
            value={count}
            onChange={(e) => onCountChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>3条</span>
            <span>10条</span>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 生成按钮 */}
      <Button
        onClick={onGenerateContent}
        disabled={!selectedType || isGenerating}
        className="w-full bg-gradient-to-r from-brand-blue-500 to-brand-blue-600 hover:from-brand-blue-600 hover:to-brand-blue-700 text-white font-medium py-6 text-base shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            生成中...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            开始生成名人名言
          </>
        )}
      </Button>
    </div>
  );
}
