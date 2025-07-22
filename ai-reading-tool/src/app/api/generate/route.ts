import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@supabase/supabase-js';

// 二十四节气数据
const SOLAR_TERMS: Record<string, string> = {
  '01-06': '小寒',
  '01-20': '大寒',
  '02-04': '立春',
  '02-19': '雨水',
  '03-06': '惊蛰',
  '03-21': '春分',
  '04-05': '清明',
  '04-20': '谷雨',
  '05-06': '立夏',
  '05-21': '小满',
  '06-06': '芒种',
  '06-21': '夏至',
  '07-07': '小暑',
  '07-23': '大暑',
  '08-08': '立秋',
  '08-23': '处暑',
  '09-08': '白露',
  '09-23': '秋分',
  '10-08': '寒露',
  '10-23': '霜降',
  '11-07': '立冬',
  '11-22': '小雪',
  '12-07': '大雪',
  '12-22': '冬至'
};

// 重要节日数据
const FESTIVALS: Record<string, string> = {
  '01-01': '元旦',
  '02-14': '情人节',
  '03-08': '妇女节',
  '03-12': '植树节',
  '04-01': '愚人节',
  '04-05': '清明节',
  '05-01': '劳动节',
  '05-04': '青年节',
  '06-01': '儿童节',
  '07-01': '建党节',
  '08-01': '建军节',
  '09-10': '教师节',
  '10-01': '国庆节',
  '12-24': '平安夜',
  '12-25': '圣诞节'
};

// 农历节日（简化处理，实际应用中需要农历转换库）
const LUNAR_FESTIVALS: Record<string, string> = {
  '春节': '农历正月初一',
  '元宵节': '农历正月十五',
  '端午节': '农历五月初五',
  '七夕节': '农历七月初七',
  '中秋节': '农历八月十五',
  '重阳节': '农历九月初九'
};

interface DateContext {
  season: string;
  solarTerm?: string;
  festival?: string;
  month: number;
  day: number;
  weekday: string;
}

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
  context: DateContext;
  content: GeneratedContent;
  image_options: ImageOption[];
}

// 初始化客户端
let pinecone: Pinecone | null = null;
let supabase: any = null;

function initializeClients() {
  try {
    // 初始化 Pinecone
    if (process.env.PINECONE_API_KEY && !pinecone) {
      pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });
    }

    // 初始化 Supabase
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && !supabase) {
      supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
    }
  } catch (error) {
    console.error('客户端初始化失败:', error);
  }
}

// 模拟的文本编码函数（实际应用中需要调用CLIP模型或其他文本编码服务）
async function getTextEmbedding(text: string): Promise<number[]> {
  // TODO: 在实际应用中，这里应该调用真实的文本编码服务
  // 例如：OpenAI的text-embedding-ada-002、或者本地部署的CLIP模型
  
  // 模拟返回一个1536维的向量（与text-embedding-ada-002兼容）
  const dimension = 1536;
  const embedding = new Array(dimension).fill(0).map(() => Math.random() * 2 - 1);
  
  // 添加一些基于文本内容的简单特征（模拟真实embedding的相关性）
  const keywords = text.toLowerCase();
  if (keywords.includes('春') || keywords.includes('spring')) {
    embedding[0] += 0.5;
  }
  if (keywords.includes('夏') || keywords.includes('summer')) {
    embedding[1] += 0.5;
  }
  if (keywords.includes('秋') || keywords.includes('autumn')) {
    embedding[2] += 0.5;
  }
  if (keywords.includes('冬') || keywords.includes('winter')) {
    embedding[3] += 0.5;
  }
  if (keywords.includes('亲子') || keywords.includes('family')) {
    embedding[4] += 0.5;
  }
  if (keywords.includes('阅读') || keywords.includes('reading')) {
    embedding[5] += 0.5;
  }
  
  console.log(`生成文本嵌入向量: "${text.substring(0, 50)}..." -> ${dimension}维向量`);
  return embedding;
}

