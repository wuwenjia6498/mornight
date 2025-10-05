import React, { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Package, Copy, Check, BookOpen, School, Sunrise, RefreshCw, Sparkles } from 'lucide-react';
import JSZip from 'jszip';

export type ColumnType = 'morning' | 'toddler' | 'primary';
export type DisplayMode = 'morning' | 'toddler' | 'primary' | 'quote';

interface GeneratedContent {
  morning_copies: string[];
  toddler_copies: string[];
  primary_copies: string[];
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
}

// 幼儿段/小学段内容结构
interface SegmentContent {
  copies: string[];
  quote_index: number;
}

interface SegmentApiResponse {
  type: 'toddler' | 'primary' | 'quote';
  content: SegmentContent;
  quoteType?: 'morning' | 'toddler' | 'primary';  // 名人名言的场景类型
}

interface MainContentProps {
  generatedContents?: ApiResponse[];
  isGenerating?: boolean;
  regeneratingState?: { date: string; column: ColumnType } | null;
  onRegenerateColumn?: (date: string, column: ColumnType) => void;
  selectedContent?: ApiResponse | null;
  onContentSelect?: (content: ApiResponse) => void;
  mode?: DisplayMode;
  segmentContent?: SegmentApiResponse | null;
  onRegenerateSegment?: () => void;  // 重新生成幼儿段/小学段的回调
}

