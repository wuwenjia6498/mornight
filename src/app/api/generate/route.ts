import { NextRequest, NextResponse } from 'next/server';

interface GenerateRequest {
  dates: string[];
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

// aihubmix平台的API配置
const AIHUBMIX_API_URL = process.env.AIHUBMIX_API_URL || 'https://api.aihubmix.com/v1/chat/completions';

// 获取日期上下文信息
function getDateContext(dateString: string) {
  console.log(`开始处理日期: ${dateString}`);
  
  // 完全避免Date对象的时区问题，直接解析字符串
  const dateParts = dateString.split('-');
  if (dateParts.length !== 3) {
    throw new Error(`无效的日期格式: ${dateString}`);
  }
  
  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]);
  const day = parseInt(dateParts[2]);
  
  console.log(`解析结果 - 年: ${year}, 月: ${month}, 日: ${day}`);
  
  // 验证日期有效性
  if (isNaN(year) || isNaN(month) || isNaN(day) || 
      month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`无效的日期值: ${dateString}`);
  }
  
  // 仅用于计算星期几，使用本地时间
  const dateForWeekday = new Date(year, month - 1, day);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[dateForWeekday.getDay()];
  
  console.log(`计算星期 - 使用日期对象: ${dateForWeekday.toLocaleDateString()}, 星期: ${weekday}`);

  // 简单的季节判断
  let season = '';
  if (month >= 3 && month <= 5) season = '春季';
  else if (month >= 6 && month <= 8) season = '夏季';
  else if (month >= 9 && month <= 11) season = '秋季';
  else season = '冬季';

  // 简单的节气判断
  let solarTerm;
  if (month === 1 && day >= 5 && day <= 7) solarTerm = '小寒';
  else if (month === 1 && day >= 20 && day <= 22) solarTerm = '大寒';
  else if (month === 2 && day >= 3 && day <= 5) solarTerm = '立春';
  else if (month === 3 && day >= 20 && day <= 22) solarTerm = '春分';
  else if (month === 6 && day >= 21 && day <= 22) solarTerm = '夏至';
  else if (month === 9 && day >= 22 && day <= 24) solarTerm = '秋分';
  else if (month === 12 && day >= 21 && day <= 23) solarTerm = '冬至';

  // 简单的节日判断
  let festival;
  if (month === 1 && day === 1) festival = '元旦';
  else if (month === 2 && day === 14) festival = '情人节';
  else if (month === 3 && day === 8) festival = '妇女节';
  else if (month === 5 && day === 1) festival = '劳动节';
  else if (month === 6 && day === 1) festival = '儿童节';
  else if (month === 10 && day === 1) festival = '国庆节';
  else if (month === 12 && day === 25) festival = '圣诞节';

  const result = {
    season,
    solarTerm,
    festival,
    month,
    day,
    weekday,
    // 添加格式化的日期字符串
    formattedDate: `${year}年${month}月${day}日`
  };
  
  console.log(`日期上下文结果:`, result);
  
  return result;
}

// 生成内容的提示词
function createPrompt(dateString: string, context: any) {
  const contextInfo = [];
  if (context.season) contextInfo.push(`季节：${context.season}`);
  if (context.solarTerm) contextInfo.push(`节气：${context.solarTerm}`);
  if (context.festival) contextInfo.push(`节日：${context.festival}`);
  
  // 使用格式化的日期和星期
  const displayDate = context.formattedDate || dateString;
  contextInfo.push(`日期：${displayDate} ${context.weekday}`);
  
  console.log(`生成提示词 - 使用日期: ${displayDate}, 上下文信息: ${contextInfo.join('，')}`);

  return `作为一名专业的儿童教育内容创作者，请为${displayDate}这一天创作儿童阅读教育文案。

背景信息：${contextInfo.join('，')}

请创作三种类型的文案，每种文案约100-150字：

1. 情感共鸣型文案：
- 用温暖、亲切的语言
- 激发孩子的阅读兴趣和情感连接
- 可以使用比喻、拟人等修辞手法
- 营造温馨的阅读氛围

2. 认知提升型文案：
- 强调阅读对认知能力的提升
- 包含教育价值和学习意义
- 用科学、理性的语言
- 突出阅读的益处

3. 实用指导型文案：
- 提供具体的阅读建议和方法
- 包含可操作的步骤
- 面向家长和教师
- 实用性强

4. 图片搜索关键词：
- 提供5-8个适合的图片搜索关键词
- 关键词要与儿童阅读、教育相关
- 考虑季节和节日元素

请严格按照以下JSON格式返回，不要包含任何其他文字：
{
  "emotional_copy": "情感共鸣型文案内容",
  "cognitive_copy": "认知提升型文案内容", 
  "practical_copy": "实用指导型文案内容",
  "keywords_for_image_search": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"]
}`;
}

