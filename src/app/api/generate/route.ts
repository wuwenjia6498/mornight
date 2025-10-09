import { NextRequest, NextResponse } from 'next/server';
import solarlunar from 'solarlunar';

interface GenerateRequest {
  type: 'morning' | 'toddler' | 'primary' | 'quote';
  dates?: string[];
  count?: number;
  quoteType?: 'morning' | 'toddler' | 'primary';  // 名人名言的应用场景
  regenerate_column?: 'morning' | 'toddler' | 'primary';
}

interface GeneratedContent {
  morning_copies: string[];
  toddler_copies: string[];
  primary_copies: string[];
}

// 幼儿段/小学段生成内容结构
interface SegmentContent {
  copies: string[];
  quote_index: number; // 名人名言的索引位置
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

// aihubmixmix平台的API配置
const AIHUBMIX_API_URL = process.env.AIHUBMIX_API_URL || 'https://api.aihubmix.com/v1/chat/completions';

// 获取日期上下文信息
function getDateContext(dateString: string) {
  // 完全避免Date对象的时区问题，直接解析字符串
  const dateParts = dateString.split('-');
  if (dateParts.length !== 3) {
    throw new Error(`无效的日期格式: ${dateString}`);
  }
  
  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]);
  const day = parseInt(dateParts[2]);
  
  // 验证日期有效性
  if (isNaN(year) || isNaN(month) || isNaN(day) || 
      month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`无效的日期值: ${dateString}`);
  }
  
  // 仅用于计算星期几，使用本地时间
  const dateForWeekday = new Date(year, month - 1, day);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[dateForWeekday.getDay()];

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

  // 使用 solarlunar 库获取农历和传统节日
  let lunarData;
  try {
    lunarData = solarlunar.solar2lunar(year, month, day);
  } catch (lunarError) {
    console.error('solarlunar处理失败:', lunarError);
    // 如果农历转换失败，使用空数据继续
    lunarData = { lMonth: 0, lDay: 0, lunarFestival: '', term: '' };
  }
  let festival = '';

  // 优先判断公历节日
  if (month === 1 && day === 1) festival = '元旦';
  else if (month === 2 && day === 14) festival = '情人节';
  else if (month === 3 && day === 8) festival = '妇女节';
  else if (month === 5 && day === 1) festival = '劳动节';
  else if (month === 6 && day === 1) festival = '儿童节';
  else if (month === 10 && day === 1) festival = '国庆节';
  else if (month === 12 && day === 25) festival = '圣诞节';
  // 判断农历节日
  else if (lunarData.lMonth === 1 && lunarData.lDay === 1) festival = '春节';
  else if (lunarData.lMonth === 1 && lunarData.lDay === 15) festival = '元宵节';
  else if (lunarData.lMonth === 5 && lunarData.lDay === 5) festival = '端午节';
  else if (lunarData.lMonth === 7 && lunarData.lDay === 7) festival = '七夕节';
  else if (lunarData.lMonth === 8 && lunarData.lDay === 15) festival = '中秋节';
  else if (lunarData.lMonth === 9 && lunarData.lDay === 9) festival = '重阳节';
  else if (lunarData.lMonth === 12 && lunarData.lDay === 8) festival = '腊八节';
  // 如果没有找到节日，再检查solarlunar库返回的节日
  else if (lunarData.lunarFestival) {
    festival = lunarData.lunarFestival;
  }
  // 最后，检查是否是节气
  else if (lunarData.term) {
    solarTerm = lunarData.term;
  }
  
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
  
  return result;
}

