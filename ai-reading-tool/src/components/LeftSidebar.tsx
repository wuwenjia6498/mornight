"use client"

import React from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, X, Clock, Calendar as CalendarIcon, Users, Loader2 } from 'lucide-react';

interface LeftSidebarProps {
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  onGenerateContent: () => void;
  isGenerating?: boolean;
  error?: string | null;
}

export default function LeftSidebar({ 
  selectedDates, 
  onDatesChange, 
  onGenerateContent,
  isGenerating = false,
  error
}: LeftSidebarProps) {
  
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const dateExists = selectedDates.some(selectedDate => 
      selectedDate.toDateString() === date.toDateString()
    );
    
    if (dateExists) {
      // 如果日期已存在，则移除它
      const newDates = selectedDates.filter(selectedDate => 
        selectedDate.toDateString() !== date.toDateString()
      );
      onDatesChange(newDates);
    } else {
      // 如果日期不存在，则添加它
      onDatesChange([...selectedDates, date]);
    }
  };

  const handleRemoveDate = (dateToRemove: Date) => {
    const newDates = selectedDates.filter(date => 
      date.toDateString() !== dateToRemove.toDateString()
    );
    onDatesChange(newDates);
  };

  const clearAllDates = () => {
    onDatesChange([]);
  };

  const selectToday = () => {
    const today = new Date();
    if (!selectedDates.some(date => date.toDateString() === today.toDateString())) {
      onDatesChange([...selectedDates, today]);
    }
  };

  const selectThisWeek = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // 周一开始
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const weekDates = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    // 合并新日期，避免重复
    const newDates = [...selectedDates];
    weekDates.forEach(date => {
      if (!newDates.some(selectedDate => selectedDate.toDateString() === date.toDateString())) {
        newDates.push(date);
      }
    });
    onDatesChange(newDates);
  };

  const selectThisMonth = () => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const monthDates = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // 合并新日期，避免重复
    const newDates = [...selectedDates];
    monthDates.forEach(date => {
      if (!newDates.some(selectedDate => selectedDate.toDateString() === date.toDateString())) {
        newDates.push(date);
      }
    });
    onDatesChange(newDates);
  };

  const formatDate = (date: Date) => {
    return format(date, 'yyyy年MM月dd日');
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto">
      {/* 标题 */}
      <div className="text-xl font-bold text-gray-800 mb-2">
        内容生成控制台
      </div>
      
      {/* 日期选择器卡片 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            选择日期
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 快速选择按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectToday}
              className="text-xs"
              disabled={isGenerating}
            >
              <Clock className="w-3 h-3 mr-1" />
              今天
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={selectThisWeek}
              className="text-xs"
              disabled={isGenerating}
            >
              <CalendarIcon className="w-3 h-3 mr-1" />
              本周
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={selectThisMonth}
              className="text-xs"
              disabled={isGenerating}
            >
              <Users className="w-3 h-3 mr-1" />
              本月
            </Button>
          </div>

          {/* 日历组件 */}
          <Calendar
            mode="single"
            onSelect={handleDateSelect}
            selected={undefined} // 不设置selected，因为我们自己管理多选状态
            className="rounded-md border"
            disabled={isGenerating}
            modifiers={{
              selected: selectedDates
            }}
            modifiersClassNames={{
              selected: 'bg-blue-500 text-white hover:bg-blue-600'
            }}
          />
          
          {/* 选中日期列表 */}
          {selectedDates.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  已选择 {selectedDates.length} 个日期
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllDates}
                  className="text-xs text-gray-500 hover:text-gray-700"
                  disabled={isGenerating}
                >
                  清空全部
                </Button>
              </div>
              
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedDates
                  .sort((a, b) => a.getTime() - b.getTime())
                  .map((date, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs"
                    >
                      <span>
                        {formatDate(date)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDate(date)}
                        className="h-auto p-0.5 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                        disabled={isGenerating}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="text-red-700 text-sm">
              <div className="font-medium mb-1">生成失败</div>
              <div className="text-xs">{error}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 生成按钮 */}
      <div className="mt-auto pt-4">
        <Button
          onClick={onGenerateContent}
          disabled={selectedDates.length === 0 || isGenerating}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              生成内容
              {selectedDates.length > 0 && (
                <span className="ml-2 bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs">
                  {selectedDates.length}
                </span>
              )}
            </>
          )}
        </Button>
        
        {selectedDates.length === 0 && !isGenerating && (
          <p className="text-xs text-gray-500 text-center mt-2">
            请先选择至少一个日期
          </p>
        )}
        
        {isGenerating && (
          <p className="text-xs text-blue-600 text-center mt-2">
            正在为 {selectedDates.length} 个日期生成内容...
          </p>
        )}
      </div>
    </div>
  );
} 