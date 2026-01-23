import { NextRequest, NextResponse } from 'next/server';
import solarlunar from 'solarlunar';

interface GenerateRequest {
  type: 'morning' | 'toddler' | 'primary' | 'quote' | 'picturebook';
  dates?: string[];
  count?: number;
  quoteType?: 'morning' | 'toddler' | 'primary';  // 名人名言的应用场景
  pictureBookCategory?: 'minimalist' | 'childview' | 'philosophy' | 'nature';  // 绘本语言的分类
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
  // 增加写作风格的随机性
  const toddlerTones = [
    { mood: '轻松聊天', hint: '像周末下午和闺蜜喝咖啡时的闲聊，自然地分享一些关于绘本的小发现' },
    { mood: '温柔陪伴', hint: '像妈妈在孩子睡前轻声说话，温柔而笃定，不急不躁' },
    { mood: '好奇探索', hint: '像发现新大陆的孩子，带着兴奋和惊喜分享绘本里的秘密' },
    { mood: '真诚对话', hint: '像深夜和老朋友的谈心，真诚、不装、有共鸣' }
  ];
  
  const primaryTones = [
    { mood: '平等交流', hint: '像学校门口遇到的有经验的家长，随口分享的实用小窍门' },
    { mood: '轻快点拨', hint: '一两句话点中要害，不绕弯子，简洁有力' },
    { mood: '启发思考', hint: '抛出一个有趣的视角，引发"咦，还可以这样"的思考' },
    { mood: '经验分享', hint: '像过来人的经验之谈，真实、接地气、有温度' }
  ];
  
  // 小学生阅读方法参考（借鉴《小学生如何阅读一本小说》等阅读方法论）
  const readingMethods = [
    '预测法：读之前猜猜会发生什么',
    '提问法：边读边问"为什么"',
    '联结法：和自己的经历联系起来',
    '画面感：在脑海里"演"出来',
    '人物卡：记录人物的变化',
    '情节图：画出故事的起承转合',
    '主题墙：找找书想说的深层意思',
    '词句本：摘抄打动自己的句子',
    '读后聊：和家长或朋友聊聊感受',
    '重读法：好书值得读第二遍',
    '慢读法：重要段落放慢速度',
    '批注法：在书页空白处写想法'
  ];
  const randomMethod = readingMethods[Math.floor(Math.random() * readingMethods.length)];
  
  const toddlerTone = toddlerTones[Math.floor(Math.random() * toddlerTones.length)];
  const primaryTone = primaryTones[Math.floor(Math.random() * primaryTones.length)];
  
  const sections = {
    toddler: `
**## 幼儿段 (0-6岁)**
围绕"绘本阅读"和"亲子共读"，创作${count}段各具特色的文案。

**这次的语气是**：${toddlerTone.mood}  
${toddlerTone.hint}

**内容方向（参考，不必生搬硬套）**：
- 可以是一个生动的小场景或小比喻
- 可以是一个让人"哦对哦"的阅读洞察
- 可以是一个解决具体问题的小方法
- 重点是：说人话，别端着，别像课本

**排版**：一句一行，读起来有呼吸感  
**篇幅**：大约3-5句话，别太长
`,
    primary: `
**## 小学段**
围绕"阅读习惯与能力提升"，创作${count}段各有特点的文案。

**这次的语气是**：${primaryTone.mood}  
${primaryTone.hint}

**可以参考的阅读方法**：${randomMethod}  
（这是一个参考角度，${count}段文案可以围绕不同的阅读方法展开，比如预测法、提问法、联结法、画面感、人物卡、情节图、主题理解、词句摘抄、读后讨论、重读、慢读、批注等）

**内容方向**：
- 可以介绍一个具体的阅读方法，说说怎么用、为什么有效
- 可以从孩子阅读中的一个具体困境出发（读不懂、记不住、没感觉）
- 可以点破一个常见误区（比如只求快、不求懂）
- 可以分享一个阅读小工具或小习惯
- 重点是：给具体方法，别只说"要多读书"这种正确的废话

**排版**：一句一行，清爽利落  
**篇幅**：大约4-6句话
`
  };
  
  return sections[type];
}

