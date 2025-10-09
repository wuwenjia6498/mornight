"use client"

import { useState, useEffect } from 'react';
import Header, { TabType } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import CountSelector, { ContentType } from '@/components/CountSelector';
import QuoteSelector, { QuoteType } from '@/components/QuoteSelector';
import MainContent, { ColumnType } from '@/components/MainContent';
import Footer from '@/components/Footer';
import {
  loadMorningContents,
  saveMorningContents,
  loadToddlerContent,
  saveToddlerContent,
  loadPrimaryContent,
  savePrimaryContent,
  loadQuoteMorningContent,
  saveQuoteMorningContent,
  loadQuoteToddlerContent,
  saveQuoteToddlerContent,
  loadQuotePrimaryContent,
  saveQuotePrimaryContent,
  HistoryItem,
} from '@/lib/storage';

// 早安语模式的接口定义
interface MorningContent {
  morning_copies: string[];
}

interface MorningApiResponse {
  date: string;
  context: {
    season: string;
    solarTerm?: string;
    festival?: string;
    month: number;
    day: number;
    weekday: string;
  };
  content: MorningContent;
}

// 幼儿段/小学段模式的接口定义
interface SegmentContent {
  copies: string[];
  quote_index: number; // 名人名言的索引位置
}

interface SegmentApiResponse {
  type: 'toddler' | 'primary' | 'quote';
  content: SegmentContent;
  quoteType?: 'morning' | 'toddler' | 'primary';  // 名人名言的场景类型
}

