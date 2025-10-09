"use client"

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  History as HistoryIcon,
  Trash2,
  Calendar,
  Copy,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getHistory, deleteHistoryItem, clearHistory, HistoryItem, getStorageUsage } from '@/lib/storage';

interface HistoryPanelProps {
  mode: 'morning' | 'toddler' | 'primary' | 'quote';
  onRestoreContent?: (item: HistoryItem) => void;
}

export default function HistoryPanel({ mode, onRestoreContent }: HistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [storageUsage, setStorageUsage] = useState({ used: 0, percentage: '0' });
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 模式配置
  const modeConfig = {
    morning: {
      title: '早安语历史记录',
      description: '查看之前生成的早安语内容',
      color: 'orange',
    },
    toddler: {
      title: '幼儿段历史记录',
      description: '查看之前生成的幼儿段内容',
      color: 'rose',
    },
    primary: {
      title: '小学段历史记录',
      description: '查看之前生成的小学段内容',
      color: 'sky',
    },
    quote: {
      title: '名人名言历史记录',
      description: '查看之前生成的名人名言内容',
      color: 'purple',
    },
  };

  const config = modeConfig[mode];

  // 加载历史记录（仅当前模式）
  const loadHistory = () => {
    const allItems = getHistory();
    const filteredItems = allItems.filter(item => item.type === mode);
    setHistoryItems(filteredItems);
    setStorageUsage(getStorageUsage());
  };

  // 打开对话框时加载数据
  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, mode]);

  // 删除单条记录
  const handleDeleteItem = (id: string) => {
    if (confirm('确定要删除这条历史记录吗？')) {
      deleteHistoryItem(id);
      loadHistory();
    }
  };

  // 清空当前模式的所有记录
  const handleClearAll = () => {
    if (confirm(`确定要清空所有${config.title}吗？此操作不可恢复。`)) {
      historyItems.forEach(item => deleteHistoryItem(item.id));
      loadHistory();
    }
  };

  // 复制文案
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

  // 复制所有内容
  const handleCopyAll = async (item: HistoryItem) => {
    try {
      let textToCopy = '';
      
      if (item.type === 'morning' && Array.isArray(item.data)) {
        item.data.forEach((dateItem: any, index: number) => {
          textToCopy += `【${format(new Date(dateItem.date), 'yyyy年MM月dd日')}】\n\n`;
          dateItem.content.morning_copies.forEach((copy: string, i: number) => {
            textToCopy += `${i + 1}. ${copy}\n\n`;
          });
          if (index < item.data.length - 1) textToCopy += '\n---\n\n';
        });
      } else if (item.data?.content?.copies) {
        item.data.content.copies.forEach((copy: string, i: number) => {
          textToCopy += `${i + 1}. ${copy}\n\n`;
        });
      }
      
      await navigator.clipboard.writeText(textToCopy);
      setCopiedStates(prev => ({ ...prev, [`all_${item.id}`]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [`all_${item.id}`]: false }));
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 格式化时间
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) {
      return '刚刚';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} 分钟前`;
    } else if (diffInHours < 24) {
      return `${diffInHours} 小时前`;
    } else if (diffInDays < 7) {
      return `${diffInDays} 天前`;
    } else {
      return format(date, 'yyyy年MM月dd日 HH:mm', { locale: zhCN });
    }
  };

  // 格式化存储大小
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // 切换展开/收起
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 渲染内容详情（默认展开，网格布局）
  const renderContentDetail = (item: HistoryItem) => {
    if (item.type === 'morning' && Array.isArray(item.data)) {
      return (
        <div className="space-y-4">
          {item.data.map((dateItem: any, dateIndex: number) => (
            <div key={dateIndex} className="bg-gray-100 rounded-lg p-4 border border-gray-300">
              <div className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {format(new Date(dateItem.date), 'yyyy年MM月dd日')} · {dateItem.context.weekday}
                {dateItem.context.solarTerm && ` · ${dateItem.context.solarTerm}`}
                {dateItem.context.festival && ` · ${dateItem.context.festival}`}
              </div>
              {/* 历史记录文案显示（字体更小） */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {dateItem.content.morning_copies.map((copy: string, copyIndex: number) => (
                  <div key={copyIndex} className="bg-white p-3 rounded-md shadow-sm border border-gray-300 relative group">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-brand-blue-700">早安语 #{copyIndex + 1}</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm mb-2">{copy}</p>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleCopyText(copy, `${item.id}_${dateIndex}_${copyIndex}`)}
                      >
                        {copiedStates[`${item.id}_${dateIndex}_${copyIndex}`] ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    } else if (item.data?.content?.copies) {
      // 统一使用灰色系
      return (
        <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
          {/* 历史记录文案显示（字体更小） */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {item.data.content.copies.map((copy: string, copyIndex: number) => (
              <div key={copyIndex} className="bg-white p-3 rounded-md shadow-sm border border-gray-300 relative group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-brand-blue-700">
                    {item.type === 'quote' ? '名人名言' : '专业指导'} #{copyIndex + 1}
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm mb-2">{copy}</p>
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleCopyText(copy, `${item.id}_${copyIndex}`)}
                  >
                    {copiedStates[`${item.id}_${copyIndex}`] ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <HistoryIcon className="w-4 h-4" />
          历史记录
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-[95vw] w-[1400px] p-0 gap-0"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          position: 'fixed'
        }}
      >
        <div className="flex flex-col max-h-[90vh] overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <HistoryIcon className="w-5 h-5" />
              {config.title}
            </DialogTitle>
            <DialogDescription>
              {config.description}
            </DialogDescription>
          </DialogHeader>

          {/* 内容区域 */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-6 py-4">
              {historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <HistoryIcon className="w-16 h-16 mb-4" />
                  <p className="text-lg">暂无历史记录</p>
                  <p className="text-sm mt-2">生成内容后会自动保存在这里</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {historyItems.map((item) => {
                    const isExpanded = expandedItems.has(item.id);
                    
                    return (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
                      >
                        {/* 头部信息 */}
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer"
                          onClick={() => toggleExpand(item.id)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              )}
                            </Button>
                            <span className="text-sm font-medium text-gray-900">{item.preview}</span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-500">{formatTimestamp(item.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => handleCopyAll(item)}
                            >
                              {copiedStates[`all_${item.id}`] ? (
                                <>
                                  <Check className="w-3 h-3 mr-1 text-green-600" />
                                  已复制
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 mr-1" />
                                  复制全部
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteItem(item.id)}
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* 内容详情（可展开/收起） */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-100">
                            <div className="pt-4">
                              {renderContentDetail(item)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* 页脚 */}
          <div className="border-t border-gray-200 px-6 py-4 shrink-0 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  共 <span className="font-medium text-gray-900">{historyItems.length}</span> 条记录
                </span>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>存储使用: {formatBytes(storageUsage.used)} ({storageUsage.percentage}%)</span>
                </div>
              </div>
              <div className="flex gap-2">
                {historyItems.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    清空全部
                  </Button>
                )}
                <Button variant="default" size="sm" onClick={() => setOpen(false)}>
                  关闭
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

