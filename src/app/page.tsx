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

// 临时测试数据
const testData: ApiResponse[] = [
  {
    date: "2024-01-15",
    context: {
      season: "冬季",
      solarTerm: "小寒",
      festival: undefined,
      month: 1,
      day: 15,
      weekday: "周一"
    },
    content: {
      emotional_copy: "在这个寒冷的冬日里，让我们一起翻开书页，感受知识的温暖。就像小熊在雪地里寻找蜂蜜一样，每一次阅读都是一次甜蜜的探险。孩子们，你们是否也想和小熊一起，在书的世界里找到属于自己的那份甜蜜呢？",
      cognitive_copy: "冬季是一个适合静心阅读的季节。通过阅读，我们可以提高专注力、扩展词汇量，并培养逻辑思维能力。研究表明，每天阅读30分钟可以显著提升儿童的语言理解能力和创造性思维。让我们利用这个冬天，为孩子们建立良好的阅读习惯。",
      practical_copy: "【今日阅读计划】1. 选择一本适合年龄的绘本或故事书；2. 为孩子创造安静舒适的阅读环境；3. 陪伴孩子阅读15-20分钟；4. 阅读后与孩子讨论故事内容；5. 鼓励孩子分享自己的感受。记住，父母的陪伴是最好的阅读动力！",
      keywords_for_image_search: ["儿童阅读", "冬季", "温暖", "小熊", "绘本", "亲子阅读"]
    },
    image_options: [
      {
        id: "img1",
        url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
        title: "温馨的儿童阅读时光",
        description: "孩子在温暖的环境中专心阅读"
      },
      {
        id: "img2", 
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
        title: "冬日阅读角落",
        description: "舒适的阅读空间"
      },
      {
        id: "img3",
        url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400",
        title: "亲子共读时光",
        description: "父母与孩子一起阅读"
      }
    ]
  },
  {
    date: "2024-01-16",
    context: {
      season: "冬季",
      solarTerm: "小寒",
      festival: undefined,
      month: 1,
      day: 16,
      weekday: "周二"
    },
    content: {
      emotional_copy: "今天的阳光透过窗户洒在书页上，就像是在为我们的阅读时光加上一层金色的魔法。每一个字都在阳光下跳舞，每一个故事都在等待着被发现。亲爱的小朋友们，准备好和我一起踏上今天的阅读冒险了吗？",
      cognitive_copy: "持续的阅读能够建立神经连接，提高大脑的信息处理能力。对于6-12岁的儿童来说，多样化的阅读材料有助于培养批判性思维和创造力。今天让我们尝试不同类型的读物，从科普故事到童话传说，让孩子的思维更加活跃。",
      practical_copy: "【阅读技巧分享】1. 鼓励孩子预测故事发展；2. 让孩子复述故事的主要情节；3. 引导孩子思考角色的动机；4. 与孩子讨论故事的寓意；5. 鼓励孩子画出最喜欢的场景。这些方法能够加深孩子对故事的理解和记忆。",
      keywords_for_image_search: ["阳光阅读", "儿童学习", "书本", "温暖阳光", "专注学习", "童话故事"]
    },
    image_options: [
      {
        id: "img4",
        url: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400",
        title: "阳光下的阅读",
        description: "明亮阳光下的学习环境"
      },
      {
        id: "img5",
        url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400",
        title: "专注的小读者",
        description: "孩子认真阅读的样子"
      }
    ]
  }
];

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

  // 加载测试数据
  const loadTestData = () => {
    setGeneratedContents(testData);
    setSelectedContent(null);
    setSelectedImages({});
    setError(null);
  };

  const handleGenerateContent = async () => {
    if (selectedDates.length === 0) return;

    setIsGenerating(true);
    setError(null);
    // 清空之前选中的内容
    setSelectedContent(null);
    setSelectedImages({});

    try {
      // 将Date对象转换为ISO字符串
      const dateStrings = selectedDates.map(date => date.toISOString().split('T')[0]);

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
        console.log('生成的内容:', result.data);
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
      
      {/* 临时测试按钮 */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
        <button 
          onClick={loadTestData}
          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm"
        >
          🧪 加载测试数据
        </button>
        <span className="ml-3 text-xs text-yellow-700">
          点击加载测试数据，体验优化后的布局和文案类型切换功能
        </span>
      </div>
      
      {/* 主要工作区 - 三栏布局 */}
      <div className="flex h-[calc(100vh-110px)]">
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