export default function Home() {
  // 导航状态
  const [activeTab, setActiveTab] = useState<TabType>('morning');

  // 早安语模式状态
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [morningContents, setMorningContents] = useState<MorningApiResponse[]>([]);
  const [selectedMorningContent, setSelectedMorningContent] = useState<MorningApiResponse | null>(null);

  // 幼儿段/小学段模式状态
  const [toddlerCount, setToddlerCount] = useState(10);
  const [primaryCount, setPrimaryCount] = useState(10);
  const [toddlerContent, setToddlerContent] = useState<SegmentApiResponse | null>(null);
  const [primaryContent, setPrimaryContent] = useState<SegmentApiResponse | null>(null);

  // 名人名言模式状态
  const [quoteType, setQuoteType] = useState<QuoteType | null>(null);
  const [quoteCount, setQuoteCount] = useState(5);
  // 为每个场景分别保存内容
  const [quoteMorningContent, setQuoteMorningContent] = useState<SegmentApiResponse | null>(null);
  const [quoteToddlerContent, setQuoteToddlerContent] = useState<SegmentApiResponse | null>(null);
  const [quotePrimaryContent, setQuotePrimaryContent] = useState<SegmentApiResponse | null>(null);

  // 通用状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingState, setRegeneratingState] = useState<{ date: string; column: ColumnType } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 页面加载时恢复数据
  useEffect(() => {
    // 恢复早安语内容
    const savedMorningContents = loadMorningContents();
    if (savedMorningContents.length > 0) {
      setMorningContents(savedMorningContents);
      // 如果只有一条，自动选中
      if (savedMorningContents.length === 1) {
        setSelectedMorningContent(savedMorningContents[0]);
      }
    }

    // 恢复幼儿段内容
    const savedToddlerContent = loadToddlerContent();
    if (savedToddlerContent) {
      setToddlerContent(savedToddlerContent);
    }

    // 恢复小学段内容
    const savedPrimaryContent = loadPrimaryContent();
    if (savedPrimaryContent) {
      setPrimaryContent(savedPrimaryContent);
    }

    // 恢复名人名言内容
    const savedQuoteMorning = loadQuoteMorningContent();
    if (savedQuoteMorning) {
      setQuoteMorningContent(savedQuoteMorning);
    }

    const savedQuoteToddler = loadQuoteToddlerContent();
    if (savedQuoteToddler) {
      setQuoteToddlerContent(savedQuoteToddler);
    }

    const savedQuotePrimary = loadQuotePrimaryContent();
    if (savedQuotePrimary) {
      setQuotePrimaryContent(savedQuotePrimary);
    }
  }, []);

  // 自动保存早安语内容
  useEffect(() => {
    if (morningContents.length > 0) {
      saveMorningContents(morningContents);
    }
  }, [morningContents]);

  // 自动保存幼儿段内容
  useEffect(() => {
    if (toddlerContent) {
      saveToddlerContent(toddlerContent);
    }
  }, [toddlerContent]);

  // 自动保存小学段内容
  useEffect(() => {
    if (primaryContent) {
      savePrimaryContent(primaryContent);
    }
  }, [primaryContent]);

  // 自动保存名人名言内容
  useEffect(() => {
    if (quoteMorningContent) {
      saveQuoteMorningContent(quoteMorningContent);
    }
  }, [quoteMorningContent]);

  useEffect(() => {
    if (quoteToddlerContent) {
      saveQuoteToddlerContent(quoteToddlerContent);
    }
  }, [quoteToddlerContent]);

  useEffect(() => {
    if (quotePrimaryContent) {
      saveQuotePrimaryContent(quotePrimaryContent);
    }
  }, [quotePrimaryContent]);

  // 处理导航切换
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setError(null); // 切换时清除错误信息
  };

  // 早安语模式：处理日期选择
  const handleDatesChange = (dates: Date[]) => {
    setSelectedDates(dates);
  };

  // 早安语模式：处理内容选择
  const handleMorningContentSelect = (content: MorningApiResponse) => {
    setSelectedMorningContent(content);
  };

  // 早安语模式：生成内容
  const handleGenerateMorningContent = async () => {
    if (selectedDates.length === 0) return;

    setIsGenerating(true);
    setError(null);
    setSelectedMorningContent(null);

    try {
      const dateStrings = selectedDates.map(date => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'morning',
          dates: dateStrings
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成早安语失败');
      }

      const result = await response.json();
      
      if (result.success) {
        setMorningContents(result.results);
        if (result.results && result.results.length === 1) {
          setSelectedMorningContent(result.results[0]);
        }
      } else {
        throw new Error('API返回错误');
      }

    } catch (err) {
      console.error('生成早安语时出错:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsGenerating(false);
    }
  };

  // 幼儿段/小学段模式：生成内容
  const handleGenerateSegmentContent = async (type: ContentType) => {
    const count = type === 'toddler' ? toddlerCount : primaryCount;
    
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: type,
          count: count
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `生成${type === 'toddler' ? '幼儿段' : '小学段'}内容失败`);
      }

      const result = await response.json();
      
      if (result.success) {
        if (type === 'toddler') {
          setToddlerContent(result.content);
        } else {
          setPrimaryContent(result.content);
        }
      } else {
        throw new Error('API返回错误');
      }

    } catch (err) {
      console.error(`生成${type}内容时出错:`, err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsGenerating(false);
    }
  };

  // 重新生成当前段落内容（幼儿段或小学段）
  const handleRegenerateSegment = async () => {
    if (activeTab !== 'toddler' && activeTab !== 'primary') return;
    
    await handleGenerateSegmentContent(activeTab as ContentType);
  };

  // 名人名言模式：生成内容
  const handleGenerateQuoteContent = async () => {
    if (!quoteType) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'quote',
          quoteType: quoteType,
          count: quoteCount
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成名人名言失败');
      }

      const result = await response.json();
      
      if (result.success) {
        // 将场景类型信息也保存到内容中
        const contentWithType = {
          ...result.content,
          quoteType: quoteType  // 保存当前选择的场景类型
        };
        
        // 根据不同场景保存到不同的状态
        if (quoteType === 'morning') {
          setQuoteMorningContent(contentWithType);
        } else if (quoteType === 'toddler') {
          setQuoteToddlerContent(contentWithType);
        } else if (quoteType === 'primary') {
          setQuotePrimaryContent(contentWithType);
        }
      } else {
        throw new Error('API返回错误');
      }

    } catch (err) {
      console.error('生成名人名言时出错:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsGenerating(false);
    }
  };

  // 重新生成名人名言
  const handleRegenerateQuote = async () => {
    if (activeTab !== 'quote') return;
    
    await handleGenerateQuoteContent();
  };

  // 从历史记录恢复内容
  const handleRestoreFromHistory = (item: HistoryItem) => {
    if (item.type === 'morning' && Array.isArray(item.data)) {
      // 恢复早安语内容
      setMorningContents(item.data);
      if (item.data.length === 1) {
        setSelectedMorningContent(item.data[0]);
      } else {
        setSelectedMorningContent(null);
      }
      // 切换到早安语模式
      setActiveTab('morning');
    } else if (item.type === 'toddler' && item.data?.content) {
      // 恢复幼儿段内容
      setToddlerContent(item.data);
      // 切换到幼儿段模式
      setActiveTab('toddler');
    } else if (item.type === 'primary' && item.data?.content) {
      // 恢复小学段内容
      setPrimaryContent(item.data);
      // 切换到小学段模式
      setActiveTab('primary');
    } else if (item.type === 'quote' && item.data?.content) {
      // 恢复名人名言内容
      const quoteData = item.data;
      if (quoteData.quoteType === 'morning') {
        setQuoteMorningContent(quoteData);
        setQuoteType('morning');
      } else if (quoteData.quoteType === 'toddler') {
        setQuoteToddlerContent(quoteData);
        setQuoteType('toddler');
      } else if (quoteData.quoteType === 'primary') {
        setQuotePrimaryContent(quoteData);
        setQuoteType('primary');
      }
      // 切换到名人名言模式
      setActiveTab('quote');
    }
  };

  // 早安语模式：重新生成某列
  const handleRegenerateColumn = async (date: string, column: ColumnType) => {
    setRegeneratingState({ date, column });
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'morning',
          dates: [date],
          regenerate_column: column
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `重新生成失败`);
      }
      
      const result = await response.json();

      if (result.success) {
        setMorningContents(prevContents => 
          prevContents.map(item => {
            if (item.date === result.date) {
              const updatedContent = {
                ...item.content,
                [`${result.column}_copies`]: result.copies
              };
              return { ...item, content: updatedContent };
            }
            return item;
          })
        );
      } else {
        throw new Error('API返回错误');
      }

    } catch (err) {
      console.error('重新生成内容时出错:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setRegeneratingState(null);
    }
  };

  // 渲染左侧栏
  const renderLeftSidebar = () => {
    if (activeTab === 'morning') {
      return (
        <LeftSidebar 
          selectedDates={selectedDates}
          onDatesChange={handleDatesChange}
          onGenerateContent={handleGenerateMorningContent}
          isGenerating={isGenerating}
          error={error}
        />
      );
    } else if (activeTab === 'quote') {
      return (
        <QuoteSelector
          selectedType={quoteType}
          onTypeSelect={setQuoteType}
          count={quoteCount}
          onCountChange={setQuoteCount}
          onGenerateContent={handleGenerateQuoteContent}
          isGenerating={isGenerating}
          error={error}
        />
      );
    } else {
      return (
        <CountSelector
          contentType={activeTab as ContentType}
          selectedCount={activeTab === 'toddler' ? toddlerCount : primaryCount}
          onCountChange={(count) => {
            if (activeTab === 'toddler') {
              setToddlerCount(count);
            } else {
              setPrimaryCount(count);
            }
          }}
          onGenerateContent={() => handleGenerateSegmentContent(activeTab as ContentType)}
          isGenerating={isGenerating}
          error={error}
        />
      );
    }
  };


  // 渲染主内容区
  const renderMainContent = () => {
    if (activeTab === 'morning') {
      // 转换数据格式以兼容原有的MainContent组件
      const legacyContents = morningContents.map(item => ({
        date: item.date,
        context: item.context,
        content: {
          morning_copies: item.content.morning_copies,
          toddler_copies: [],
          primary_copies: []
        }
      }));

      return (
        <MainContent 
          generatedContents={legacyContents}
          isGenerating={isGenerating}
          regeneratingState={regeneratingState}
          onRegenerateColumn={handleRegenerateColumn}
          selectedContent={selectedMorningContent ? {
            date: selectedMorningContent.date,
            context: selectedMorningContent.context,
            content: {
              morning_copies: selectedMorningContent.content.morning_copies,
              toddler_copies: [],
              primary_copies: []
            }
          } : null}
          onContentSelect={(content) => {
            const morningItem = morningContents.find(item => item.date === content.date);
            if (morningItem) {
              handleMorningContentSelect(morningItem);
            }
          }}
          mode="morning"
        />
      );
    } else if (activeTab === 'quote') {
      // 名人名言模式 - 根据选择的场景显示对应的内容
      const currentQuoteContent = quoteType === 'morning' ? quoteMorningContent :
                                  quoteType === 'toddler' ? quoteToddlerContent :
                                  quoteType === 'primary' ? quotePrimaryContent : null;
      
      return (
        <MainContent 
          generatedContents={[]}
          isGenerating={isGenerating}
          segmentContent={currentQuoteContent}
          mode="quote"
          onRegenerateSegment={handleRegenerateQuote}
        />
      );
    } else {
      // 幼儿段和小学段的专门显示组件
      const currentContent = activeTab === 'toddler' ? toddlerContent : primaryContent;
      
      return (
        <MainContent 
          generatedContents={[]}
          isGenerating={isGenerating}
          segmentContent={currentContent}
          mode={activeTab}
          onRegenerateSegment={handleRegenerateSegment}
        />
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 页头 */}
      <Header 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
      />
      
      {/* 主要工作区 - 两栏布局 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧栏 */}
        {renderLeftSidebar()}
        
        {/* 主内容区 */}
        {renderMainContent()}
      </div>

      {/* 页脚 */}
      <Footer />
    </div>
  );
}
