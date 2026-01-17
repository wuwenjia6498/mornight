/**
 * 数据持久化工具库
 * 使用 localStorage 实现浏览器本地存储，解决页面刷新后数据丢失的问题
 */

// 存储键名常量
const STORAGE_KEYS = {
  MORNING_CONTENTS: 'mornight_morning_contents',
  TODDLER_CONTENT: 'mornight_toddler_content',
  PRIMARY_CONTENT: 'mornight_primary_content',
  QUOTE_MORNING_CONTENT: 'mornight_quote_morning_content',
  QUOTE_TODDLER_CONTENT: 'mornight_quote_toddler_content',
  QUOTE_PRIMARY_CONTENT: 'mornight_quote_primary_content',
  PICTUREBOOK_MINIMALIST_CONTENT: 'mornight_picturebook_minimalist_content',
  PICTUREBOOK_CHILDVIEW_CONTENT: 'mornight_picturebook_childview_content',
  PICTUREBOOK_PHILOSOPHY_CONTENT: 'mornight_picturebook_philosophy_content',
  PICTUREBOOK_NATURE_CONTENT: 'mornight_picturebook_nature_content',
  HISTORY: 'mornight_generation_history',
} as const;

// 历史记录项接口
export interface HistoryItem {
  id: string;
  timestamp: number;
  type: 'morning' | 'toddler' | 'primary' | 'quote' | 'picturebook';
  data: any;
  preview: string; // 用于显示的预览文本
}

/**
 * 安全地保存数据到 localStorage
 */
export function saveToStorage<T>(key: string, data: T): boolean {
  try {
    const jsonString = JSON.stringify(data);
    localStorage.setItem(key, jsonString);
    return true;
  } catch (error) {
    console.error('保存到本地存储失败:', error);
    // 处理存储空间不足等错误
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      alert('本地存储空间不足，请清理一些历史记录');
    }
    return false;
  }
}

/**
 * 从 localStorage 读取数据
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const jsonString = localStorage.getItem(key);
    if (jsonString === null) {
      return defaultValue;
    }
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('从本地存储读取失败:', error);
    return defaultValue;
  }
}

/**
 * 从 localStorage 删除数据
 */
export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('从本地存储删除失败:', error);
  }
}

/**
 * 清空所有应用数据
 */
export function clearAllStorage(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('清空本地存储失败:', error);
  }
}

/**
 * 保存早安语内容
 */
export function saveMorningContents(contents: any[]): void {
  saveToStorage(STORAGE_KEYS.MORNING_CONTENTS, contents);
  
  // 同时添加到历史记录
  if (contents.length > 0) {
    const preview = `生成了 ${contents.length} 条早安语（${contents[0].date}${contents.length > 1 ? ` 等 ${contents.length} 个日期` : ''}）`;
    addToHistory('morning', contents, preview);
  }
}

/**
 * 加载早安语内容
 */
export function loadMorningContents(): any[] {
  return loadFromStorage(STORAGE_KEYS.MORNING_CONTENTS, []);
}

/**
 * 保存幼儿段内容
 */
export function saveToddlerContent(content: any): void {
  saveToStorage(STORAGE_KEYS.TODDLER_CONTENT, content);
  
  if (content && content.content?.copies) {
    const preview = `生成了 ${content.content.copies.length} 条幼儿段文案`;
    addToHistory('toddler', content, preview);
  }
}

/**
 * 加载幼儿段内容
 */
export function loadToddlerContent(): any {
  return loadFromStorage(STORAGE_KEYS.TODDLER_CONTENT, null);
}

/**
 * 保存小学段内容
 */
export function savePrimaryContent(content: any): void {
  saveToStorage(STORAGE_KEYS.PRIMARY_CONTENT, content);
  
  if (content && content.content?.copies) {
    const preview = `生成了 ${content.content.copies.length} 条小学段文案`;
    addToHistory('primary', content, preview);
  }
}

/**
 * 加载小学段内容
 */
export function loadPrimaryContent(): any {
  return loadFromStorage(STORAGE_KEYS.PRIMARY_CONTENT, null);
}

/**
 * 保存名人名言内容（早安语场景）
 */
export function saveQuoteMorningContent(content: any): void {
  saveToStorage(STORAGE_KEYS.QUOTE_MORNING_CONTENT, content);
  
  if (content && content.content?.copies) {
    const preview = `生成了 ${content.content.copies.length} 条名人名言（早安语场景）`;
    addToHistory('quote', content, preview);
  }
}

/**
 * 加载名人名言内容（早安语场景）
 */
export function loadQuoteMorningContent(): any {
  return loadFromStorage(STORAGE_KEYS.QUOTE_MORNING_CONTENT, null);
}

/**
 * 保存名人名言内容（幼儿段场景）
 */
export function saveQuoteToddlerContent(content: any): void {
  saveToStorage(STORAGE_KEYS.QUOTE_TODDLER_CONTENT, content);
  
  if (content && content.content?.copies) {
    const preview = `生成了 ${content.content.copies.length} 条名人名言（幼儿段场景）`;
    addToHistory('quote', content, preview);
  }
}

/**
 * 加载名人名言内容（幼儿段场景）
 */
export function loadQuoteToddlerContent(): any {
  return loadFromStorage(STORAGE_KEYS.QUOTE_TODDLER_CONTENT, null);
}