// 共享的段落提示词生成函数
function createSegmentSectionPrompt(type: 'toddler' | 'primary', count: number) {
  const sections = {
    toddler: `
**## 幼儿段 (0-6岁)**
围绕"绘本阅读"和"亲子共读"，像一位懂教育、懂妈妈的朋友，娓娓道来，创作${count}段独立的干货文案。
**核心要求**:
- **深度价值**: 用生活化的比喻，点明绘本如何建构幼儿的心理秩序、情感模型和认知框架。
- **体系化建议**: 围绕某一绘本类型或阅读痛点，给出清晰、可落地的方法。
- **核心理念**: 聚焦于保护想象力、建立安全感、语言启蒙等幼儿阅读的本质问题。
**写作风格**: 温暖、专业且富有洞见，但要避免说教感，语言亲切、接地气。
**格式要求**: 排版采用一句一行的形式。
**字数限制**: 每段文案控制在 40-60 字之间。
`,
    primary: `
**## 小学段**
围绕"阅读习惯与能力提升"，提供亲切、实用的具体指导，创作${count}段独立的干货文案。
**核心要求**:
- **实用技巧**: 提供具体的、能解决实际痛点的阅读方法，并用简单的语言解释其原理。
- **能力提升**: 将阅读能力与解决实际问题、提升综合素养等高阶能力相链接。
- **亲子共读**: 给出能促进深度思维碰撞和情感链接的家庭共读策略。
**格式要求**: 每段文案都必须遵循"**一句精辟的引入 + 一条可落地的建议**"的结构，排版采用一句一行的形式。
**写作风格**: 专业、精炼、不说教。语言充满信任感，像与朋友分享经验。
**字数限制**: 每段文案控制在 50-70 字之间。
`
  };
  
  return sections[type];
}

// 生成幼儿段/小学段内容的提示词（恢复完整的原有提示词）
function createSegmentPrompt(type: 'toddler' | 'primary', count: number) {
  // 添加随机创意元素，确保每次生成不同的内容
  const creativeElements = [
    '从孩子的视角出发', '融入家庭温暖氛围', '结合自然元素', 
    '加入想象力元素', '突出成长主题', '强调亲子互动',
    '体现知识探索', '营造温馨场景', '激发好奇心',
    '引用经典诗句', '结合生活小事', '启发哲学思考'
  ];
  const randomElement = creativeElements[Math.floor(Math.random() * creativeElements.length)];

  // 使用共享的段落提示词
  const task_description = createSegmentSectionPrompt(type, count);

  return `请严格按照JSON格式返回，不要包含任何其他文字、解释或markdown标记。不要使用\`\`\`json\`\`\`代码块格式，直接返回纯JSON对象。

**# 角色**
你是一家深耕儿童阅读领域10余年的权威机构的**阅读推广主理人**。你既有深厚的教育理论功底，也深刻理解妈妈们在亲子阅读中的真实焦虑与困惑。你的文案总能**娓娓道来**，像与朋友分享经验一样，**亲切、实用且充满洞见**，总能说到家长的心坎里。

**# 澄清**
- **关于"诗歌形式"**: 这指的是"**一句一行**"的视觉排版，而非要求内容本身是诗歌体裁。

**# 核心要求**
1.  **专业高级**: 内容必须体现专业性，逻辑清晰、条理分明，充满知识点和实用建议。杜绝任何机器翻译或空洞的口号。
2.  **创意元素**: 本次创作请融入"${randomElement}"的创意方向。
3.  **严格分段**: 严格按照任务要求生成${count}段独立的文案。

**# 任务：创作儿童阅读推广文案**
---
${task_description}
---

**# 输出格式**
必须严格按照以下JSON格式返回，键和值都使用双引号，不要使用任何代码块标记：
{
  "copies": ["...", "...", "...", ...],
  "quote_index": -1
}

请生成${count}段专业指导文案。quote_index字段固定设为-1（表示不包含名人名言）。`;
}

