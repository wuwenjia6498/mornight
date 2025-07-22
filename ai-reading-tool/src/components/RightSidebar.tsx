import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Brain, BookOpen, Image as ImageIcon, Check, Calendar, Copy, Download } from 'lucide-react';
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

interface RightSidebarProps {
  selectedContent?: ApiResponse | null;
  selectedImageId?: string;
  onImageSelect?: (date: string, imageId: string | null) => void;
}

export default function RightSidebar({ 
  selectedContent, 
  selectedImageId, 
  onImageSelect 
}: RightSidebarProps) {
  const [localSelectedImageId, setLocalSelectedImageId] = useState<string | null>(null);

  // 同步外部传入的selectedImageId
  useEffect(() => {
    setLocalSelectedImageId(selectedImageId || null);
  }, [selectedImageId]);

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

  const handleImageSelect = (imageId: string) => {
    const newImageId = localSelectedImageId === imageId ? null : imageId;
    setLocalSelectedImageId(newImageId);
    
    // 通知父组件
    if (onImageSelect && selectedContent) {
      onImageSelect(selectedContent.date, newImageId);
    }
  };

  const handleConfirmSelection = () => {
    if (localSelectedImageId && selectedContent) {
      const selectedImage = selectedContent.image_options.find(img => img.id === localSelectedImageId);
      console.log('用户选择的配图:', selectedImage);
      toast.success('配图选择已确认！');
    }
  };

  // 复制文案到剪贴板
  const handleCopyText = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type}文案已复制到剪贴板！`);
    } catch (err) {
      console.error('复制失败:', err);
      toast.error('复制失败，请手动选择文本复制');
    }
  };

  // 下载图片
  const handleDownloadImage = async (imageUrl: string, imageName: string) => {
    try {
      toast.info('开始下载图片...');
      
      // 获取图片数据
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('图片下载失败');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // 创建下载链接
      const link = document.createElement('a');
      link.href = url;
      link.download = `${imageName}.jpg`;
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('图片下载成功！');
    } catch (err) {
      console.error('下载失败:', err);
      toast.error('图片下载失败，请重试');
    }
  };

  // 如果没有选中的内容，显示提示信息
  if (!selectedContent) {
    return (
      <div className="w-80 bg-gray-50 border-l border-gray-200 p-6 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">请选择内容</h3>
          <p className="text-gray-600 text-sm">
            请在左侧选择一项内容查看详情
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col h-full">
      {/* 标题区域 */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">内容详情</h2>
        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-900">
            {formatDate(selectedContent.date)}
          </div>
          <div className="text-xs text-gray-600">
            {getContextDescription(selectedContent.context)}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            {/* 文案内容Tabs */}
            <Tabs defaultValue="emotional" className="mb-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="emotional" className="text-xs">
                  <Heart className="w-3 h-3 mr-1" />
                  情感共鸣
                </TabsTrigger>
                <TabsTrigger value="cognitive" className="text-xs">
                  <Brain className="w-3 h-3 mr-1" />
                  认知提升
                </TabsTrigger>
                <TabsTrigger value="practical" className="text-xs">
                  <BookOpen className="w-3 h-3 mr-1" />
                  实用指导
                </TabsTrigger>
              </TabsList>

              <TabsContent value="emotional" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-600" />
                        <h4 className="font-medium text-pink-800 text-sm">情感共鸣型文案</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleCopyText(selectedContent.content.emotional_copy, '情感共鸣型')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {selectedContent.content.emotional_copy}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cognitive" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-blue-600" />
                        <h4 className="font-medium text-blue-800 text-sm">认知提升型文案</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleCopyText(selectedContent.content.cognitive_copy, '认知提升型')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {selectedContent.content.cognitive_copy}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="practical" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-green-600" />
                        <h4 className="font-medium text-green-800 text-sm">实用指导型文案</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleCopyText(selectedContent.content.practical_copy, '实用指导型')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {selectedContent.content.practical_copy}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* 配图选择区域 */}
            {selectedContent.image_options && selectedContent.image_options.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  <h4 className="font-medium text-gray-900 text-sm">选择配图</h4>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {selectedContent.image_options.length} 张可选
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {selectedContent.image_options.slice(0, 6).map((image) => (
                    <div
                      key={image.id}
                      className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        localSelectedImageId === image.id
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleImageSelect(image.id)}
                    >
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        <img
                          src={image.url}
                          alt={image.title || '配图'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="flex items-center justify-center h-full text-gray-400">
                                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                </div>
                              `;
                            }
                          }}
                        />
                      </div>

                      {/* 选中状态指示器 */}
                      {localSelectedImageId === image.id && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-blue-500 text-white rounded-full p-1">
                            <Check className="w-3 h-3" />
                          </div>
                        </div>
                      )}

                      {/* 悬停效果 */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200" />

                      {/* 图片信息 */}
                      {image.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                          <div className="text-xs font-medium truncate">
                            {image.title}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 显示更多图片按钮 */}
                {selectedContent.image_options.length > 6 && (
                  <div className="text-center mb-4">
                    <Button variant="outline" size="sm" className="text-xs">
                      查看更多图片 ({selectedContent.image_options.length - 6} 张)
                    </Button>
                  </div>
                )}

                {/* 确认选择和下载按钮 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setLocalSelectedImageId(null);
                      if (onImageSelect && selectedContent) {
                        onImageSelect(selectedContent.date, null);
                      }
                    }}
                    disabled={!localSelectedImageId}
                  >
                    取消选择
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={handleConfirmSelection}
                    disabled={!localSelectedImageId}
                  >
                    确认选择
                  </Button>
                </div>

                {/* 下载按钮 - 只在选中图片时显示 */}
                {localSelectedImageId && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        const selectedImage = selectedContent.image_options.find(img => img.id === localSelectedImageId);
                        if (selectedImage) {
                          const imageName = `${formatDate(selectedContent.date)}_${selectedImage.title || '配图'}`;
                          handleDownloadImage(selectedImage.url, imageName);
                        }
                      }}
                    >
                      <Download className="w-3 h-3 mr-2" />
                      下载高清图片
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 搜索关键词 */}
            {selectedContent.content.keywords_for_image_search && 
             selectedContent.content.keywords_for_image_search.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4">
                <h4 className="font-medium text-gray-900 text-sm mb-3">图片搜索关键词</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedContent.content.keywords_for_image_search.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-yellow-50 text-yellow-800 border border-yellow-200 rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
} 