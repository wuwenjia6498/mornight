import React, { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Heart, Brain, BookOpen, Package } from 'lucide-react';
import JSZip from 'jszip';
import { toast } from 'sonner';

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

interface MainContentProps {
  generatedContents?: ApiResponse[];
  isGenerating?: boolean;
  selectedContent?: ApiResponse | null;
  onContentSelect?: (content: ApiResponse) => void;
  selectedImages?: { [date: string]: string }; // 用户选择的图片ID映射
}

type CopyType = 'emotional' | 'cognitive' | 'practical';

export default function MainContent({ 
  generatedContents = [], 
  isGenerating = false,
  selectedContent = null,
  onContentSelect,
  selectedImages = {}
}: MainContentProps) {
  
  // 每个卡片的文案类型状态
  const [cardCopyTypes, setCardCopyTypes] = useState<{ [date: string]: CopyType }>({});

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'yyyy年MM月dd日');
  };

  const getContextDescription = (context: ApiResponse['context']) => {
    let description = `${context.season} · ${context.weekday}`;
    if (context.solarTerm) {
      description += ` · ${context.solarTerm}`;
    }
    if (context.festival) {
      description += ` · ${context.festival}`;
    }
    return description;
  };

  const handleCardClick = (content: ApiResponse) => {
    if (onContentSelect) {
      onContentSelect(content);
    }
  };

  const isSelected = (content: ApiResponse) => {
    return selectedContent?.date === content.date;
  };

  // 切换卡片显示的文案类型
  const handleCopyTypeChange = (date: string, type: CopyType) => {
    setCardCopyTypes(prev => ({
      ...prev,
      [date]: type
    }));
  };

  // 获取当前卡片显示的文案类型
  const getCurrentCopyType = (date: string): CopyType => {
    return cardCopyTypes[date] || 'emotional';
  };

  // 获取当前显示的文案内容和样式
  const getCurrentCopyContent = (item: ApiResponse) => {
    const currentType = getCurrentCopyType(item.date);
    switch (currentType) {
      case 'emotional':
        return {
          content: item.content.emotional_copy,
          title: '情感共鸣型文案',
          icon: Heart,
          bgColor: 'bg-pink-50',
          borderColor: 'border-pink-200',
          textColor: 'text-pink-800',
          iconColor: 'text-pink-600'
        };
      case 'cognitive':
        return {
          content: item.content.cognitive_copy,
          title: '认知提升型文案',
          icon: Brain,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600'
        };
      case 'practical':
        return {
          content: item.content.practical_copy,
          title: '实用指导型文案',
          icon: BookOpen,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-600'
        };
    }
  };

  // 批量导出功能
  const handleBatchExport = async () => {
    if (generatedContents.length === 0) {
      toast.error('没有可导出的内容');
      return;
    }

    toast.info('开始准备导出文件...');
    
    try {
      const zip = new JSZip();
      
      for (const item of generatedContents) {
        const dateFolder = format(new Date(item.date), 'yyyy-MM-dd');
        const folder = zip.folder(dateFolder);
        
        if (!folder) continue;

        // 创建内容文本文件
        const contentText = `日期：${formatDate(item.date)}
上下文：${getContextDescription(item.context)}

=== 情感共鸣型文案 ===
${item.content.emotional_copy}

=== 认知提升型文案 ===
${item.content.cognitive_copy}

=== 实用指导型文案 ===
${item.content.practical_copy}

=== 图片搜索关键词 ===
${item.content.keywords_for_image_search.join(', ')}`;

        folder.file('content.txt', contentText);

        // 下载并添加图片（选择第一张作为默认，或用户选择的图片）
        if (item.image_options && item.image_options.length > 0) {
          try {
            // 选择图片：用户选择的 > 第一张
            const selectedImageId = selectedImages[item.date];
            const targetImage = selectedImageId 
              ? item.image_options.find(img => img.id === selectedImageId)
              : item.image_options[0];

            if (targetImage) {
              toast.info(`正在下载 ${dateFolder} 的配图...`);
              
              const imageResponse = await fetch(targetImage.url);
              if (imageResponse.ok) {
                const imageBlob = await imageResponse.blob();
                const imageExtension = targetImage.url.includes('.png') ? 'png' : 'jpg';
                folder.file(`image.${imageExtension}`, imageBlob);
              }
            }
          } catch (imageError) {
            console.warn(`图片下载失败 (${dateFolder}):`, imageError);
            // 继续处理其他文件，不中断整个流程
          }
        }
      }

      toast.info('正在生成压缩文件...');
      
      // 生成zip文件
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AI阅读内容_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.zip`;
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`成功导出 ${generatedContents.length} 项内容！`);
      
    } catch (error) {
      console.error('批量导出失败:', error);
      toast.error('导出失败，请重试');
    }
  };

  // 如果正在生成且没有内容，显示加载状态
  if (isGenerating && generatedContents.length === 0) {
    return (
      <div className="flex-1 bg-white p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">正在生成内容</h3>
          <p className="text-gray-600">AI正在为您精心创作儿童阅读教育文案和匹配图片...</p>
        </div>
      </div>
    );
  }

  // 如果没有生成的内容，显示默认状态
  if (generatedContents.length === 0) {
    return (
      <div className="flex-1 bg-white p-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">开始创作吧！</h3>
          <p className="text-gray-600 mb-4">
            选择您想要生成内容的日期，AI将为您创作专业的儿童阅读教育文案，并匹配相应的插图。
          </p>
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
            <div className="font-medium mb-2">✨ 功能特色</div>
            <ul className="text-left space-y-1">
              <li>• 情感共鸣型文案</li>
              <li>• 认知提升型文案</li>
              <li>• 实用指导型文案</li>
              <li>• 智能图片匹配</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            生成的内容 
            <span className="text-base text-gray-500 font-normal ml-2">
              ({generatedContents.length} 个日期)
            </span>
          </h2>
          <div className="flex items-center gap-3">
            {isGenerating && (
              <div className="flex items-center text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">生成中...</span>
              </div>
            )}
            {/* 批量导出按钮 */}
            {generatedContents.length > 0 && (
              <Button
                onClick={handleBatchExport}
                disabled={isGenerating}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                批量导出
              </Button>
            )}
          </div>
        </div>
        <p className="text-gray-600 mt-1 text-sm">点击卡片查看详细内容和配图选项</p>
      </div>

      {/* 内容列表 */}
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-4 space-y-3">
          {generatedContents.map((item, index) => {
            const copyInfo = getCurrentCopyContent(item);
            const IconComponent = copyInfo.icon;
            
            return (
              <Card 
                key={index} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isSelected(item) 
                    ? 'border-2 border-blue-500 ring-1 ring-blue-200 shadow-md' 
                    : 'border border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleCardClick(item)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-gray-900 mb-1">
                        {formatDate(item.date)}
                      </CardTitle>
                      <div className="text-xs text-gray-600">
                        {getContextDescription(item.context)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelected(item) && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded-full">
                          已选中
                        </span>
                      )}
                      <span className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full">
                        已生成
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* 文案类型切换按钮 */}
                  <div className="flex gap-1 mb-3">
                    <Button
                      variant={getCurrentCopyType(item.date) === 'emotional' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyTypeChange(item.date, 'emotional');
                      }}
                    >
                      <Heart className="w-3 h-3 mr-1" />
                      情感
                    </Button>
                    <Button
                      variant={getCurrentCopyType(item.date) === 'cognitive' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyTypeChange(item.date, 'cognitive');
                      }}
                    >
                      <Brain className="w-3 h-3 mr-1" />
                      认知
                    </Button>
                    <Button
                      variant={getCurrentCopyType(item.date) === 'practical' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyTypeChange(item.date, 'practical');
                      }}
                    >
                      <BookOpen className="w-3 h-3 mr-1" />
                      实用
                    </Button>
                  </div>

                  {/* 当前选中的文案预览 */}
                  <div className={`${copyInfo.bgColor} rounded-lg p-3 ${copyInfo.borderColor} border`}>
                    <div className="flex items-center gap-2 mb-2">
                      <IconComponent className={`w-4 h-4 ${copyInfo.iconColor}`} />
                      <h4 className={`font-medium ${copyInfo.textColor} text-sm`}>{copyInfo.title}</h4>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
                      {copyInfo.content}
                    </p>
                    {copyInfo.content.length > 120 && (
                      <p className={`${copyInfo.iconColor} text-xs mt-2`}>点击查看完整内容...</p>
                    )}
                  </div>

                  {/* 图片数量提示 */}
                  {item.image_options && item.image_options.length > 0 && (
                    <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                      <span>包含 {item.image_options.length} 张配图选项</span>
                      <span className="text-blue-600">→ 点击查看详情</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
} 