// 名人名言生成提示词
function createQuotePrompt(quoteType: 'morning' | 'toddler' | 'primary', count: number) {
  const sceneConfig = {
    morning: {
      scene: '早安语场景',
      description: '适合早晨分享的温暖名人名言，结合时节、阅读与成长主题，给人以启迪和温暖，兼具哲思深度',
      examples: ['关于阅读的名言', '关于时间和早晨的名言', '关于成长和学习的名言', '关于生活态度的名言', '关于人生哲理的名言', '关于思考与智慧的名言'],
      style: '简洁温暖、富有诗意、适合早晨阅读、兼具哲思深度'
    },
    toddler: {
      scene: '幼儿段场景（0-6岁）',
      description: '适合低幼儿童家长的教育名言，强调陪伴、启蒙、想象力和亲子关系',
      examples: ['关于童年的名言', '关于想象力和创造力的名言', '关于亲子陪伴的名言', '关于早期教育的名言'],
      style: '温馨感人、充满爱意、强调陪伴价值'
    },
    primary: {
      scene: '小学段场景',
      description: '适合小学生家长的励志名言，关注阅读能力、学习方法、独立思考和品格培养',
      examples: ['关于读书和学习的名言', '关于毅力和坚持的名言', '关于思考和智慧的名言', '关于品格养成的名言'],
      style: '励志向上、富有哲理、激发上进心'
    }
  };

  const config = sceneConfig[quoteType];

  return `请严格按照JSON格式返回，不要包含任何其他文字、解释或markdown标记。不要使用\`\`\`json\`\`\`代码块格式，直接返回纯JSON对象。

**# 角色**
你是一位资深的名人名言编辑，深谙各类名人名言的精髓与应用场景。你擅长为不同场景精选最合适的名人名言，并能准确把握其内涵与价值。

**# 任务：精选${config.scene}名人名言**

**场景说明：**
${config.description}

**筛选要求：**
1. **真实性**: 所有名言必须是真实存在的，有据可查的名人名言，不可杜撰
2. **适配性**: 名言必须契合"${config.scene}"的特点和需求
3. **多样性**: 涵盖不同名人、不同角度、不同风格的名言，避免重复
4. **可读性**: 名言长度适中，易于理解和记忆
5. **价值性**: 每条名言都要有启发性和传播价值

**风格特点：**
${config.style}

**主题参考：**
${config.examples.join('、')}

**格式要求：**
- 每条名言格式：名言内容（一句一行，诗歌形式排版）+ 作者署名（换行后，格式：--作者名）
- 作者署名必须准确，使用真实的名人姓名
- 如果是中国名人，使用中文全名；外国名人可用通用译名

**# 输出格式**
必须严格按照以下JSON格式返回，键和值都使用双引号：
{
  "copies": [
    "名言内容（一句一行格式）\\n--作者名",
    "名言内容（一句一行格式）\\n--作者名",
    ...
  ],
  "quote_index": ${count - 1}
}

请生成${count}条符合${config.scene}的名人名言，放在copies数组中。quote_index固定为${count - 1}（因为所有内容都是名人名言）。`;
}

// 生成早安语内容的提示词（保持原有的三段式生成方式）
function createMorningPrompt(
  dateString: string, 
  context: any,
  regenerate_column?: 'morning' | 'toddler' | 'primary'
) {
  const displayDate = context.formattedDate || dateString;

  // 添加随机创意元素，确保每次生成不同的内容
  const creativeElements = [
    '从孩子的视角出发', '融入家庭温暖氛围', '结合自然元素', 
    '加入想象力元素', '突出成长主题', '强调亲子互动',
    '体现知识探索', '营造温馨场景', '激发好奇心',
    '引用经典诗句', '结合生活小事', '启发哲学思考'
  ];
  const randomElement = creativeElements[Math.floor(Math.random() * creativeElements.length)];
  
  const contextLines = [`- 日期：${displayDate} ${context.weekday}`];
  if (context.season) contextLines.push(`- 季节：${context.season}`);
  if (context.solarTerm) contextLines.push(`- 节气：${context.solarTerm}`);
  if (context.festival) contextLines.push(`- 节日：${context.festival}`);

  const sections = {
    morning: `
**## 早安寄语 (通用)**
创作5段独立的早安文案。
**核心要求**:
- **避免俗套**: 请避免使用"早安"、"清晨"、"早餐"等直接点明时间的词汇。
- **富有哲思**: 风格应侧重于哲理思考，可以是一个能引发回味的微小洞察，或对某个生活瞬间的深度思考。
- **严格遵守季节**: 文案内容必须与当前季节（${context.season}）相符，不能出现其他季节的元素。例如：
  * 春季：不能提"落叶"、"雪花"、"丰收"
  * 夏季：不能提"花开"、"落叶"、"寒风"
  * 秋季：不能提"花开"、"新芽"、"酷暑"
  * 冬季：不能提"花开"、"炎热"、"丰收"
- **情境优先**: 如果"特殊节点"信息不是"无"，那么五段文案需要紧密围绕该节点进行创作。
- **内容主旨**: 文案需像朋友一样，温柔地传递生活的美好与阅读的价值，为新的一天注入思考的能量。
- **格式要求**: 排版采用一句一行的形式。
- **字数限制**: 每段文案控制在 30-50 字之间。
`
  };

  const json_structure = {
    morning: `"morning_copies": ["...","...","...","...","..."]`
  };

  let task_description = '';
  let output_format = '';

  if (regenerate_column) {
    // 早安语模式只支持重新生成早安语列
    if (regenerate_column !== 'morning') {
      throw new Error('早安语模式只支持重新生成早安语内容');
    }
    task_description = sections.morning;
    output_format = `{ ${json_structure.morning} }`;
  } else {
    // 早安语模式只生成早安语内容
    task_description = sections.morning;
    output_format = `{ ${json_structure.morning} }`;
  }


  return `请严格按照JSON格式返回，不要包含任何其他文字、解释或markdown标记。不要使用\`\`\`json\`\`\`代码块格式，直接返回纯JSON对象。

**# 角色**
你是一家深耕儿童阅读领域10余年的权威机构的**阅读推广主理人**。你既有深厚的教育理论功底，也深刻理解妈妈们在亲子阅读中的真实焦虑与困惑。你的文案总能**娓娓道来**，像与朋友分享经验一样，**亲切、实用且充满洞见**，总能说到家长的心坎里。

**# 澄清**
- **关于"诗歌形式"**: 这指的是"**一句一行**"的视觉排版，而非要求内容本身是诗歌体裁。

**# 背景信息**
- 日期：${displayDate} ${context.weekday}
- 季节：${context.season}
- 特殊节点：${context.solarTerm || context.festival || '无'}

**# 核心要求**
1.  **专业高级**: 内容必须体现专业性，逻辑清晰、条理分明，充满知识点和实用建议。杜绝任何机器翻译或空洞的口号。
2.  **季节准确性（最重要）**: 文案必须严格符合当前季节（${context.season}），绝对不能出现其他季节的特征元素。这是硬性要求！
3.  **情境感知**: 如果当天是特殊的节气或节日，请将内容与该节点自然地结合。
4.  **严格分段**: 严格按照任务要求生成5段独立的早安语文案。

**# 任务：创作儿童阅读推广文案**
---
${task_description}
---

**# 输出格式**
必须严格按照以下JSON格式返回，键和值都使用双引号，不要使用任何代码块标记：
${output_format}`;
}

