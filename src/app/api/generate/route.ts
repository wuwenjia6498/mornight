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
    { mood: '经验分享', hint: '像过来人的经验之谈，真实、接地气、有温度' },
    { mood: '带点幽默', hint: '轻松调侃一下阅读里的"槽点"，让人会心一笑' },
    { mood: '安静陪伴', hint: '不给建议，只描绘一个安静的阅读画面，让人自己体会' }
  ];

  // 多维度主题池——远不止"阅读方法"
  const primaryTopicDimensions = [
    // 维度1：阅读方法与技巧
    { dim: '阅读方法', topics: [
      '预测法：翻开书之前，光看封面和目录，猜猜故事走向',
      '批注法：在书页空白处随手写想法，和作者"对话"',
      '慢读：遇到喜欢的段落，故意放慢，一个字一个字品',
      '跳读：允许孩子跳过不感兴趣的部分，先抓住兴趣点',
      '出声朗读：有些文字读出声来，味道完全不一样',
      '角色扮演：分角色朗读对话，把书变成"微型话剧"'
    ]},
    // 维度2：选书与书单
    { dim: '选书', topics: [
      '让孩子自己选书，哪怕选了一本你觉得"太浅"的',
      '带孩子逛书店比列书单更管用，让他自己翻、自己挑',
      '别只给孩子读"有用的书"，"没用的书"里藏着想象力',
      '试试"书带书"：读完一本，顺藤摸瓜找同类型或同作者的',
      '经典名著不用急，时机不对硬塞反而坏了胃口',
      '漫画、图文小说也是阅读，别一刀切地否定'
    ]},
    // 维度3：阅读环境与仪式感
    { dim: '阅读环境', topics: [
      '给孩子一个属于他的阅读角，哪怕只是沙发的一个角落',
      '睡前的十五分钟阅读，比周末补两小时更有用',
      '家里到处放书，厕所、餐桌旁、车上，随手能拿到',
      '父母自己也在读书，比说一百遍"你要多读书"有效',
      '偶尔关掉灯用手电筒读书，孩子会觉得是探险',
      '下雨天、下雪天，是天然的阅读好日子'
    ]},
    // 维度4：读写联动
    { dim: '读写联动', topics: [
      '读完一本书，让孩子给主角写一封信',
      '鼓励孩子改写结局，"如果是你，你会怎么写？"',
      '孩子模仿喜欢的作者写句子，是最自然的写作启蒙',
      '把阅读笔记变成"小书评"，推荐给同学看',
      '读诗，然后试着写一首，不用押韵，只要有感觉',
      '画一张故事海报，图文并茂地"推销"这本书'
    ]},
    // 维度5：类型探索
    { dim: '类型探索', topics: [
      '孩子只爱看故事书？试试科普类，好奇心也是阅读的入口',
      '历史故事比教科书有趣一百倍，读着读着历史就记住了',
      '诗歌不是用来背的，是用来感受节奏和画面的',
      '非虚构类的书能教孩子"怎么看真实的世界"',
      '侦探推理类培养的是逻辑思维，别小看它',
      '人物传记让孩子看到：原来厉害的人小时候也有困惑'
    ]},
    // 维度6：社交阅读
    { dim: '社交阅读', topics: [
      '和好朋友读同一本书，然后约着一起聊，这叫"迷你读书会"',
      '让孩子当"阅读推荐官"，给全家推荐本周最佳',
      '兄弟姐妹或同学之间互换书读，换来的书格外有新鲜感',
      '亲子共读不只是"你读我听"，平等讨论才是精髓',
      '把孩子的读书感想录成音频，发给爷爷奶奶听',
      '全家一起读同一本书，晚饭时当"家庭话题"'
    ]},
    // 维度7：阅读心理
    { dim: '阅读心理', topics: [
      '孩子说"不想读了"，别急着批评，先问问卡在哪了',
      '阅读的兴趣像火苗，强迫只会把它吹灭',
      '孩子重复读同一本书不是浪费时间，是在消化和确认安全感',
      '偶尔放个"阅读假"，什么都不读，反而会想念读书',
      '别把阅读和考试挂钩，一旦功利化，乐趣就没了',
      '有的孩子是"慢热型读者"，给他时间，别和别人比进度'
    ]},
    // 维度8：深度阅读
    { dim: '深度阅读', topics: [
      '同一个故事，换个角色的角度想想，世界完全不一样',
      '读完一本书，试着用三句话概括——这比写读后感有趣',
      '注意作者怎么开头的，好的开头像钩子，值得研究',
      '找找书里的"伏笔"，发现时的惊喜感会让孩子上瘾',
      '对比两个版本的翻译，孩子会发现"原来文字有这么多可能"',
      '聊聊"如果删掉这个角色，故事会怎样？"，这就是结构思维'
    ]},
    // 维度9：跨媒介阅读
    { dim: '跨媒介', topics: [
      '先看书再看电影，让孩子比较"你脑子里的画面和导演拍的，哪个好？"',
      '听有声书也算阅读，适合通勤路上或睡前',
      '看完电影回去找原著，孩子会发现书里有更多细节',
      '让孩子给故事画插图，每个人想象的画面都不一样',
      '有些绘本改编成了动画，可以对比"文字的魔力在哪"'
    ]},
    // 维度10：阅读与成长
    { dim: '阅读与成长', topics: [
      '三年级读不懂的书，五年级再翻开会有全新感受',
      '孩子经历了什么，就容易被什么样的故事打动',
      '阅读不会立刻"有用"，但十年后你会感谢现在的积累',
      '书不是用来"教育"孩子的，是用来陪他经历更多人生的',
      '每个阶段的孩子需要不同的书，别急着"拔高"',
      '允许孩子讨厌一本你很喜欢的书，审美独立也是成长'
    ]}
  ];

  // 随机选取多个不同维度的话题，确保多样性
  function pickDiverseTopics(count: number): string[] {
    const shuffledDims = [...primaryTopicDimensions].sort(() => Math.random() - 0.5);
    const picked: string[] = [];
    for (let i = 0; i < Math.min(count, shuffledDims.length); i++) {
      const topics = shuffledDims[i].topics;
      const topic = topics[Math.floor(Math.random() * topics.length)];
      picked.push(`【${shuffledDims[i].dim}】${topic}`);
    }
    return picked;
  }

  const assignedTopics = pickDiverseTopics(count);
  
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
创作${count}段关于儿童阅读的文案，每段围绕一个不同的话题。