// 生成幼儿段/小学段内容的提示词
function createSegmentPrompt(type: 'toddler' | 'primary', count: number) {
  // 更丰富的创意触发点
  const toddlerAngles = [
    { theme: '从一个具体场景切入', example: '比如：睡前时光、书店的角落、雨天的午后' },
    { theme: '从孩子的一句话出发', example: '比如孩子说的"再讲一遍"、"为什么"' },
    { theme: '从一个常见困惑着手', example: '比如：坐不住、不爱听、选书难' },
    { theme: '从一本绘本的启发谈起', example: '比如某本绘本带来的惊喜发现' },
    { theme: '从季节或时节联想', example: '比如：春天的书、夏夜的故事' },
    { theme: '从一个小细节入手', example: '比如：书页的气味、翻页的声音、孩子的表情' },
    { theme: '从情绪或状态谈起', example: '比如：焦躁时、疲惫时、亲子时光' }
  ];
  
  const primaryAngles = [
    { theme: '从一个阅读困境切入', example: '比如：读不下去、读完就忘、不懂深意' },
    { theme: '从一个具体的阅读方法讲起', example: '比如：预测法、提问法、批注法' },
    { theme: '从孩子的阅读现象出发', example: '比如只看漫画、囫囵吞枣、只读一种类型' },
    { theme: '从一本书的阅读过程说起', example: '比如读《夏洛的网》时怎么读出层次' },
    { theme: '从阅读习惯的养成谈起', example: '比如建立阅读时间、阅读环境、阅读仪式感' },
    { theme: '从亲子共读的技巧切入', example: '比如怎么讨论、怎么提问、怎么引导思考' },
    { theme: '从阅读能力的提升说起', example: '比如理解力、概括力、批判思维' }
  ];
  
  const angle = type === 'toddler' 
    ? toddlerAngles[Math.floor(Math.random() * toddlerAngles.length)]
    : primaryAngles[Math.floor(Math.random() * primaryAngles.length)];

  // 使用共享的段落提示词
  const task_description = createSegmentSectionPrompt(type, count);

  return `直接返回纯JSON，不要任何额外说明或代码块标记。

# 你是谁
就是一个真心喜欢童书、有些经验、愿意分享的人。不用装成什么专家，就像和朋友聊天那样自然就好。

# 这次可以试试
${angle.theme}  
${angle.example}

# 具体要求
${task_description}

# 注意
- ${count}段文案，每段都要有点不一样的味道
- 不要每段都用同样的句式开头
- 可以偶尔用个"你想啊"、"其实"、"有时候"这样的口语词
- 别怕说得不够"专业"，说人话更重要
- 一句一行排版，读起来舒服就行

# 输出格式
{
  "copies": ["...", "...", "...", ...],
  "quote_index": -1
}

直接返回JSON，别加markdown标记。`;
}

// 名人名言生成提示词
function createQuotePrompt(quoteType: 'morning' | 'toddler' | 'primary', count: number) {
  const sceneConfig = {
    morning: {
      scene: '早安语场景',
      description: '适合早晨读到的名人名言，关于阅读、时光、成长、思考',
      themes: ['阅读与书', '时间与晨光', '成长', '生活态度', '哲理思考', '智慧'],
      vibe: '安静、温暖、有点诗意、有点哲思'
    },
    toddler: {
      scene: '幼儿段场景',
      description: '适合低幼儿童家长的教育名言，关于陪伴、童年、想象力',
      themes: ['童年时光', '想象力', '陪伴', '早期教育', '天性'],
      vibe: '温柔、充满爱、让人想起孩子小时候的样子'
    },
    primary: {
      scene: '小学段场景',
      description: '适合小学生家长的励志名言，关于学习、思考、品格',
      themes: ['读书学习', '坚持', '独立思考', '品格', '求知'],
      vibe: '励志但不鸡血、有哲理但不说教'
    }
  };

  const config = sceneConfig[quoteType];

  return `直接返回纯JSON，不要任何额外文字或markdown标记。

# 任务：找${count}条${config.scene}的名人名言

**场景**：${config.description}

**可以的主题**：${config.themes.join('、')}

**想要的感觉**：${config.vibe}

**注意**：
- 必须是真实的名人名言，别编造
- 不要都是最常见的那几句（比如"书籍是人类进步的阶梯"这种用烂的）
- 可以找一些稍微小众点的、有意思的
- 中外名人都可以，时代不限
- 长度适中，别太长看不下去

**格式**：
- 名言内容（一句一行排版）
- 换行后写：--作者名

# 输出格式
{
  "copies": [
    "名言内容\\n--作者名",
    "名言内容\\n--作者名",
    ...
  ],
  "quote_index": ${count - 1}
}

直接返回JSON，${count}条名言。`;
}

