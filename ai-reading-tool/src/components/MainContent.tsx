import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Heart, Download, Package } from 'lucide-react';
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

export default function MainContent({ 
  generatedContents = [], 
  isGenerating = false,
  selectedContent = null,
  onContentSelect,
  selectedImages = {}
}: MainContentProps) {
  
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
      <div className="flex-1 bg-white p-6 flex items-center justify-center">
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
      <div className="flex-1 bg-white p-6 flex items-center justify-center">
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
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            生成的内容 
            <span className="text-lg text-gray-500 font-normal ml-2">
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
        <p className="text-gray-600 mt-2">点击卡片查看详细内容和配图选项</p>
      </div>

      {/* 内容列表 */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-6 space-y-4">
          {generatedContents.map((item, index) => (
            <Card 
              key={index} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected(item) 
                  ? 'border-2 border-blue-500 ring-2 ring-blue-200 shadow-lg' 
                  : 'border border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleCardClick(item)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900 mb-2">
                      {formatDate(item.date)}
                    </CardTitle>
                    <div className="text-sm text-gray-600">
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
              
              <CardContent>
                {/* 情感共鸣型文案预览 */}
                <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-pink-600" />
                    <h4 className="font-medium text-pink-800 text-sm">情感共鸣型文案</h4>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
                    {item.content.emotional_copy}
                  </p>
                  {item.content.emotional_copy.length > 100 && (
                    <p className="text-pink-600 text-xs mt-2">点击查看完整内容...</p>
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
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 