/**
 * 保存名人名言内容（小学段场景）
 */
export function saveQuotePrimaryContent(content: any): void {
  saveToStorage(STORAGE_KEYS.QUOTE_PRIMARY_CONTENT, content);
  
  if (content && content.content?.copies) {
    const preview = `生成了 ${content.content.copies.length} 条名人名言（小学段场景）`;
    addToHistory('quote', content, preview);
  }
}

/**
 * 加载名人名言内容（小学段场景）
 */
export function loadQuotePrimaryContent(): any {
  return loadFromStorage(STORAGE_KEYS.QUOTE_PRIMARY_CONTENT, null);
}


/**
 * 保存最美绘本语言内容（极简主义）
 */
export function savePictureBookMinimalistContent(content: any): void {
  saveToStorage(STORAGE_KEYS.PICTUREBOOK_MINIMALIST_CONTENT, content);
  
  if (content && content.content?.copies) {
    const preview = `生成了 ${content.content.copies.length} 条绘本语言（极简主义）`;
    addToHistory('picturebook', content, preview);
  }
}

/**
 * 加载最美绘本语言内容（极简主义）
 */
export function loadPictureBookMinimalistContent(): any {
  return loadFromStorage(STORAGE_KEYS.PICTUREBOOK_MINIMALIST_CONTENT, null);
}

/**
 * 保存最美绘本语言内容（儿童视角）
 */
export function savePictureBookChildviewContent(content: any): void {
  saveToStorage(STORAGE_KEYS.PICTUREBOOK_CHILDVIEW_CONTENT, content);
  
  if (content && content.content?.copies) {
    const preview = `生成了 ${content.content.copies.length} 条绘本语言（儿童视角）`;
    addToHistory('picturebook', content, preview);
  }
}

/**
 * 加载最美绘本语言内容（儿童视角）
 */
export function loadPictureBookChildviewContent(): any {
  return loadFromStorage(STORAGE_KEYS.PICTUREBOOK_CHILDVIEW_CONTENT, null);
}

/**
 * 保存最美绘本语言内容（哲理留白）
 */
export function savePictureBookPhilosophyContent(content: any): void {
  saveToStorage(STORAGE_KEYS.PICTUREBOOK_PHILOSOPHY_CONTENT, content);
  
  if (content && content.content?.copies) {
    const preview = `生成了 ${content.content.copies.length} 条绘本语言（哲理留白）`;
    addToHistory('picturebook', content, preview);
  }
}

/**
 * 加载最美绘本语言内容（哲理留白）
 */
export function loadPictureBookPhilosophyContent(): any {
  return loadFromStorage(STORAGE_KEYS.PICTUREBOOK_PHILOSOPHY_CONTENT, null);
}

/**
 * 保存最美绘本语言内容（自然隐喻）
 */
export function savePictureBookNatureContent(content: any): void {
  saveToStorage(STORAGE_KEYS.PICTUREBOOK_NATURE_CONTENT, content);
  
  if (content && content.content?.copies) {
    const preview = `生成了 ${content.content.copies.length} 条绘本语言（自然隐喻）`;
    addToHistory('picturebook', content, preview);
  }
}

/**
 * 加载最美绘本语言内容（自然隐喻）
 */
export function loadPictureBookNatureContent(): any {
  return loadFromStorage(STORAGE_KEYS.PICTUREBOOK_NATURE_CONTENT, null);
}

/**
 * 添加到历史记录
 */
function addToHistory(
  type: 'morning' | 'toddler' | 'primary' | 'quote' | 'picturebook',
  data: any,
  preview: string
): void {
  try {
    const history = loadFromStorage<HistoryItem[]>(STORAGE_KEYS.HISTORY, []);
    
    const newItem: HistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      type,
      data,
      preview,
    };
    
    // 添加到历史记录开头
    history.unshift(newItem);
    
    // 限制历史记录数量，保留最近 50 条
    const trimmedHistory = history.slice(0, 50);
    
    saveToStorage(STORAGE_KEYS.HISTORY, trimmedHistory);
  } catch (error) {
    console.error('添加历史记录失败:', error);
  }
}

/**
 * 获取历史记录
 */
export function getHistory(): HistoryItem[] {
  return loadFromStorage<HistoryItem[]>(STORAGE_KEYS.HISTORY, []);
}

/**
 * 删除单条历史记录
 */
export function deleteHistoryItem(id: string): void {
  try {
    const history = getHistory();
    const filteredHistory = history.filter(item => item.id !== id);
    saveToStorage(STORAGE_KEYS.HISTORY, filteredHistory);
  } catch (error) {
    console.error('删除历史记录失败:', error);
  }
}

/**
 * 清空历史记录
 */
export function clearHistory(): void {
  removeFromStorage(STORAGE_KEYS.HISTORY);
}

/**
 * 获取存储使用情况（估算）
 */
export function getStorageUsage(): { used: number; percentage: string } {
  try {
    let totalSize = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        totalSize += item.length;
      }
    });
    
    // localStorage 通常限制为 5-10MB，这里假设 5MB
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    const percentage = ((totalSize / maxSize) * 100).toFixed(2);
    
    return {
      used: totalSize,
      percentage,
    };
  } catch (error) {
    console.error('获取存储使用情况失败:', error);
    return { used: 0, percentage: '0' };
  }
}