export default function MainContent({ 
  generatedContents = [], 
  isGenerating = false,
  regeneratingState = null,
  onRegenerateColumn,
  selectedContent = null,
  onContentSelect,
  mode = 'morning',
  segmentContent = null,
  onRegenerateSegment
}: MainContentProps) {
  
  // 复制状态管理
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

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


  // 复制文案功能
  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };


  // 批量导出功能
  const handleBatchExport = async () => {
    if (generatedContents.length === 0) {
      console.error('没有可导出的内容');
      return;
    }

    console.info('开始准备导出文件...');
    
    try {
      const zip = new JSZip();
      
      for (const item of generatedContents) {
        const dateFolder = format(new Date(item.date), 'yyyy-MM-dd');
        const folder = zip.folder(dateFolder);
        
        if (!folder) continue;

        // 创建内容文本文件
        const contentText = `日期：${formatDate(item.date)}
上下文：${getContextDescription(item.context)}

==============================
  早安语
==============================

${item.content.morning_copies.map((copy, i) => `${i + 1}. ${copy}`).join('\n\n')}

==============================
  幼儿段 (0-6岁)
==============================

${item.content.toddler_copies.map((copy, i) => `${i + 1}. ${copy}`).join('\n\n')}

==============================
  小学段
==============================

${item.content.primary_copies.map((copy, i) => `${i + 1}. ${copy}`).join('\n\n')}
`;

        folder.file('content.txt', contentText);
      }

      console.info('正在生成压缩文件...');
      
      // 生成zip文件
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AI文案内容_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.zip`;
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`成功导出 ${generatedContents.length} 项内容！`);
      
    } catch (error) {
      console.error('批量导出失败:', error);
    }
  };

  // 渲染幼儿段/小学段内容
  const renderSegmentContent = () => {
    if (isGenerating) {
      return (
        <div className="flex-1 bg-white p-4 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-brand-blue-500 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">正在生成内容</h3>
            <p className="text-gray-600">AI正在为您创作{mode === 'toddler' ? '幼儿段' : '小学段'}阅读教育文案...</p>
          </div>
        </div>
      );
    }

    if (!segmentContent) {
      const config = {
        toddler: {
          icon: BookOpen,
          title: '幼儿段文案生成',
          subtitle: '0-6岁儿童阅读指导',
          description: '选择生成条数，以懂教育的妈妈朋友口吻，为你创作温暖、专业且富有洞见的亲子绘本阅读干货文案。'
        },
        primary: {
          icon: School,
          title: '小学段文案生成',
          subtitle: '小学生阅读能力提升',
          description: '选择生成条数；将以"精辟引入+落地建议"的结构，为提升小学生阅读能力提供专业、精炼且实用的方法策略。'
        },
        quote: {
          icon: Sparkles,
          title: '名人名言生成',
          subtitle: '智慧启迪与价值传递',
          description: '选择应用场景（早安语/幼儿段/小学段），生成适合不同场景的名人名言内容。'
        }
      };

      const currentConfig = config[mode as 'toddler' | 'primary' | 'quote'];
      const Icon = currentConfig.icon;

      return (
        <div className="flex-1 bg-white p-4 flex items-center justify-center">
          <div className="text-center max-w-md">
            <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">{currentConfig.title}</h3>
            <p className="text-lg text-gray-600 mb-4 leading-relaxed">{currentConfig.description}</p>
          </div>
        </div>
      );
    }

    // 显示生成的幼儿段/小学段/名人名言内容
    const { copies, quote_index } = segmentContent.content;
    const config = mode === 'toddler' ? 
      { title: '幼儿段阅读指导', icon: BookOpen, color: 'rose', description: '以妈妈朋友口吻，创作温暖、专业且富有洞见的亲子绘本阅读文案' } : 
      mode === 'primary' ?
      { title: '小学段阅读指导', icon: School, color: 'sky', description: '以"精辟引入+落地建议"结构，提供专业精炼的阅读能力提升策略' } :
      { title: '名人名言精选', icon: Sparkles, color: 'purple', description: '精选适合不同场景的名人名言，传递智慧与价值' };
    const Icon = config.icon;

    return (
      <div className="flex-1 bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Icon className={mode === 'toddler' ? 'w-6 h-6 text-brand-blue-600' : 'w-6 h-6 text-brand-blue-600'} />
                {config.title}
              </h2>
          <p className="text-gray-600 mt-1 text-sm">
            {config.description}
          </p>
            </div>
            {onRegenerateSegment && (
              <div className="flex items-center gap-3">
                {isGenerating && (
                  <div className="flex items-center text-brand-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm">生成中...</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRegenerateSegment}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  重新生成
                </Button>
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-6">
            {/* 使用和早安语一致的布局 */}
            <div className="bg-brand-blue-50 rounded-lg p-4 border border-brand-blue-200">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-blue-100 p-2 rounded-full">
                    <Icon className="w-5 h-5 text-brand-blue-600" />
                  </div>
                  <h4 className="font-bold text-brand-blue-700 text-lg">
                    {mode === 'toddler' ? '幼儿段' : mode === 'primary' ? '小学段' : '名人名言'}
                  </h4>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {copies.map((copy, index) => {
                  // 确定每条内容的标题
                  let itemTitle = '';
                  if (mode === 'quote') {
                    // 名人名言模式：根据场景类型显示标题
                    const sceneNames = {
                      morning: '早安语场景',
                      toddler: '幼儿段场景',
                      primary: '小学段场景'
                    };
                    itemTitle = segmentContent.quoteType ? sceneNames[segmentContent.quoteType] : '名人名言';
                  } else {
                    // 幼儿段/小学段：所有内容都是专业指导（不再包含名人名言）
                    itemTitle = `专业指导 #${index + 1}`;
                  }
                  
                  return (
                    <div key={index} className="bg-white p-4 rounded-md shadow-sm border border-brand-blue-100 relative group">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base font-semibold text-brand-blue-700">{itemTitle}</span>
                      </div>
                      <p className="text-gray-800 leading-relaxed whitespace-pre-line text-base mb-3">{copy}</p>
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleCopyText(copy, `${mode}-${index}`)}
                        >
                          {copiedStates[`${mode}-${index}`] ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  };

  // 如果是幼儿段、小学段或名人名言模式，使用专门的渲染函数
  if (mode === 'toddler' || mode === 'primary' || mode === 'quote') {
    return renderSegmentContent();
  }

  // 以下是早安语模式的渲染逻辑
  // 如果正在生成且没有内容，显示加载状态
  if (isGenerating && generatedContents.length === 0) {
    return (
      <div className="flex-1 bg-white p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-blue-500 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">正在生成内容</h3>
          <p className="text-gray-600">AI正在为您创作早安语内容...</p>
        </div>
      </div>
    );
  }

  // 如果没有生成的内容，显示默认状态
  if (generatedContents.length === 0) {
    return (
      <div className="flex-1 bg-white p-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Sunrise className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">开始创作早安语！</h3>
          <p className="text-lg text-gray-600 mb-4 leading-relaxed">
            为每个选定日期创作<span className="text-brand-blue-600 font-semibold">5条</span>结合时节情境的早安文案。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sunrise className="w-6 h-6 text-brand-blue-600" />
            早安语
            <span className="text-base text-gray-500 font-normal ml-2">
              ({generatedContents.length} 条内容)
            </span>
          </h2>
          <div className="flex items-center gap-3">
            {isGenerating && (
              <div className="flex items-center text-brand-blue-600">
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
        <p className="text-gray-600 mt-1 text-sm">结合时节情境，为每个选定日期创作富有哲思的早安文案</p>
      </div>

      {/* 内容列表 */}
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-4">
            {generatedContents.map((item, index) => {

              return (
                <Card
                  key={index}
                  className="transition-all duration-200 hover:shadow-md border border-gray-200 hover:border-gray-300"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-900 mb-1">
                          {formatDate(item.date)}
                        </CardTitle>
                        <div className="text-sm text-gray-600">
                          {getContextDescription(item.context)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">

                    {/* 早安语内容显示 */}
                    <div className="bg-brand-blue-50 rounded-lg p-4 border border-brand-blue-200">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-brand-blue-100 p-2 rounded-full">
                            <Sunrise className="w-5 h-5 text-brand-blue-600" />
                          </div>
                          <h4 className="font-bold text-brand-blue-700 text-lg">早安语</h4>
                        </div>
                        {onRegenerateColumn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-brand-blue-600 hover:text-brand-blue-700 hover:bg-brand-blue-100"
                            onClick={() => onRegenerateColumn(item.date, 'morning')}
                            disabled={!!regeneratingState}
                          >
                            {regeneratingState?.date === item.date && regeneratingState?.column === 'morning' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {item.content.morning_copies.map((copy, i) => (
                          <div key={i} className="bg-white p-4 rounded-md shadow-sm border border-brand-blue-100 relative group">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-base font-semibold text-brand-blue-700">早安语 #{i + 1}</span>
                            </div>
                            <p className="text-gray-800 leading-relaxed whitespace-pre-line text-base mb-3">{copy}</p>
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleCopyText(copy, `${item.date}-morning-${i}`)}
                              >
                                {copiedStates[`${item.date}-morning-${i}`] ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </ScrollArea>

    </div>
  );
} 