// 调用aihubmix平台的Gemini API
async function callAihubmixGemini(prompt: string): Promise<GeneratedContent> {
  console.log('调用aihubmix API，URL:', AIHUBMIX_API_URL);
  console.log('使用模型: gemini-2.5-pro');
  
  const requestBody = {
    model: 'gemini-2.5-pro',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 3000, // 增加token限制
    stream: false // 确保不使用流式输出
  };

  console.log('请求体:', JSON.stringify(requestBody, null, 2));
  
  const response = await fetch(AIHUBMIX_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  console.log('API响应状态:', response.status);

  if (!response.ok) {
    const errorData = await response.text();
    console.error('aihubmix API调用失败:', response.status, errorData);
    throw new Error(`API调用失败: ${response.status} ${response.statusText} - ${errorData}`);
  }

  const data = await response.json();
  console.log('aihubmix API返回数据结构:', {
    hasChoices: !!data.choices,
    choicesLength: data.choices?.length,
    firstChoice: data.choices?.[0] ? 'exists' : 'missing'
  });

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('API返回数据格式错误:', data);
    throw new Error('API返回数据格式错误');
  }

  const content = data.choices[0].message.content;
  console.log('AI返回的原始内容长度:', content.length);
  console.log('AI返回的原始内容前200字符:', content.substring(0, 200));
  
  try {
    // 多种方式清理响应文本
    let cleanText = content;
    
    // 移除markdown代码块标记
    cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // 移除开头和结尾的空白字符
    cleanText = cleanText.trim();
    
    // 如果内容被截断，尝试修复JSON
    if (!cleanText.endsWith('}') && !cleanText.endsWith('}```')) {
      console.log('检测到JSON可能被截断，尝试修复...');
      
      // 尝试找到最后一个完整的字段
      const lastCompleteField = cleanText.lastIndexOf('",');
      if (lastCompleteField > 0) {
        cleanText = cleanText.substring(0, lastCompleteField + 1) + '\n  "keywords_for_image_search": ["儿童阅读", "亲子时光", "书本", "学习", "教育"]\n}';
        console.log('尝试修复后的JSON:', cleanText);
      }
    }
    
    console.log('清理后的内容:', cleanText);
    
    const parsed = JSON.parse(cleanText);
    console.log('JSON解析成功');
    
    // 验证必需字段
    if (!parsed.emotional_copy || !parsed.cognitive_copy || !parsed.practical_copy) {
      throw new Error('JSON缺少必需字段');
    }
    
    return parsed;
  } catch (parseError) {
    console.error('JSON解析失败，原始内容:', content);
    console.error('解析错误:', parseError);
    
    // 如果解析失败，尝试提取部分内容
    try {
      const partialContent = extractPartialContent(content);
      if (partialContent) {
        console.log('使用部分提取的内容');
        return partialContent;
      }
    } catch (extractError) {
      console.error('部分内容提取也失败:', extractError);
    }
    
    throw new Error('AI返回内容格式错误，无法解析JSON');
  }
}

// 尝试从不完整的响应中提取部分内容
function extractPartialContent(content: string): GeneratedContent | null {
  try {
    // 使用正则表达式提取各个字段
    const emotionalMatch = content.match(/"emotional_copy":\s*"([^"]*(?:\\.[^"]*)*)"/);
    const cognitiveMatch = content.match(/"cognitive_copy":\s*"([^"]*(?:\\.[^"]*)*)"/);
    const practicalMatch = content.match(/"practical_copy":\s*"([^"]*(?:\\.[^"]*)*)"/);
    
    if (emotionalMatch && cognitiveMatch && practicalMatch) {
      return {
        emotional_copy: emotionalMatch[1].replace(/\\"/g, '"'),
        cognitive_copy: cognitiveMatch[1].replace(/\\"/g, '"'),
        practical_copy: practicalMatch[1].replace(/\\"/g, '"'),
        keywords_for_image_search: ['儿童阅读', '亲子时光', '书本', '学习', '教育']
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// 生成示例图片选项
function generateImageOptions(keywords: string[]): ImageOption[] {
  const baseImages = [
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
    'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
    'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400',
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400'
  ];

  return baseImages.slice(0, 5).map((url, index) => ({
    id: `img_${Date.now()}_${index}`,
    url,
    title: `${keywords[index % keywords.length]}主题配图`,
    description: `适合${keywords[index % keywords.length]}的儿童阅读场景`
  }));
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { dates } = body;

    if (!dates || dates.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供至少一个日期' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API密钥未配置' },
        { status: 500 }
      );
    }

    const results: ApiResponse[] = [];

    for (const dateString of dates) {
      try {
        const context = getDateContext(dateString);
        const prompt = createPrompt(dateString, context);

        console.log(`正在为 ${dateString} 生成内容...`);
        
        // 调用aihubmix平台的Gemini API
        let content: GeneratedContent;
        try {
          content = await callAihubmixGemini(prompt);
        } catch (apiError) {
          console.error('API调用失败，使用默认内容:', apiError);
          // 如果API调用失败，使用默认内容
          content = {
            emotional_copy: `在这个特别的日子里，让我们一起翻开书页，感受知识的魅力。每一个故事都是一扇通往奇妙世界的门，每一次阅读都是一次心灵的旅行。亲爱的孩子们，准备好和我一起探索书中的精彩世界了吗？`,
            cognitive_copy: `阅读是提升认知能力的最佳方式之一。通过阅读，孩子们可以扩展词汇量、提高理解能力、培养批判性思维。研究表明，经常阅读的儿童在语言表达、逻辑推理和创造性思维方面都有显著优势。让我们把阅读变成孩子成长路上最重要的伙伴。`,
            practical_copy: `【今日阅读指导】1. 选择适合孩子年龄的读物；2. 创造安静舒适的阅读环境；3. 陪伴孩子阅读15-30分钟；4. 阅读后与孩子讨论故事内容；5. 鼓励孩子表达自己的想法和感受。记住，家长的陪伴和引导是培养阅读习惯的关键。`,
            keywords_for_image_search: ['儿童阅读', '亲子时光', '书本', '学习', '教育']
          };
        }

        // 生成图片选项
        const imageOptions = generateImageOptions(content.keywords_for_image_search);

        results.push({
          date: dateString,
          context,
          content,
          image_options: imageOptions
        });

        console.log(`${dateString} 内容生成完成`);

      } catch (dateError) {
        console.error(`处理日期 ${dateString} 时出错:`, dateError);
        // 继续处理其他日期，不中断整个流程
        continue;
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { success: false, error: '所有日期处理失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('API调用失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 