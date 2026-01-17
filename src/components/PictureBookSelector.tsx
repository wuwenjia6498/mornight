"use client"

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookHeart, Sparkles, BookMarked, Trees, Loader2 } from 'lucide-react';
import HistoryPanel from '@/components/HistoryPanel';

export type PictureBookCategory = 'minimalist' | 'childview' | 'philosophy' | 'nature';

interface PictureBookSelectorProps {
  selectedCategory: PictureBookCategory | null;
  onCategorySelect: (category: PictureBookCategory) => void;
  count: number;
  onCountChange: (count: number) => void;
  onGenerateContent: () => void;
  isGenerating: boolean;
  error: string | null;
}

export default function PictureBookSelector({
  selectedCategory,
  onCategorySelect,
  count,
  onCountChange,
  onGenerateContent,
  isGenerating,
  error
}: PictureBookSelectorProps) {

  const categories = [
    {
      type: 'minimalist' as PictureBookCategory,
      icon: Sparkles,
      title: '极简主义',
      color: 'text-brand-blue-700',
      bgColor: 'bg-brand-blue-50',
      borderColor: 'border-brand-blue-200',
      hoverColor: 'hover:border-brand-blue-400',
      description: '没有华丽的修辞和复杂的句式，短句为主，节奏舒缓，宁静治愈。'
    },
    {
      type: 'childview' as PictureBookCategory,
      icon: BookHeart,
      title: '儿童视角',
      color: 'text-brand-blue-700',
      bgColor: 'bg-brand-blue-50',
      borderColor: 'border-brand-blue-200',
      hoverColor: 'hover:border-brand-blue-400',
      description: '从儿童视角出发，切入点小，但指向的却是人生的大命题：孤独、满足、自信、追寻'
    },
    {
      type: 'philosophy' as PictureBookCategory,
      icon: BookMarked,
      title: '哲理留白',
      color: 'text-brand-blue-700',
      bgColor: 'bg-brand-blue-50',
      borderColor: 'border-brand-blue-200',
      hoverColor: 'hover:border-brand-blue-400',
      description: '通感与留白，文字不仅在描述动作，还在捕捉一种"空气感"，留下大量的空间让读者去想象画面'
    },
    {
      type: 'nature' as PictureBookCategory,
      icon: Trees,
      title: '自然隐喻',
      color: 'text-brand-blue-700',
      bgColor: 'bg-brand-blue-50',
      borderColor: 'border-brand-blue-200',
      hoverColor: 'hover:border-brand-blue-400',
      description: '通过描写自然（如风、山、光影）来隐喻人的内心世界或人生真理'
    }
  ];

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-6 flex flex-col gap-6">
      {/* 分类选择 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">选择语言风格</h3>
        {categories.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedCategory === item.type;

          return (
            <Card
              key={item.type}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? `${item.bgColor} ${item.borderColor} border-2 shadow-md`
                  : `border-gray-200 hover:border-gray-300 hover:shadow-sm`
              }`}
              onClick={() => onCategorySelect(item.type)}
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
      {selectedCategory && (
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
      <div className="space-y-3">
        <Button
          onClick={onGenerateContent}
          disabled={!selectedCategory || isGenerating}
          className="w-full bg-gradient-to-r from-brand-blue-500 to-brand-blue-600 hover:from-brand-blue-600 hover:to-brand-blue-700 text-white font-medium py-6 text-base shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <BookHeart className="w-5 h-5 mr-2" />
              开始生成绘本语言
            </>
          )}
        </Button>

        {/* 历史记录按钮 */}
        <div className="flex justify-center">
          <HistoryPanel mode="picturebook" />
        </div>
      </div>
    </div>
  );
}