// 构建图片搜索描述
function buildImageSearchDescription(keywords: string[], context: DateContext): string {
  const season = context.season;
  const timeContext = context.festival || context.solarTerm || '';
  
  // 基于关键词和上下文构建描述性句子
  const descriptions = [
    `在${season}的美好时光里，${timeContext ? timeContext + '期间，' : ''}孩子和家长一起进行亲子阅读活动`,
    `${season}背景下的温馨家庭阅读场景，${keywords.join('、')}的氛围`,
    `${season}季节中，体现${keywords.slice(0, 3).join('、')}主题的儿童教育插画`,
    `展现${keywords.join('和')}元素的${season}亲子互动场景`
  ];
  
  // 随机选择一个描述模板，或根据关键词智能选择
  const selectedDescription = descriptions[0]; // 简化处理，选择第一个
  
  console.log(`构建图片搜索描述: ${selectedDescription}`);
  return selectedDescription;
}

// 查询相似图片
async function searchSimilarImages(searchText: string, topK: number = 5): Promise<ImageOption[]> {
  try {
    if (!pinecone || !supabase) {
      console.log('Pinecone或Supabase未配置，返回默认图片');
      return getDefaultImages();
    }

    // 1. 获取文本嵌入向量
    const embedding = await getTextEmbedding(searchText);
    
    // 2. 查询Pinecone
    const indexName = process.env.PINECONE_INDEX_NAME || 'illustrations';
    const index = pinecone.index(indexName);
    
    const queryResponse = await index.query({
      vector: embedding,
      topK: topK,
      includeMetadata: true,
    });
    
    console.log(`Pinecone查询结果: 找到${queryResponse.matches?.length || 0}个匹配项`);
    
    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return getDefaultImages();
    }
    
    // 3. 提取图片ID
    const imageIds = queryResponse.matches.map(match => match.id);
    
    // 4. 查询Supabase获取图片详情
    const { data: images, error } = await supabase
      .from('illustrations')
      .select('id, url, title, description')
      .in('id', imageIds)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase查询错误:', error);
      return getDefaultImages();
    }
    
    console.log(`Supabase查询结果: 获取到${images?.length || 0}张图片`);
    
    // 5. 按照Pinecone返回的相似度顺序排序
    const sortedImages: ImageOption[] = imageIds
      .map(id => images?.find((img: any) => img.id === id))
      .filter(Boolean)
      .map((img: any) => ({
        id: img.id,
        url: img.url,
        title: img.title,
        description: img.description,
      }));
    
    return sortedImages.length > 0 ? sortedImages : getDefaultImages();
    
  } catch (error) {
    console.error('图片搜索失败:', error);
    return getDefaultImages();
  }
}

// 获取默认图片（当搜索失败时使用）
function getDefaultImages(): ImageOption[] {
  return [
    {
      id: 'default_1',
      url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop&crop=center',
      title: '温馨亲子阅读',
      description: '家长和孩子一起阅读的温馨场景'
    },
    {
      id: 'default_2', 
      url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop&crop=center',
      title: '儿童图书馆',
      description: '充满童趣的图书馆环境'
    },
    {
      id: 'default_3',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center',
      title: '儿童阅读角落',
      description: '舒适的儿童阅读空间'
    },
    {
      id: 'default_4',
      url: 'https://images.unsplash.com/photo-1516414447565-b14be0adf13e?w=400&h=300&fit=crop&crop=center',
      title: '绘本故事时间',
      description: '生动的绘本故事阅读场景'
    },
    {
      id: 'default_5',
      url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=300&fit=crop&crop=center',
      title: '教育启蒙',
      description: '早期教育和学习的美好时光'
    }
  ];
}

// 获取日期背景信息
function getDateContext(dateString: string): DateContext {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const monthDay = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  
  // 确定季节
  let season = '';
  if (month >= 3 && month <= 5) {
    season = '春季';
  } else if (month >= 6 && month <= 8) {
    season = '夏季';
  } else if (month >= 9 && month <= 11) {
    season = '秋季';
  } else {
    season = '冬季';
  }

  // 获取星期
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekday = weekdays[date.getDay()];

  // 查找节气
  const solarTerm = SOLAR_TERMS[monthDay];

  // 查找节日
  const festival = FESTIVALS[monthDay];

  return {
    season,
    solarTerm,
    festival,
    month,
    day,
    weekday
  };
}

