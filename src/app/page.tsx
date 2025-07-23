"use client"

import { useState } from 'react';
import Header from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import MainContent from '@/components/MainContent';
import RightSidebar from '@/components/RightSidebar';

interface GeneratedContent {
  emotional_copy: string;
  cognitive_copy: string;
  practical_copy: string;
  keywords_for_image_search: string[];
}

interface ImageOption {
  id: string;
  url: string;
  title?: string;
  description?: string;
}

interface ApiResponse {
  date: string;
  context: {
    season: string;
    solarTerm?: string;
    festival?: string;
    month: number;
    day: number;
    weekday: string;
  };
  content: GeneratedContent;
  image_options: ImageOption[];
}

export default function Home() {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [generatedContents, setGeneratedContents] = useState<ApiResponse[]>([]);
  const [selectedContent, setSelectedContent] = useState<ApiResponse | null>(null);
  const [selectedImages, setSelectedImages] = useState<{ [date: string]: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDatesChange = (dates: Date[]) => {
    setSelectedDates(dates);
  };

  const handleContentSelect = (content: ApiResponse) => {
    setSelectedContent(content);
  };

  // 处理图片选择
  const handleImageSelect = (date: string, imageId: string | null) => {
    setSelectedImages(prev => {
      const newSelection = { ...prev };
      if (imageId === null) {
        delete newSelection[date];
      } else {
        newSelection[date] = imageId;
      }
      return newSelection;
    });
  };

  const handleGenerateContent = async () => {
    if (selectedDates.length === 0) return;

    setIsGenerating(true);
    setError(null);
    // 清空之前选中的内容
    setSelectedContent(null);
    setSelectedImages({});

    try {
      // 修复时区问题：使用本地时间格式化日期
      const dateStrings = selectedDates.map(date => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });

      console.log('前端选择的原始Date对象:', selectedDates);
      console.log('转换后的日期字符串:', dateStrings);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dates: dateStrings
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成内容失败');
      }

      const result = await response.json();
      
      if (result.success) {
        setGeneratedContents(result.data);
        console.log('API返回的生成内容:', result.data);
        // 如果只有一个内容，自动选中它
        if (result.data.length === 1) {
          setSelectedContent(result.data[0]);
        }
      } else {
        throw new Error('API返回错误');
      }

    } catch (err) {
      console.error('生成内容时出错:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 页头 */}
      <Header />
      
      {/* 主要工作区 - 三栏布局 */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* 左侧栏 */}
        <LeftSidebar 
          selectedDates={selectedDates}
          onDatesChange={handleDatesChange}
          onGenerateContent={handleGenerateContent}
          isGenerating={isGenerating}
          error={error}
        />
        
        {/* 中间主内容区 */}
        <MainContent 
          generatedContents={generatedContents}
          isGenerating={isGenerating}
          selectedContent={selectedContent}
          onContentSelect={handleContentSelect}
          selectedImages={selectedImages}
        />
        
        {/* 右侧栏 */}
        <RightSidebar 
          selectedContent={selectedContent}
          selectedImageId={selectedContent ? selectedImages[selectedContent.date] : undefined}
          onImageSelect={handleImageSelect}
        />
      </div>
    </div>
  );
}