// 调用aihubmix平台的Gemini API生成早安语
async function callAihubmixGeminiMorning(
  prompt: string,
  regenerate_column?: 'morning' | 'toddler' | 'primary'
): Promise<Partial<GeneratedContent>> {
  const requestBody = {
    model: 'gemini-2.5-pro',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7, // 降低温度值提高稳定性
    max_tokens: 4000, // 增加token限制
    stream: false,
    top_p: 0.8,
    frequency_penalty: 0.1,
    presence_penalty: 0.1
  };
  
  const response = await fetch(AIHUBMIX_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('aihubmix API调用失败:', response.status, errorData);
    throw new Error(`API调用失败: ${response.status} ${response.statusText} - ${errorData}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('API返回数据格式错误:', data);
    throw new Error('API返回数据格式错误');
  }

  const content = data.choices[0].message.content;
  
  // 简单清理并解析JSON - 采用多策略尝试
  const parsed = parseAIResponse(content, regenerate_column);
  
  if (!parsed) {
    console.error('所有解析策略都失败了');
    throw new Error('AI返回内容格式错误，无法解析JSON');
  }
  
  return parsed;
}

// 新增：简单的JSON解析函数，采用多种策略
function parseAIResponse(content: string, regenerate_column?: string): any {
  // 策略1：直接解析（AI返回了正确的JSON）
  try {
    const parsed = JSON.parse(content);
    if (validateParsedContent(parsed, regenerate_column)) {
      return parsed;
    }
  } catch (e) {
    // 继续尝试其他策略
  }

  // 策略2：提取JSON并直接解析
  try {
    let cleaned = content.trim();
    
    // 移除markdown代码块
    cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    // 提取 { } 之间的内容
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
      const parsed = JSON.parse(cleaned);
      if (validateParsedContent(parsed, regenerate_column)) {
        return parsed;
      }
    }
  } catch (e) {
    // 继续尝试其他策略
  }

  // 策略3：转义所有换行符后解析（处理未转义的换行符）
  try {
    let cleaned = content.trim();
    cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
      
      // 简单粗暴：将所有真实换行符替换为\n（可能不完美但通常有效）
      cleaned = cleaned
        .replace(/\r\n/g, '\\n')
        .replace(/\r/g, '\\n')
        .replace(/\n/g, '\\n');
      
      const parsed = JSON.parse(cleaned);
      if (validateParsedContent(parsed, regenerate_column)) {
        return parsed;
      }
    }
  } catch (e) {
    // 继续尝试其他策略
  }

  // 策略4：使用容错解析
  try {
    const partial = extractPartialContent(content);
    if (partial && validateParsedContent(partial, regenerate_column)) {
      return partial;
    }
  } catch (e) {
    // 所有策略都失败
  }

  return null;
}

// 新增：验证解析后的内容是否符合要求
function validateParsedContent(parsed: any, regenerate_column?: string): boolean {
  if (!parsed) return false;
  
  const validators: Record<string, (p: any) => boolean> = {
    morning: (p: any) => p.morning_copies && Array.isArray(p.morning_copies) && p.morning_copies.length === 5,
    toddler: (p: any) => p.toddler_copies && Array.isArray(p.toddler_copies) && p.toddler_copies.length === 4,
    primary: (p: any) => p.primary_copies && Array.isArray(p.primary_copies) && p.primary_copies.length === 4,
  };

  if (regenerate_column) {
    return validators[regenerate_column]?.(parsed) || false;
  } else {
    // 早安语模式，只需要 morning_copies
    return validators.morning(parsed);
  }
}

// 尝试从不完整的响应中提取部分内容（简化版）
function extractPartialContent(content: string): GeneratedContent | null {
  try {
    let fixed = content.trim();
    
    // 移除markdown
    fixed = fixed.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    // 提取JSON
    const start = fixed.indexOf('{');
    const end = fixed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    
    fixed = fixed.substring(start, end + 1);
    
    // 转义换行符
    fixed = fixed.replace(/\r\n/g, '\\n').replace(/\r/g, '\\n').replace(/\n/g, '\\n');
    
    return JSON.parse(fixed);
  } catch (e) {
    return null;
  }
}

// 调用aihubmix平台的Gemini API生成幼儿段/小学段内容
async function callAihubmixGeminiSegment(prompt: string): Promise<SegmentContent> {
  const requestBody = {
    model: 'gemini-2.5-pro',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 4000,
    stream: false,
    top_p: 0.8,
    frequency_penalty: 0.1,
    presence_penalty: 0.1
  };
  
  const response = await fetch(AIHUBMIX_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('段落生成API调用失败:', response.status, errorData);
    throw new Error(`API调用失败: ${response.status} ${response.statusText} - ${errorData}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('段落生成API返回数据格式错误:', data);
    throw new Error('API返回数据格式错误');
  }

  const content = data.choices[0].message.content;
  
  // 检查内容是否为空
  if (!content || content.trim() === '') {
    console.error('API返回空内容:', data);
    throw new Error('API返回空内容，请检查API配置和网络连接');
  }
  
  // 使用简化的解析策略
  const parsed = parseSegmentResponse(content);
  
  if (!parsed) {
    console.error('所有解析策略都失败了');
    throw new Error('AI返回内容格式错误，无法解析JSON');
  }
  
  // 验证必需字段
  if (!parsed.copies || !Array.isArray(parsed.copies) || typeof parsed.quote_index !== 'number') {
    throw new Error('JSON缺少必需字段或格式错误');
  }

  // quote_index 可以是 -1（表示不包含名人名言）或有效的索引位置
  if (parsed.quote_index !== -1 && (parsed.quote_index < 0 || parsed.quote_index >= parsed.copies.length)) {
    throw new Error('quote_index超出范围');
  }
  
  return parsed as SegmentContent;
}

// 新增：段落内容的简单解析函数
function parseSegmentResponse(content: string): any {
  // 策略1：直接解析
  try {
    return JSON.parse(content);
  } catch (e) {
    // 继续尝试其他策略
  }

  // 策略2：提取并解析
  try {
    let cleaned = content.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
      return JSON.parse(cleaned);
    }
  } catch (e) {
    // 继续尝试其他策略
  }

  // 策略3：转义换行符
  try {
    let cleaned = content.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
      cleaned = cleaned.replace(/\r\n/g, '\\n').replace(/\r/g, '\\n').replace(/\n/g, '\\n');
      return JSON.parse(cleaned);
    }
  } catch (e) {
    // 所有策略都失败
  }

  return null;
}


