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
    { mood: '轻松自然', hint: '语气松弛，像随口聊起一个有意思的事。不端着，不说教，自然流畅' },
    { mood: '温柔笃定', hint: '语气柔软但有力量，像一句说到心坎里的话。不犹豫、不啰嗦' },
    { mood: '好奇发现', hint: '带着"你知道吗"的发现感，分享一个关于阅读的小洞察，让人眼前一亮' },
    { mood: '安静沉淀', hint: '语气安静、有留白，像读完一本好书后的片刻沉思。不急着给答案' }
  ];
  
  const primaryTones = [
    { mood: '平等对话', hint: '不是在指导谁，就是平等地说一个想法。"你有没有注意到……""其实可以换个思路……"' },
    { mood: '一针见血', hint: '不绕弯子，直接点出一个容易被忽略的关键点。简洁有力，读完让人"哦！"' },
    { mood: '温和建议', hint: '用"可以试试""也许""不妨"这样的语气，给建议但不强加。读者觉得被尊重而不是被教育' },
    { mood: '换个角度', hint: '提供一个不一样的视角，让人重新看待一件习以为常的事。"其实换个角度想……"' }
  ];
  
  // 幼儿段方法论体系（16本书合并为8个差异化体系，每体系10个方法）
  const toddlerMethodSystems = [
    {
      source: '绘本的本质与情感（松居直《幸福的种子》《我的图画书论》《绘本之力》/ 林美琴《绘本有什么了不起？》）',
      focus: '绘本不是教材，是情感体验——亲子共读的本质是爱的传递',
      methods: [
        '绘本不是用来"教"的：很多家长读完一本绘本就问"你学到了什么？"——这恰恰是最扫兴的。绘本的首要功能是让孩子感受到快乐、温暖、好奇，不是灌输道理',
        '用耳朵"读"书：松居直说，对幼儿来说，"读"书其实是"听"书。孩子听到的不只是故事，还有你的声音、你的呼吸、你的体温。这些加在一起，才是完整的阅读体验',
        '绘本是大人和孩子之间的桥梁：平时不知道怎么跟孩子聊感受？绘本是最好的中间人。读到小兔子害怕黑暗，孩子可能会说"我也怕"——对话就自然地开始了',
        '反复读同一本书是正常的：孩子反复要求"再讲一遍"不是没记住，是因为这本书让他感到安全和快乐。重复是幼儿确认世界的方式，每一遍他都在获取不同的东西',
        '不要急着"升级"：孩子一直读"简单"的绘本？别着急换难的。松居直说，绘本没有难易之分，只有"孩子现在需要什么"。他需要的就是最好的',
        '亲子共读不是为了识字：把共读变成识字课，是最快消灭阅读兴趣的方法。在这个阶段，让孩子爱上"和你一起看书的感觉"，比认识多少字重要得多',
        '好的绘本大人也会被打动：如果你觉得一本绘本"幼稚"、"没什么内容"，可能是你还没有读到它真正想说的话。好的绘本是大人和孩子可以一起感动的',
        '情感先于认知：0-6岁的孩子，情感发展比认知发展更重要。绘本最大的价值不是教孩子认字、学知识，而是帮他建立安全感、同理心和对世界的信任',
        '每一本绘本都是一颗种子：松居直说，幼年的阅读体验就是播下的种子，不会马上发芽，但总有一天你会发现——那些故事已经在孩子心里生了根',
        '放下"有用"的执念：不是每本绘本都要有教育意义。有些书就是好玩、好笑、好看。快乐本身就是最大的意义'
      ]
    },
    {
      source: '怎么看图画书（彭懿《图画书应该这样读》《世界图画书阅读与经典》/ 郝广才《好绘本如何好？》）',
      focus: '绘本是图文合奏，学会"看图"才算真的会读绘本',
      methods: [
        '文字只讲了一半的故事：很多家长读绘本只读文字，把图画当插图。其实绘本的图画在讲另一半故事——有时候图和文字说的甚至不是同一件事，那才是最有趣的地方',
        '翻页的节奏感：为什么有的绘本让人想快快翻到下一页？因为作者在翻页处制造了悬念。和孩子一起感受翻页前的"然后呢？"——这就是绘本独有的叙事魅力',
        '封面和封底也是故事的一部分：很多家长翻开书就开始读正文。试试和孩子先看封面——"你觉得这会是一个什么样的故事？"封底也别跳过，有些绘本的结局藏在封底里',
        '留白的力量：好的绘本会留空间让你想象。画面里没有画出来的东西，有时候比画出来的更重要。问问孩子"你觉得画面外面还发生了什么？"',
        '色彩是有情绪的：暖色调代表温暖、安全，冷色调代表孤独、紧张。不需要和孩子讲这些理论，但可以问"这一页的颜色让你感觉怎么样？"孩子的感受力比你想象的强',
        '大图和小图的秘密：为什么有的画面占了整整两页，有的却缩在角落？画面越大，情感越强烈；画面越小，角色可能越孤独。这些是图画书的"视觉语法"',
        '视角会说话：画面是从上往下看的？角色会显得渺小。从下往上看？角色会显得强大。和孩子一起发现"画家是站在哪里画的"，这是一个有趣的游戏',
        '文图的配合与反差：有时候文字说"他一点也不害怕"，但图上画的是一个在发抖的小人。这种反差就是幽默的来源。帮孩子发现这种反差，他会笑得合不拢嘴',
        '环衬也有戏：翻开封面后那张"纯色页"（环衬），很多人直接跳过。但好的绘本里，环衬的颜色和图案是有含义的，甚至前后环衬不一样——故事在你翻开之前就已经开始了',
        '一本绘本值得反复"看"：第一遍跟着故事走，第二遍去看图画里的细节，第三遍发现图文之间的秘密。同一本绘本，"看"的方式不同，发现完全不同'
      ]
    },
    {
      source: '选书与经典（松居直《松居直喜欢的50本图画书》/ 彭懿《世界图画书阅读与经典》）',
      focus: '怎么给孩子选书——不是越贵越好、越新越好，关键是适合',
      methods: [
        '孩子自己选的书最好：书店里让孩子自己挑，哪怕他选了一本你觉得"太简单"的。自己选的书他愿意读，你选的书他可能连翻都不翻',
        '不必追求"书单"：网上的"必读书单"是参考，不是标准。每个孩子的兴趣点不同，强迫读他不感兴趣的"经典"，效果还不如他自己挑的一本恐龙书',
        '经典绘本之所以经典：不是因为大人觉得好，而是几十年来无数孩子都喜欢。《母鸡萝丝去散步》简单吗？简单。但它的图文反差让每一代孩子都笑出声——这就是经典的力量',
        '分龄只是参考：标着"3-6岁"的绘本，2岁的孩子可能也爱听，7岁的孩子可能还在读。不要被年龄标签限制住，孩子的反应才是最好的判断标准',
        '同一位作者可以串着读：孩子喜欢《猜猜我有多爱你》？可以找同一个作者的其他作品。熟悉的风格会让孩子有安全感，同时也在拓展阅读面',
        '绘本不只是"故事书"：无字绘本、概念绘本、科普绘本、诗歌绘本——绘本的类型比你想象的多。偶尔换换类型，孩子可能会打开新世界',
        '不要只买不读：家里绘本堆成山，但很多只翻过一遍？挑出十本，轮流读，反复读。十本读透了，比一百本翻过去有价值',
        '图书馆是最好的试衣间：不确定孩子喜不喜欢？先去图书馆借。借回来他抱着不撒手的，再买回家。这是最经济也最准确的选书方式',
        '关注获奖作品但不迷信：凯迪克奖、格林威奖的获奖作品通常水准很高，是选书的好起点。但获奖不代表你家孩子一定喜欢，还是要观察他的反应',
        '跟着孩子的兴趣走：孩子最近迷恐龙？那就借一堆恐龙绘本。迷月亮？那就找关于月亮的书。兴趣是最好的领路人，顺着它走，阅读自然就发生了'
      ]
    },
    {
      source: '亲子共读实操（粲然《骑鲸之旅》1&2 / 汪培珽《喂故事书长大的孩子》）',
      focus: '从0岁开始的共读实操——那些"怎么办"的真实问题',
      methods: [
        '撕书、啃书是正常的：一岁以内的宝宝用嘴巴和手探索世界，书也不例外。撕了也没关系，这说明他在和书互动。这个阶段，布书、纸板书是好选择',
        '坐不住就别强求坐着听：谁规定读书一定要安安静静坐好？孩子在地上爬着、玩着积木，你在旁边读，他听到了——这也是共读。不要把"坐好听"当成前提条件',
        '读书不要变成任务：每天固定要读几本？读完要回答问题？一旦有了KPI，共读就变成了负担。随性一点，想读就读，哪怕只读了两页也很好',
        '从每天五分钟开始：不需要一开始就读半小时。每天五分钟，坚持下来，比偶尔读一次两小时有用得多。习惯是积累出来的',
        '抱着读是最好的姿势：让孩子窝在你怀里，书摊开在面前。他看到的是书，感受到的是你的体温。这个姿势本身就是安全感',
        '孩子打断你是好事：读到一半孩子突然指着图说"狗狗！"——这不是捣乱，是他在参与。停下来，回应他，和他聊两句，然后再继续。互动比读完更重要',
        '不要用绘本"教育"孩子：孩子不刷牙就读刷牙的绘本，孩子打人就读关于友善的绘本——绘本不是行为矫正工具。孩子能感觉到你的目的性，反而会抗拒',
        '爸爸也要参与共读：爸爸读书的声音、节奏和妈妈不同，孩子能从中获得不一样的体验。而且爸爸参与阅读，对孩子阅读兴趣的影响比很多人想象的大',
        '每个孩子的共读节奏不同：有的孩子一岁就能安静听完一本，有的三岁还坐不住。这不是落后，是节奏不同。尊重自己孩子的节奏，别和别人家比',
        '读绘本不需要演技：不必每次都声情并茂、一人分饰多角。用你自然的、舒服的方式读就好。孩子在意的不是你演得好不好，而是你在不在身边'
      ]
    },
    {
      source: '共读中的对话与讨论（钱伯斯《说来听听》/ 佩利《共读绘本的一年》）',
      focus: '读完之后怎么聊——好的对话让一本书活起来',
      methods: [
        '最好的开场白是"你觉得呢"：读完不要急着问"这个故事讲了什么"。换成"你觉得呢？"或者"你最喜欢哪里？"——开放的问题才能打开孩子的话匣子',
        '先说感受，再说理解：钱伯斯建议从三个层次聊——"喜欢的地方""不喜欢的地方""困惑的地方"。不要跳过感受直接问道理，感受是思考的入口',
        '接住孩子的回答，不要评判：孩子说"我觉得大灰狼也很可怜"——别急着纠正。说一句"为什么这样想？"继续听下去。每一个"奇怪"的回答背后，都有孩子自己的逻辑',
        '沉默也是回应的一部分：问了一个问题孩子不说话？别催。给他时间想。有时候十几秒的沉默之后，孩子会说出让你惊讶的话',
        '讨论不是考试：如果孩子觉得每次读完书都要"回答问题"，他会开始害怕读书。讨论应该像聊天一样自然，不想说的时候也可以不说',
        '你的感受也可以说：不只是问孩子"你觉得呢"，你也可以说"这一页我觉得好美"或者"这个结局我没想到"。当大人也分享感受的时候，孩子会更愿意开口',
        '追问比提问更重要：第一个问题打开话题，后面的追问才是深入的关键。"然后呢？""你怎么想到的？""如果换成你呢？"——一步步引向更深的思考',
        '聊着聊着跑题了也没关系：从绘本里的兔子聊到了幼儿园的小兔子，又聊到了今天中午吃的胡萝卜——这不是跑题，这是孩子在做"联结"。他正在用自己的方式理解世界',
        '不是每本书都需要讨论：有些书读完就让它安静地待着就好。过度讨论和不讨论一样，都会消磨乐趣。观察孩子——他想聊的时候自然会开口',
        '佩利的发现——孩子的讨论能力超乎想象：佩利在幼儿园里用一整年的共读实践证明，即使是3-5岁的孩子，也能进行深度的故事讨论，关键是大人愿不愿意认真倾听'
      ]
    },
    {
      source: '朗读的力量（吉姆·崔利斯《朗读手册》）',
      focus: '朗读是给孩子的最好礼物——简单、免费、效果深远',
      methods: [
        '每天朗读十五分钟：不需要很长时间，十五分钟就够了。但关键是每天都有。这十五分钟里，孩子获得的不只是故事，还有专注力、词汇量和安全感',
        '朗读从出生就可以开始：新生儿听不懂故事？没关系。他听到的是你的声音和节奏。崔利斯说，朗读的起点不是"孩子能听懂"，而是"你开始读"',
        '听得懂的比读得懂的多：3岁孩子可能只认识几个字，但他能听懂比自己阅读能力高得多的故事。朗读就是在帮孩子的理解力"坐电梯"，远远跑在识字前面',
        '朗读的仪式感很重要：固定的时间、固定的位置、固定的一盏灯。不是仪式有什么魔力，而是"确定性"给孩子安全感。当睡前故事变成"我们家的规矩"，它就不会被轻易放弃',
        '不要把朗读变成识字课：指着字一个一个教孩子认，或者读到一半停下来问"这个字念什么"——这是在把朗读时光变成上课。孩子要的是故事，不是生字表',
        '章节书也可以朗读：绘本适合朗读，章节书也可以。每天读一章，故事线拉长，孩子的期待感更强。"今晚还读吗？""当然！"——这就是阅读习惯的雏形',
        '你的声音就是最好的有声书：手机里的故事音频再好听，也比不过你的声音。因为你会停顿、会看孩子的反应、会根据他的情绪调整节奏，这是任何音频做不到的',
        '朗读不要停在孩子会自主阅读之后：很多家长觉得孩子自己能读了就不用朗读了。其实不是。孩子自己读的书和听你读的书可以是不同层次的——朗读可以一直持续到小学',
        '读得不好也没关系：不会配音、不会演戏、普通话不标准？没关系。真诚地读，认真地读，你的投入孩子感受得到。完美的技巧远不如真实的陪伴',
        '有时候，一本书改变一切：崔利斯记录了无数家庭因为一本对的书、一段朗读时光，让一个不爱读书的孩子爱上了阅读。改变不一定需要宏大的计划，有时候只需要一本书和一个愿意读的大人'
      ]
    },
    {
      source: '阅读环境与氛围（钱伯斯《打造儿童阅读环境》/ 克拉生《阅读的力量》）',
      focus: '环境的力量远大于说教——让书成为空气一样自然的存在',
      methods: [
        '家里到处都是书：客厅、卧室、餐桌旁、甚至卫生间。让孩子随手都能拿到书，比对他说"去读书"有用十倍。看得见书的孩子，才会拿起书',
        '书架放低一点：把书放在孩子够得着的高度，封面朝外。他能看到什么书，比家里有多少书更重要。一个低矮的、封面朝外的小书架，比顶天立地的大书柜对孩子更友好',
        '有一个属于他的阅读角：不需要多大，一个角落、一个软垫、一盏小灯就够了。当孩子有了"我的读书地方"，阅读就多了一层归属感',
        '大人自己也在读书：这一条比所有方法都重要。如果孩子看到的是你在刷手机，你说一百遍"读书好"也没用。但如果他看到你窝在沙发上看书——不用说话，他已经在学了',
        '自由阅读的时间：克拉生说，给孩子一段完全自由的阅读时间——不考试、不评价、不要求。就是安安静静地各读各的。这段时间的价值，比任何阅读课都大',
        '把书变成日常的一部分：去超市路过书店，进去逛逛；下雨天不知道干嘛，拿本书出来；等餐的时候，包里掏出一本绘本。当阅读融入日常，它就不再是"要完成的任务"了',
        '睡前故事是最强的阅读仪式：每天临睡前的那段故事时间，是很多孩子最期待的时刻。不要轻易取消它，也不要把它当作"表现好才有"的奖赏',
        '别在阅读环境里放电子产品：阅读角旁边如果放着iPad，书的吸引力永远比不过屏幕。不是不让孩子用电子产品，而是给阅读留一个"不被打扰"的空间',
        '兴趣比"该读什么"重要：孩子只爱看车的绘本？没关系。只爱看恐龙？也没关系。克拉生的研究表明，入口不重要，重要的是他在读、他快乐。兴趣会自己扩展',
        '图书馆是最好的阅读环境：定期带孩子去图书馆，让他自己选书、自己翻。图书馆的氛围本身就在说：书是好东西，读书是一件自然的事'
      ]
    },
    {
      source: '阅读身份与内驱力（米勒《书语者》/ 克拉生《阅读的力量》）',
      focus: '让孩子觉得"我是一个爱读书的人"比读了多少本更重要',
      methods: [
        '阅读身份比阅读技巧重要：一个觉得"我是爱读书的人"的孩子，会自己去找书读。一个被逼着读书的孩子，离开监督就不读了。目标不是"让他读"，而是"让他想读"',
        '选择权是内驱力的起点：让孩子自己选书——哪怕选了你觉得"没营养"的。当他感受到"我可以决定读什么"，阅读就从被动变成了主动',
        '弃书权同样重要：读了二十页不想读了？放下就好。大人看剧也会弃剧，为什么要求孩子每本书都读完？保护阅读的胃口比读完任何一本书都重要',
        '记录带来成就感：不需要写读后感，就是简单地记下"今天读了什么"。一个月后翻看记录——"原来我读了这么多！"这种成就感是阅读习惯最好的燃料',
        '不要用阅读作为奖惩工具："你表现好才给你读故事"/"不听话就没有睡前故事了"——这会让孩子觉得阅读是"好处"而不是"日常"。阅读应该像吃饭喝水一样自然',
        '夸对地方：不要夸"你真棒，读了一本书"。可以说"你注意到了一个很有趣的细节"或者"你这个问题问得真好"。关注过程和思考，而不是读了多少',
        '同伴的力量：如果幼儿园的好朋友也在读某本书，孩子的兴趣会翻倍。可以和其他家庭一起共读，或者让孩子给弟弟妹妹"讲书"——角色转换会带来全新的动力',
        '不和别人比：别人家的孩子三岁认字一千个，你家孩子三岁还在撕书——没关系。每个孩子走向阅读的路径不同，快慢不重要，方向对就行',
        '阅读不是只有"正经书"才算：翻翻书、洞洞书、立体书、甚至超市的宣传单——对幼儿来说，一切与"翻看""指认""讨论"相关的行为，都是阅读的一部分',
        '播下种子，耐心等待：有的孩子两岁就爱上书，有的五岁才开始对书感兴趣。米勒说，关键不是孩子什么时候爱上阅读，而是在他准备好之前，有没有人一直在旁边默默地读给他听'
      ]
    }
  ];
  const randomToddlerSystem = toddlerMethodSystems[Math.floor(Math.random() * toddlerMethodSystems.length)];
  const randomToddlerMethod = randomToddlerSystem.methods[Math.floor(Math.random() * randomToddlerSystem.methods.length)];

  // 小学段方法论体系（多本阅读指导书，按核心理念分组）
  const readingMethodSystems = [
    {
      source: '《小学生如何阅读一本小说》',
      focus: '用具体策略拆解一本书，让孩子从"读过"变成"读懂"',
      methods: [
        '预测法：翻开书之前先看封面和标题，猜猜"这会是一个什么样的故事？"读到一半停下来，猜猜"接下来会怎样？"猜对了开心，猜错了更有趣——原来作者比我还会编',
        '提问法：读的时候随时冒出"为什么"就对了。"为什么主角非要去冒险？""作者为什么把这一段写得这么慢？"每一个问题，都是孩子在和书真正对话',
        '联结法：读到主角搬家很难过，就问孩子"你转学那次是不是也这样？"把书里的事和自己的经历连起来，书就不再是"别人的故事"了，变成了"我也懂"的共鸣',
        '画面感：读到"森林里雾蒙蒙的"，停下来闭上眼——你看到什么颜色？闻到什么味道？脚踩在什么上面？文字变成脑海里的电影，故事就活了，也记得住了',
        '人物追踪：拿张纸，把主角在故事开头、中间、结尾的样子画下来或写下来。你会发现，最好的故事里，主角一定是变了的——胆小变勇敢，自私变善良。这个变化，就是故事的灵魂',
        '情节地图：故事就像爬山——起因是出发，发展是上坡，高潮是山顶，结局是下山。让孩子画出这座"山"，故事的骨架一下就看清了，概括能力也练了'
      ]
    },
    {
      source: '《朗读手册》（吉姆·崔利斯）',
      focus: '朗读是最简单、最直接、最有效的教育方式',
      methods: [
        '亲子朗读：每天给孩子读十五分钟书，比花一万块报阅读班管用。你的声音、你的停顿、你的表情，都是孩子理解文字最好的脚手架',
        '听读先行：孩子的耳朵比眼睛走得快。一个7岁孩子可能只能自己读懂二年级的书，但他能听懂五年级的故事。朗读，就是在帮孩子的理解力"超前体验"',
        '朗读仪式：每天晚上八点，客厅的灯调暗一点，窝在沙发里，翻开书。不用很久，十五分钟就好。当这个时刻变成"我们家的习惯"，孩子会开始期待它',
        '从读给他听到他读给你听：小时候你读他听，慢慢地，他开始抢着读角色对话，再后来他自己捧着书不撒手了。这个过渡不用刻意，他准备好了，自然就发生了',
        '语感是读出来的：为什么有的孩子写作文语言很顺，有的磕磕绊绊？秘密就是"耳朵里存了多少好句子"。经常听好的语言，写的时候就有感觉了',
        '万物皆可读：路过一块牌子，读一读；超市里的商品包装，念一念；菜谱上的步骤，一起读出来。阅读不只是坐下来翻书这一种样子'
      ]
    },
    {
      source: '《书语者》（多纳琳·米勒）',
      focus: '每个孩子都可以成为"读书的人"，关键是让他自己相信这一点',
      methods: [
        '阅读身份：比起"读了哪本书"，更重要的是让孩子在心里觉得"我是一个爱读书的人"。这个身份一旦建立，他会自己去找书读。怎么建立？从"你读了多少"开始记录',
        '选书自由：让孩子自己逛书店、自己选书，哪怕他选了你觉得"太简单"的。自己选的书，读完的概率高三倍。强塞过来的经典，大概率在书包里吃灰',
        '轻量阅读记录：不用写读后感，不用摘抄好词好句。就一个本子，写上日期、书名、读到第几页、一句话感受。没压力，能坚持，积累的成就感是真实的',
        '40本书挑战：一年读40本书，听起来吓人？其实一周不到一本。关键是让孩子看到"我居然读了这么多"的惊喜感。量变引起质变，读的多了，品味自然就上来了',
        '弃书权：一本书读了三十页还是不想读？放下，换一本。大人追剧也会弃剧嘛。保护阅读的胃口，比啃完一本不喜欢的书重要一百倍',
        '阅读社区：孩子之间聊"你最近读了什么好书"比大人推荐管用多了。建一个小小的读书群、搞一次书籍交换会，让阅读变成一种社交货币'
      ]
    },
    {
      source: '《打造儿童阅读环境》（艾登·钱伯斯）',
      focus: '好的阅读不是教出来的，是"泡"出来的——环境、氛围、对话缺一不可',
      methods: [
        '阅读环境：沙发角落放个软垫，旁边摆一排书，再搭一盏暖灯。不用特别布置，关键是让书"随手可拿"。家里到处都能碰到书的孩子，阅读量是普通孩子的好几倍',
        '书话（Booktalk）：晚饭时大人随口说一句"我今天读到一本书，里面有个特别有意思的人……"，比说一百遍"去读书"有用。孩子需要看到大人也在读，而且读得津津有味',
        '阅读圈：三五个孩子选同一本书，各自读完后坐在一起聊。不是老师主持，不用回答问题，就是分享"我觉得最好玩/最讨厌/最没想到的部分"。读书这件事，一群人做比一个人有趣',
        '回应式讨论：别问"这本书的中心思想是什么"，换成"有没有哪个地方让你特别想说点什么？"。前者是考试，后者是聊天。孩子的思考在聊天里才能真正打开',
        '再读的价值：第一次读是读情节——"然后呢？然后呢？"第二次读才发现那些被忽略的细节——"原来这里就已经埋了伏笔！"好书值得反复读，每次都有新发现',
        '阅读的仪式感：每周五是"家庭读书夜"，每人选一本书，各读各的，中间分享一段。或者每月一次书店探险，预算内自己选书。当阅读和愉快的体验绑在一起，它就不再是任务了'
      ]
    },
    {
      source: '《阅读的力量》（斯蒂芬·克拉生）',
      focus: '大量的、自由的、快乐的阅读，本身就是最好的语文课',
      methods: [
        '自由自主阅读（FVR）：给孩子一段什么都不用做的时间——不考试、不写报告、不做笔记——就是安安静静读自己想读的书。研究证明，坚持FVR的孩子，阅读能力、写作能力、词汇量全面胜出',
        '兴趣驱动：孩子只爱看漫画？没关系。只爱看科普？也没关系。阅读的入口不重要，重要的是"他在读"。从漫画到小说，从科普到文学，兴趣会自己带路',
        '轻松阅读的力量：别小看那些"太简单"的书。大量读轻松的、能流畅阅读的书，是建立阅读自信和阅读速度的基础。就像学游泳，先在浅水区扑腾够了，才敢去深水区',
        '环境比说教重要：家里客厅有书架、卧室有书、卫生间都放着一本杂志——这个环境的力量，远远胜过"你要多读书"这句话。看得到书的孩子，才会拿起书',
        '不考试的阅读：读完一本书，第一句就问"学到了什么？写个读后感"——恭喜你，孩子对下一本书的兴趣又少了一分。阅读的快乐一旦和考试挂钩，就很难纯粹了',
        '阅读是习得的，不是教出来的：没有人是通过"学习阅读技巧"变成爱读书的人的。泡在书堆里，被好故事吸引着、裹挟着往前走，读着读着，能力就来了'
      ]
    },
    {
      source: '《如何阅读一本书》（莫提默·艾德勒）',
      focus: '阅读有层次，从"读完"到"读透"是不同的段位',
      methods: [
        '检视阅读：拿到一本新书，别急着翻第一页。先看封面、目录、序言，翻翻每章的开头和结尾。五分钟之内，你就能判断"这本书大概在说什么"。这个习惯能帮孩子省下很多读错书的时间',
        '分析阅读：读完之后，试着用一句话概括"这本书到底在讲什么"。如果说不出来，说明读是读了，但还没真正消化。能用自己的话说出来，才算读懂了',
        '四个基本问题：读任何一本书，都可以问这四个问题——这本书在说什么？是怎么说的？说得对吗？跟我有什么关系？教孩子带着这四个问题去读，阅读质量马上不一样',
        '主题阅读：孩子对恐龙着迷？太好了。找五本关于恐龙的书，对比着读——这本说恐龙灭绝是因为陨石，那本说是火山。不同观点碰在一起，批判思维就萌芽了',
        '分层理解：一本好书至少有三层意思——字面上说了什么，背后想表达什么，跟我的生活有什么关系。第一遍读到第一层就够了，等积累多了，再去探第二层、第三层',
        '做一个有要求的读者：不是所有书都值得同样认真地读。有些书翻翻就够了，有些书值得逐字逐句细读。教孩子分辨"这本书值得我花多少力气"，这本身就是一种重要的阅读能力'
      ]
    },
    {
      source: '《整本书阅读》（课标实践）',
      focus: '从碎片阅读到完整阅读体验，培养深度阅读能力',
      methods: [
        '我的阅读档案：不是概括"这本书讲了什么"，而是记录三件事——"我最大的发现""我最大的困惑""我联想到了什么"。关注自己的感受比复述情节有意思多了',
        '人物小传：给书中最喜欢的角色写一份"简历"——名字、性格、经历过什么、最后变成了什么样的人。写完你会发现，这个角色比你以为的更复杂、更真实',
        '故事改写：如果让你当作者，你会怎么改结局？如果从反派的视角重讲这个故事，会是什么样的？这不只是写作练习，更是让孩子理解"每个故事都可以有不同的讲法"',
        '跨学科联读：读《海底两万里》可以连着海洋生物、潜水艇发展史一起聊；读《草房子》可以聊农村生活和童年。一本书就是一扇窗，窗外的风景远比故事本身大得多',
        '阅读时间线：拿一张长纸条，把故事里的事件按时间顺序排出来——先发生了什么，然后发生了什么，最后怎样了。故事的结构一下就看清了，孩子下次写作文，也知道怎么安排顺序了',
        '思维导图：用一张图把整本书"装"进去——主角在中间，分支是事件、人物关系、主题。画完之后退一步看看，整本书的脉络尽在眼前，而画的过程本身就是在深度思考'
      ]
    },
    {
      source: '《阅读力：文学作品的阅读策略》（阿德里安娜·吉尔）',
      focus: '教孩子像"文学侦探"一样读故事，读出文字背后的深意',
      methods: [
        '转变思维：好的读者不只是在"看故事发生了什么"，而是在想"作者为什么要这样写"。这个转变很关键——从被动跟着情节走，到主动思考作者的意图，阅读的深度完全不同',
        '推断能力：作者不会把所有事情都写出来。"他低下了头"——作者没说他难过，但你读出来了。教孩子发现文字"没说出口的话"，就是在培养推断能力，这是高级阅读的核心技能',
        '综合归纳：读完一段或一章，停下来想想"到目前为止，我对这个故事的理解是什么？"。随着阅读推进，理解会不断变化——这种"边读边更新理解"的能力，比读完再总结有用得多',
        '分析作者的写作手法：为什么作者要用"暴风雨"这个场景？为什么这段话特别短、节奏特别快？当孩子开始注意"作者是怎么做到的"，他就不只是读者了，也是学习者了',
        '与文本的深度对话：读到一个情节，不只是"然后呢"，而是"如果是我，我会怎么做？""我同意作者的安排吗？"把自己放进故事里，阅读就从旁观变成了参与',
        '主题探索：一本书的主题不会写在封面上，需要读者自己去"找"。同样一本书，不同的人读出不同的主题，都是对的。引导孩子去思考"这本书到底在说什么"，而不是给他一个标准答案'
      ]
    },
    {
      source: '《阅读力：信息类文本的阅读策略》（阿德里安娜·吉尔）',
      focus: '不只是读故事，科普、说明文、新闻也需要阅读策略',
      methods: [
        '信息类文本也需要策略：很多孩子读故事书没问题，一碰到科普书、说明文就头疼。因为读信息类文本需要不同的"脑回路"——不是跟着情节走，而是提取、组织、记住关键信息',
        '文本特征导航：科普书里的粗体字、小标题、图表、侧边栏，这些不是装饰，是"路标"。教孩子先看这些"路标"再读正文，就像看地图再上路，不容易迷路',
        '确定重要信息：一篇文章那么多内容，哪些是最重要的？帮孩子区分"作者觉得重要的"和"我觉得有趣的"，这两个经常不一样，而两个都值得关注',
        '质疑与求证：读到"蚂蚁可以举起自身体重50倍的东西"——真的吗？好的读者不会照单全收，会想想"这个信息可靠吗？我在别的地方也看到过吗？"。批判性阅读从信息类文本开始练最合适',
        '做笔记和整理：读科普书不能像读小说那样一口气读完。停下来，用自己的话概括一段话的意思；画个简单的表格对比信息——主动整理过的知识，才能真正记住',
        '从文本到生活：读了关于环保的文章，看看自家垃圾分类做得怎么样；读了关于天气的知识，明天抬头看看云是什么形状的。信息类阅读最好的归宿是"用起来"'
      ]
    },
    {
      source: '《说来听听：儿童、阅读与讨论》（艾登·钱伯斯）',
      focus: '阅读之后的讨论，才是理解真正发生的地方',
      methods: [
        '三种分享：钱伯斯说阅读讨论有三个层次——"我喜欢的""我不喜欢的""我困惑的"。不要上来就问"这本书讲了什么道理"，先从最简单的感受聊起，孩子的话匣子才能打开',
        '没有错误的回答：讨论不是考试，没有标准答案。"我觉得大灰狼也挺可怜的"——这个回答很好，因为孩子在思考。接住他的话，追问一句"为什么这样想？"就够了',
        '说来听听：当孩子说"我不喜欢这本书"，不要急着反驳。温柔地说一句"说来听听？"，然后认真听。这四个字比任何阅读技巧都管用——它传递的是"你的想法我在乎"',
        '从感受到思考：先聊"你读的时候什么感觉？"再聊"你觉得为什么会有这种感觉？"最后聊"你觉得作者想让你有这种感觉吗？"。三个问题，从表面感受一步步引向深度思考',
        '同伴讨论的力量：大人问孩子读后感，总有种"被检查"的感觉。但如果是几个孩子围在一起聊，氛围完全不同——"你也觉得那个地方很搞笑？""不是吧，我觉得很感人啊！"分歧和碰撞里，理解在加深',
        '讨论中的沉默：孩子不说话，不代表没在想。有时候一个好问题需要时间消化。给他留出安静思考的空间，比催他"说说你的想法"更有效'
      ]
    },
    {
      source: '《教出阅读力》（柯华葳）',
      focus: '阅读力是可以教的，关键是在对的时机用对的方法',
      methods: [
        '阅读理解的三个层次：字面理解（"故事说了什么"）、推论理解（"为什么会这样"）、评鉴理解（"我觉得怎么样"）。很多孩子卡在第一层，因为没人告诉他后面还有两层。提醒一下就好',
        '识字量不等于阅读力：认识所有的字，不代表读得懂。有的孩子认字很多但读完说不出个所以然——因为他在"解码"而不是在"理解"。阅读力的核心是理解，不是识字',
        '提问是金钥匙：读之前问"你觉得会说什么？"，读的时候问"到现在为止你最大的感觉是？"，读完问"如果你是主角会怎么做？"。三个时间点的三个问题，就把浅阅读变成了深阅读',
        '从"学习阅读"到"通过阅读学习"：低年级的目标是学会阅读，中高年级的目标是通过阅读去学其他东西。这个转折点很关键——如果中年级阅读力没跟上，后面所有科目都会受影响',
        '亲子共读不是读给他听就完了：共读的精髓在"共"——一起看图、一起猜测、一起讨论、一起翻页。不是大人读、孩子听，而是两个人一起参与这个故事',
        '差异化引导：每个孩子的阅读卡点不一样。有的是词汇不够，有的是背景知识缺乏，有的是注意力难集中。别用同一套方法对所有孩子，先观察他"卡在哪"，再针对性地帮'
      ]
    }
  ];
  const randomSystem = readingMethodSystems[Math.floor(Math.random() * readingMethodSystems.length)];
  const randomMethod = randomSystem.methods[Math.floor(Math.random() * randomSystem.methods.length)];
  
  const toddlerTone = toddlerTones[Math.floor(Math.random() * toddlerTones.length)];
  const primaryTone = primaryTones[Math.floor(Math.random() * primaryTones.length)];
  
  const sections = {
    toddler: `
**## 幼儿段 (0-6岁)**
围绕"绘本阅读"和"亲子共读"，创作${count}段各具特色的文案。

**这次的语气是**：${toddlerTone.mood}  
${toddlerTone.hint}

**这次的方法论视角**：${randomToddlerSystem.source}  
核心理念：${randomToddlerSystem.focus}  
具体方法参考：${randomToddlerMethod}

**其他可用的方法（换换口味，别只围着一个方法转）**：
${randomToddlerSystem.methods.map(m => '- ' + m).join('\n')}

**写作心法（怎么把干货写得好读）**：
- **重感受**：不要只讲道理，要写出那个瞬间的氛围——灯光、体温、眼神、一句童言。让读者"看到"画面。
- **去焦虑**：涉及到误区或"不理想"的现象（如撕书、坐不住、只要同一本），语气要特别宽容，传递"这很正常"的安心感。
- **强实操**：给出的建议要小到马上就能做（比如"把书放低一格"、"读之前先看封面"），而不是"多陪孩子读书"这种正确的废话。
- **有节制**：每段只讲透一个点，不要贪多。三五句话说清一件事，比十句话说三件事有力量。
- **通用视角**：用"当孩子..."、"很多家庭会发现..."的普遍视角，严禁编造个人经历。

**排版**：一句一行，读起来有呼吸感  
**篇幅**：大约3-5句话，别太长
`,
    primary: `
**## 小学段**
围绕"阅读习惯与能力提升"，创作${count}段各有特点的文案。

**这次的语气是**：${primaryTone.mood}  
${primaryTone.hint}

**这次的方法论视角**：来自${randomSystem.source}  
核心理念：${randomSystem.focus}  
具体方法参考：${randomMethod}

**其他可用的方法（换换口味，别只围着一个方法转）**：
${randomSystem.methods.map(m => '- ' + m).join('\n')}

**写作心法（怎么把干货写得好读）**：
- **降维度**：把"批判性思维"这种大词，拆解成"多问几个为什么"这种小动作。让家长一看就知道怎么做。
- **给工具**：讲方法时，最好给一个具体的抓手——画一张图、玩一个游戏、问一个问题。抽象的建议不如一个可操作的动作。
- **懂心理**：理解这个阶段孩子对"被教育"的抗拒。站在孩子这边说话，比站在大人这边更有说服力。
- **温和纠偏**：涉及误区时，用"其实可以换个思路"而不是"你错了"。让读者觉得被理解，而不是被批评。
- **有节制**：每段只讲透一个点。四到六句话说清一件事，不贪多、不啰嗦。
- **通用视角**：用"很多孩子会..."、"你可能发现过..."的客观视角，严禁编造个人经历。

**排版**：一句一行，清爽利落  
**篇幅**：大约4-6句话
`
  };
  
  return sections[type];
}