// 构建系统提示词
function buildSystemPrompt(context: DateContext): string {
  let contextDescription = `当前是${context.season}，${context.month}月${context.day}日，${context.weekday}`;
  
  if (context.solarTerm) {
    contextDescription += `，正值${context.solarTerm}节气`;
  }
  
  if (context.festival) {
    contextDescription += `，今天是${context.festival}`;
  }

  return `你是一位专业的儿童阅读教育专家和文案创作师。${contextDescription}。

请基于这个时间背景，为儿童阅读教育创作三种不同类型的文案：

1. **情感共鸣型文案 (emotional_copy)**: 
   - 重点激发孩子和家长的情感共鸣
   - 结合季节氛围和节日情感
   - 温暖、亲切、有感染力
   - 字数约100-150字

2. **认知提升型文案 (cognitive_copy)**:
   - 重点提升孩子的认知能力和知识面
   - 融入季节特点、自然现象、科学知识
   - 启发思考、增长见识
   - 字数约100-150字

3. **实用指导型文案 (practical_copy)**:
   - 重点为家长提供具体的阅读指导建议
   - 推荐适合当前时间的阅读活动和书籍类型
   - 实用、可操作、有指导价值
   - 字数约100-150字

4. **图片搜索关键词 (keywords_for_image_search)**:
   - 提炼3-5个核心关键词
   - 用于后续图片搜索
   - 应包含：亲子阅读 + 季节元素 + 情感词汇

请严格按照以下JSON格式返回，不要包含任何其他文字：

{
  "emotional_copy": "具体的情感共鸣型文案内容...",
  "cognitive_copy": "具体的认知提升型文案内容...",
  "practical_copy": "具体的实用指导型文案内容...",
  "keywords_for_image_search": ["亲子阅读", "季节相关词", "情感词汇", "教育相关词"]
}`;
}

export async function POST(request: NextRequest) {
  try {
    // 初始化客户端
    initializeClients();
    
    // 解析请求体
    const body = await request.json();
    const { dates } = body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { error: '请提供有效的日期数组' },
        { status: 400 }
      );
    }

    // 检查 Gemini API 密钥
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Gemini API密钥未配置，将使用默认文案');
    }

    const results: ApiResponse[] = [];

    // 为每个日期生成内容
    for (const dateString of dates) {
      // 获取日期背景信息
      const context = getDateContext(dateString);
      let content: GeneratedContent;
      
      try {
        if (apiKey) {
          try {
            // 初始化 Gemini AI
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            // 构建提示词
            const prompt = buildSystemPrompt(context);
            
            // 调用 Gemini API
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // 解析 JSON 响应
            try {
              // 清理响应文本，移除可能的 markdown 代码块标记
              const cleanedText = text.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
              content = JSON.parse(cleanedText);
            } catch (parseError) {
              console.error('JSON解析错误:', parseError);
              console.error('原始响应:', text);
              throw parseError;
            }
          } catch (apiError) {
            console.error(`Gemini API调用失败 (${dateString}):`, apiError);
            throw apiError;
          }
        } else {
          throw new Error('API密钥未配置');
        }
        
        // 如果到这里，说明成功获取了AI生成的内容
        console.log(`成功生成AI文案: ${dateString}`);
        
      } catch (error) {
        console.error(`处理日期 ${dateString} 时出错:`, error);
        
        // 提供默认内容
        content = {
          emotional_copy: `在这个美好的${context.season}里，让我们和孩子一起享受阅读的温暖时光。每一次翻页都是一次心灵的对话，每一个故事都是一份珍贵的陪伴。`,
          cognitive_copy: `${context.season}是培养孩子观察力和思考力的绝佳时机。通过阅读相关主题的书籍，可以帮助孩子了解自然变化，培养科学思维。`,
          practical_copy: `建议选择与${context.season}相关的绘本和科普读物，创造温馨的阅读环境，每天安排20-30分钟的亲子阅读时间。`,
          keywords_for_image_search: ['亲子阅读', context.season, '温馨', '教育']
        };
      }

      // 搜索匹配的图片
      try {
        const searchDescription = buildImageSearchDescription(content.keywords_for_image_search, context);
        const imageOptions = await searchSimilarImages(searchDescription, 5);
        
        results.push({
          date: dateString,
          context,
          content,
          image_options: imageOptions
        });
        
        console.log(`完成日期 ${dateString} 的处理: 文案 + ${imageOptions.length}张图片`);
        
      } catch (imageError) {
        console.error(`图片搜索失败 (${dateString}):`, imageError);
        
        // 即使图片搜索失败，也返回默认图片
        results.push({
          date: dateString,
          context,
          content,
          image_options: getDefaultImages()
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
} 