export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { type, dates, count, regenerate_column } = body;

    // 验证请求参数
    if (!type) {
      return NextResponse.json(
        { success: false, error: '请提供生成类型' },
        { status: 400 }
      );
    }

    if (type === 'morning' && (!dates || dates.length === 0)) {
      return NextResponse.json(
        { success: false, error: '早安语模式请提供至少一个日期' },
        { status: 400 }
      );
    }

    if ((type === 'toddler' || type === 'primary') && (!count || count < 1)) {
      return NextResponse.json(
        { success: false, error: '请提供有效的生成条数' },
        { status: 400 }
      );
    }

    if (type === 'quote' && (!count || count < 1 || !body.quoteType)) {
      return NextResponse.json(
        { success: false, error: '请提供有效的生成条数和应用场景' },
        { status: 400 }
      );
    }
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API密钥未配置' },
        { status: 500 }
      );
    }

    // 处理名人名言生成
    if (type === 'quote') {
      try {
        const prompt = createQuotePrompt(body.quoteType!, count!);
        const content = await callAihubmixGeminiSegment(prompt);
        
        return NextResponse.json({
          success: true,
          content: {
            type: 'quote',
            content: content
          }
        });

      } catch (e) {
        console.error('生成名人名言时出错:', e);
        return NextResponse.json(
          { success: false, error: '生成名人名言失败' },
          { status: 500 }
        );
      }
    }

    // 处理幼儿段/小学段生成
    if (type === 'toddler' || type === 'primary') {
      try {
        const prompt = createSegmentPrompt(type, count!);
        const content = await callAihubmixGeminiSegment(prompt);
        
        return NextResponse.json({
          success: true,
          content: {
            type: type,
            content: content
          }
        });

      } catch (e) {
        console.error(`生成${type === 'toddler' ? '幼儿段' : '小学段'}内容时出错:`, e);
        return NextResponse.json(
          { success: false, error: `生成${type === 'toddler' ? '幼儿段' : '小学段'}内容失败` },
          { status: 500 }
        );
      }
    }

    // 处理早安语分列再生逻辑
    if (type === 'morning' && regenerate_column && dates && dates.length === 1) {
      const dateString = dates[0];
      try {
        const context = getDateContext(dateString);
        const prompt = createMorningPrompt(dateString, context, regenerate_column);
        const content = await callAihubmixGeminiMorning(prompt, regenerate_column);
        
        return NextResponse.json({
          success: true,
          date: dateString,
          column: regenerate_column,
          copies: content[`${regenerate_column}_copies` as keyof GeneratedContent]
        });

      } catch (e) {
        console.error(`处理日期 ${dateString} 的再生请求时出错:`, e);
        return NextResponse.json(
          { success: false, error: `重新生成 ${dateString} 失败` },
          { status: 500 }
        );
      }
    }


    // 处理早安语批量生成
    if (type === 'morning' && dates && dates.length > 0) {
      const results: ApiResponse[] = [];
      const errors: string[] = [];

      for (const dateString of dates) {
        try {
          const context = getDateContext(dateString);
          const prompt = createMorningPrompt(dateString, context);
          
          // 调用AI生成内容
          const content = await callAihubmixGeminiMorning(prompt) as GeneratedContent;

          results.push({
            date: dateString,
            context,
            content
          });

        } catch (dateError) {
          const errorMsg = dateError instanceof Error ? dateError.message : String(dateError);
          console.error(`处理日期 ${dateString} 时出错:`, dateError);
          errors.push(`${dateString}: ${errorMsg}`);
          // 继续处理其他日期，不中断整个流程
          continue;
        }
      }

      if (results.length === 0) {
        const detailedError = errors.length > 0 
          ? `所有日期处理失败。详细错误：${errors.join('; ')}`
          : '所有日期处理失败';
        console.error('批量处理完全失败，错误列表:', errors);
        return NextResponse.json(
          { success: false, error: detailedError },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        results: results
      });
    }

    // 如果没有匹配的处理逻辑，返回错误
    return NextResponse.json(
      { success: false, error: '无效的请求参数' },
      { status: 400 }
    );

  } catch (error) {
    console.error('API调用失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