// 生成幼儿段/小学段内容的提示词
function createSegmentPrompt(type: 'toddler' | 'primary', count: number) {
  // 更丰富的创意触发点，与新的书单体系深度匹配
  const toddlerAngles = [
    { theme: '从"图画书的特殊性"切入', example: '比如：文字没讲但图画讲了的故事、翻页带来的惊喜、环衬的秘密' },
    { theme: '从"无用之用"切入', example: '比如：读完没有任何教育意义、只是单纯好笑、孩子要求读第100遍' },
    { theme: '从"身体接触与安全感"切入', example: '比如：把孩子抱在怀里读、听心跳的声音、用手指着图画' },
    { theme: '从"听读的魔力"切入', example: '比如：声音的表情、重复的韵律、孩子闭着眼听' },
    { theme: '从"孩子的主导权"切入', example: '比如：让孩子自己翻页、自己选书、甚至自己编故事' },
    { theme: '从"阅读环境的细节"切入', example: '比如：沙发角的软垫、伸手可及的书架、大人读书的背影' },
    { theme: '从"共读中的对话"切入', example: '比如：孩子突然打断你、指着图问奇怪的问题、读完后的沉默' },
    { theme: '从"放下功利心"切入', example: '比如：不考识字、不问道理、只享受当下的快乐' },
    { theme: '从"选书的智慧"切入', example: '比如：为什么孩子爱读"烂书"、经典绘本好在哪里、不同风格的尝试' },
    { theme: '从"成长的瞬间"切入', example: '比如：第一次自己拿起书、第一次复述故事、第一次因书而笑' }
  ];
  
  const primaryAngles = [
    { theme: '从"阅读的权利"切入', example: '比如：有权不读完、有权读"闲书"、有权重读、有权跳读' },
    { theme: '从"像侦探一样思考"切入', example: '比如：寻找作者的伏笔、推测人物动机、发现文字背后的深意' },
    { theme: '从"聊书的艺术"切入', example: '比如：不问中心思想问感受、分享大人的困惑、允许孩子说"不喜欢"' },
    { theme: '从"非虚构阅读"切入', example: '比如：读科普书的策略、怎么看图表、怎么提取关键信息' },
    { theme: '从"阅读身份认同"切入', example: '比如：建立"我是读书人"的自信、记录阅读足迹、打造个人书单' },
    { theme: '从"朗读的延续"切入', example: '比如：大孩子也需要朗读、家庭朗读会、读出文字的节奏感' },
    { theme: '从"阅读与生活"切入', example: '比如：书里提到的地方想去看看、书里的美食想尝尝、书里的道理解决了现实问题' },
    { theme: '从"深读一本书"切入', example: '比如：画人物关系图、给角色写信、改写结局、跨学科联想' },
    { theme: '从"环境与社群"切入', example: '比如：家庭读书时间、和朋友聊书、逛书店的乐趣' },
    { theme: '从"克服阅读障碍"切入', example: '比如：读不下去怎么办、专注力不够怎么办、只爱看漫画怎么办' }
  ];
  
  const angle = type === 'toddler' 
    ? toddlerAngles[Math.floor(Math.random() * toddlerAngles.length)]
    : primaryAngles[Math.floor(Math.random() * primaryAngles.length)];

  // 使用共享的段落提示词
  const task_description = createSegmentSectionPrompt(type, count);

  return `直接返回纯JSON，不要任何额外说明或代码块标记。

# 角色定位：阅读陪伴者
你不是高高在上的教育专家，也不是虚构的"过来人家长"。
你是一位懂阅读、懂孩子、温暖而专业的陪伴者。你站在家长身边，用平等的视角分享阅读的美好与方法。

# 核心原则：真实与真诚
1. **绝对禁止虚构经历**：严禁使用"我家娃"、"我以前"、"我发现"、"我们家"等第一人称叙述虚构的生活场景。不要扮演一个不存在的家长。
2. **对话视角**：
   - 主要使用第二人称"你"（家长）和"孩子"。
   - 或者使用客观的第三人称视角描述普遍规律。
   - 示例："当孩子读不下去时，你可以试试..."（推荐） vs "我家孩子读不下去时，我用了..."（禁止）

# 语言风格指南
1. **专业但不晦涩**：把专业的阅读理论（如预测、联结）翻译成家长一听就懂的大白话。
2. **建议而非指令**：
   - 避免："你应该"、"必须"、"切记"。
   - 提倡："不妨试试"、"或许可以"、"你会发现"。
3. **温暖而有洞见**：语言要柔软，但要有力量。指出问题的同时，给出充满希望的解决方案。

# 这次可以试试
${angle.theme}  
${angle.example}

# 具体要求
${task_description}

# 注意
- ${count}段文案，每段都要有点不一样的味道
- 不要每段都用同样的句式开头
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

# 角色定位：阅读陪伴者
你不是高高在上的教育专家，也不是虚构的"过来人家长"。
你是一位懂阅读、懂孩子、温暖而专业的陪伴者。你站在家长身边，用平等的视角分享阅读的美好与方法。

# 核心原则：真实与真诚
1. **绝对禁止虚构经历**：严禁使用"我家娃"、"我以前"、"我发现"、"我们家"等第一人称叙述虚构的生活场景。不要扮演一个不存在的家长。
2. **对话视角**：
   - 主要使用第二人称"你"（家长）和"孩子"。
   - 或者使用客观的第三人称视角描述普遍规律。
   - 示例："当孩子读不下去时，你可以试试..."（推荐） vs "我家孩子读不下去时，我用了..."（禁止）

# 语言风格指南
1. **专业但不晦涩**：把专业的阅读理论翻译成家长一听就懂的大白话。
2. **建议而非指令**：
   - 避免："你应该"、"必须"、"切记"。
   - 提倡："不妨试试"、"或许可以"、"你会发现"。
3. **温暖而有洞见**：语言要柔软，但要有力量。指出问题的同时，给出充满希望的解决方案。

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