// 最美绘本语言生成提示词
function createPictureBookPrompt(category: 'minimalist' | 'childview' | 'philosophy' | 'nature', count: number) {
  const categoryConfig = {
    minimalist: {
      name: '极简主义',
      vibe: '简单的句子，舒缓的节奏，宁静、治愈，有点淡淡的孤独感或禅意',
      like: '像《山中旧事》《大海遇见天空》那种',
      examples: [
        '小时候，我住在山里。\n我从没向往过海洋，\n也从没向往过沙漠。\n因为我住在山里，就已经足够。\n——《山中旧事》'
      ]
    },
    childview: {
      name: '儿童视角',
      vibe: '从孩子眼睛看世界，小小的切口，但说的是大大的人生道理',
      like: '像《月下看猫头鹰》《石头汤》那种',
      examples: [
        '出去看猫头鹰，\n不需要说话，\n不需要温暖舒适，\n也不需要别的什么，\n只要心中有一个希望。\n——《月下看猫头鹰》'
      ]
    },
    philosophy: {
      name: '哲理留白',
      vibe: '文字有空气感，有留白，读完让人想静静体会一下',
      like: '像《大鲸鱼玛丽莲》《一片叶子落下来》那种',
      examples: [
        '"你觉得自己怎么样，你就会怎么样。\n觉得自己轻，就能学好游泳。\n想想看，鸟和鱼会觉得自己重吗？当然不会！"\n想变轻，就要觉得自己轻。\n试一试吧！\n——《大鲸鱼玛丽莲》'
      ]
    },
    nature: {
      name: '自然隐喻',
      vibe: '通过自然（风、山、光影、植物）来说人生的事',
      like: '像《宝藏》《森林大熊》那种',
      examples: [
        '"有时候，\n人必须远行，\n才能发现近在咫尺的东西。"\n——《宝藏》'
      ]
    }
  };

  const config = categoryConfig[category];

  return `直接返回纯JSON，不要任何额外文字或markdown标记。

# 任务：从真实绘本中摘录${config.name}风格的文字

**什么样的**：${config.vibe}  
**参考书**：${config.like}

**示例**：
${config.examples.join('\n\n')}

**要求**：
- 必须是真实绘本的原文，一个字都别改
- 保留原书的断行（用\\n）
- 格式：原文 + 换行 + ——《书名》
- ${count}条来自${count}本不同的书

**选书**：
- 别都是《猜猜我有多爱你》《爱心树》这些太常见的
- 找点小众的、有意思的
- 中外绘本都行，经典和新书都可以
- 凯迪克奖、格林威奖、博洛尼亚奖的获奖作品可以多找找

**长度**：随意，有的绘本一两句，有的可能需要一小段，完整就好

# 输出格式
{
  "copies": [
    "原文内容\\n——《书名》",
    "原文内容\\n——《书名》"
  ],
  "quote_index": -1
}

直接返回JSON，摘录${count}条。`;
}