**这次的语气是**：${primaryTone.mood}  
${primaryTone.hint}

**每段文案的指定话题**（请严格对应，一段一个话题）：
${assignedTopics.map((t, i) => `第${i + 1}段：${t}`).join('\n')}

**禁止出现的陈词滥调**（这些已经用烂了，看到就扣分）：
- ❌ "脑内电影院"、"在脑子里放电影"、"当导演"
- ❌ "读完就忘"然后教画情节图/路线图/破案地图
- ❌ "别问中心思想"然后说"聊聊最喜欢谁"
- ❌ "把书和生活连起来，阅读就有了温度"
- ❌ "每个为什么都是一把小钥匙"
- ❌ 用"试试"作为万能转折词
- ❌ 结尾都用"你会发现..."的句式升华

**结构要多变**（不要每段都是"提出问题→给个方法→升华感悟"）：
- 可以直接讲一个小故事或场景
- 可以只抛出一个观点，不给"正确答案"
- 可以是一段很短的感悟
- 可以用对比、类比、反问
- 可以是给孩子说的话，也可以是给家长说的话

**排版**：一句一行  
**篇幅**：3-6句话，长短不一更好
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
    { theme: '从一个意想不到的角度谈阅读', example: '比如：为什么有的书适合夏天读、为什么书的厚度不等于难度' },
    { theme: '从一个真实的亲子场景切入', example: '比如：在书店犹豫选哪本、孩子拒绝放下手机去读书、晚饭时聊起书' },
    { theme: '从"反常识"出发', example: '比如：读得慢反而好、不喜欢也可以放弃、漫画也是好阅读' },
    { theme: '从一个具体的书或类型谈起', example: '比如：为什么侦探小说能锻炼逻辑、一本诗集怎么打开感受力' },
    { theme: '从孩子的情绪或状态出发', example: '比如：无聊时读什么、伤心时读什么、兴奋时读什么' },
    { theme: '从"大人也是这样"的视角', example: '比如：我们大人也会读不下去、也会只看一种类型、也会三分钟热度' },
    { theme: '从阅读周边的小事说起', example: '比如：书签的意义、书架的摆放、借书与买书的区别' }
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