// 生成早安语内容的提示词
function createMorningPrompt(
  dateString: string, 
  context: any,
  regenerate_column?: 'morning' | 'toddler' | 'primary'
) {
  const displayDate = context.formattedDate || dateString;

  // 更具体的写作角度
  const writingAngles = [
    { angle: '从书中某个句子或故事出发', hint: '想象一本书给你的某个瞬间触动' },
    { angle: '从阅读时的微小发现说起', hint: '比如孩子翻书时的表情、某个问题、某次讨论' },
    { angle: '从时间的流逝感谈起', hint: '孩子在长大，书在陪伴，光阴在书页间' },
    { angle: '从安静的时刻切入', hint: '一个人、一本书、一段独处的时光' },
    { angle: '从日常小事联想', hint: '窗外的天气、桌上的书、手边的茶' },
    { angle: '从内心的某种状态出发', hint: '疲惫、好奇、平静、期待' }
  ];
  const angle = writingAngles[Math.floor(Math.random() * writingAngles.length)];
  
  // 根据季节生成更自然的提示
  const seasonalNotes: Record<string, string> = {
    '春季': '可以感受到的：新芽、雨水、渐暖、复苏。别提：落叶、雪、丰收、寒冷',
    '夏季': '可以感受到的：光线、树荫、蝉鸣、漫长的日子。别提：落叶、寒风、花开初期',
    '秋季': '可以感受到的：转凉、落叶、收获、温差。别提：新芽、炎热、雪',
    '冬季': '可以感受到的：寒冷、安静、炉火、早黑的天。别提：花开、炎热、新芽'
  };

  const json_structure = {
    morning: `"morning_copies": ["...","...","...","...","..."]`
  };

  const task_description = `
**## 创作5段早安文案**

**今天是**：${displayDate} ${context.weekday}  
**季节**：${context.season}${context.solarTerm ? `，${context.solarTerm}` : ''}${context.festival ? `，${context.festival}` : ''}

**季节感受**：  
${seasonalNotes[context.season] || ''}

**这次试试**：${angle.angle}  
${angle.hint}

**基本要求**：
- 5段文案，每段都要有点不一样
- 别出现"早安"、"清晨"、"早餐"这些太直白的词
- 可以有点哲思，但别说教
- 和阅读、书、成长有点关联就好，别太刻意
- 一句一行排版
- 大约2-4句话一段

**注意**：
- 写得像人话，别像标语
- 可以有点情绪，可以有点犹豫，可以不那么确定
- 不用每段都很"正能量"，平静、疑问、留白也很好
`;

  let output_format = `{ ${json_structure.morning} }`;

  if (regenerate_column) {
    if (regenerate_column !== 'morning') {
      throw new Error('早安语模式只支持重新生成早安语内容');
    }
  }

  return `直接返回纯JSON，不要任何额外文字或markdown标记。

# 你是谁
一个喜欢读书、喜欢观察生活、偶尔有些小感悟的普通人。

${task_description}

# 输出格式
${output_format}

直接返回JSON，别加代码块。`;
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
    console.error('所有解析策略都失败了，原始内容:');
    console.error('--- 原始内容开始 ---');
    console.error(content.substring(0, 2000)); // 只打印前2000字符避免日志过长
    console.error('--- 原始内容结束 ---');
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

// 新增：段落内容的简单解析函数（增强版，处理绘本语言等复杂格式）
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

  // 策略3：转义换行符（基础版）
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
    // 继续尝试其他策略
  }

  // 策略4：智能处理字符串内部的换行符（专门处理绘本语言等复杂内容）
  try {
    let cleaned = content.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
      
      // 只转义双引号内的换行符，保留 JSON 结构的换行
      let inString = false;
      let escaped = false;
      let result = '';
      
      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        
        if (escaped) {
          result += char;
          escaped = false;
          continue;
        }
        
        if (char === '\\') {
          escaped = true;
          result += char;
          continue;
        }
        
        if (char === '"') {
          inString = !inString;
          result += char;
          continue;
        }
        
        // 在字符串内部，将真实换行符转义
        if (inString && (char === '\n' || char === '\r')) {
          if (char === '\r' && cleaned[i + 1] === '\n') {
            result += '\\n';
            i++; // 跳过 \n
          } else {
            result += '\\n';
          }
          continue;
        }
        
        result += char;
      }
      
      return JSON.parse(result);
    }
  } catch (e) {
    // 继续尝试其他策略
  }

  // 策略5：使用正则提取 copies 数组（最后的兜底方案）
  try {
    let cleaned = content.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    // 尝试匹配 copies 数组的内容
    const copiesMatch = cleaned.match(/"copies"\s*:\s*\[([\s\S]*?)\]\s*[,}]/);
    const quoteIndexMatch = cleaned.match(/"quote_index"\s*:\s*(-?\d+)/);
    
    if (copiesMatch) {
      // 提取数组内容并手动解析
      const arrayContent = copiesMatch[1];
      const copies: string[] = [];
      
      // 匹配每个字符串元素
      const stringPattern = /"((?:[^"\\]|\\.)*)"/g;
      let match;
      while ((match = stringPattern.exec(arrayContent)) !== null) {
        // 处理转义字符
        let str = match[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        copies.push(str);
      }
      
      if (copies.length > 0) {
        return {
          copies,
          quote_index: quoteIndexMatch ? parseInt(quoteIndexMatch[1]) : -1
        };
      }
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

    if (type === 'picturebook' && (!count || count < 1 || !body.pictureBookCategory)) {
      return NextResponse.json(
        { success: false, error: '请提供有效的生成条数和语言风格分类' },
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

    // 处理最美绘本语言生成（带自动重试机制）
    if (type === 'picturebook') {
      const maxRetries = 3;
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`绘本语言生成尝试 ${attempt}/${maxRetries}`);
          const prompt = createPictureBookPrompt(body.pictureBookCategory!, count!);
          const content = await callAihubmixGeminiSegment(prompt);

          return NextResponse.json({
            success: true,
            content: {
              type: 'picturebook',
              content: content
            }
          });

        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
          console.error(`绘本语言生成第 ${attempt} 次尝试失败:`, lastError.message);
          
          // 如果还有重试机会，等待一小段时间后重试
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // 所有重试都失败
      console.error('绘本语言生成全部重试失败:', lastError);
      return NextResponse.json(
        { success: false, error: '生成绘本语言失败，请稍后重试' },
        { status: 500 }
      );
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
