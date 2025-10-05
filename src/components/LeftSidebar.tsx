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
    <div className="w-[420px] bg-gray-50 border-r border-gray-200 p-6 flex flex-col gap-5 overflow-y-auto">
      
      {/* 日期选择器卡片 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-gray-700 flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            选择日期
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 快速选择按钮 */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={selectToday}
              className="text-sm px-4"
              disabled={isGenerating}
            >
              <Clock className="w-4 h-4 mr-2" />
              今天
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={selectThisWeek}
              className="text-sm px-4"
              disabled={isGenerating}
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              本周
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={selectThisMonth}
              className="text-sm px-4"
              disabled={isGenerating}
            >
              <Users className="w-4 h-4 mr-2" />
              本月
            </Button>
          </div>

          {/* 日历组件 */}
          <Calendar
            mode="single"
            onSelect={handleDateSelect}
            selected={undefined} // 不设置selected，因为我们自己管理多选状态
            className="rounded-md border w-full"
            disabled={isGenerating}
            modifiers={{
              selected: selectedDates
            }}
            modifiersClassNames={{
              selected: 'bg-brand-blue-100 text-brand-blue-700 hover:bg-brand-blue-200'
            }}
          />
          
          {/* 选中日期列表 */}
          {selectedDates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  已选择 {selectedDates.length} 个日期
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllDates}
                  className="text-sm text-gray-500 hover:text-gray-700"
                  disabled={isGenerating}
                >
                  清空全部
                </Button>
              </div>
              
              <div className="max-h-40 overflow-y-auto space-y-2">
                {selectedDates
                  .sort((a, b) => a.getTime() - b.getTime())
                  .map((date, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-brand-blue-50 text-brand-blue-700 px-3 py-2 rounded-lg text-sm"
                    >
                      <span>
                        {formatDate(date)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDate(date)}
                        className="h-auto p-1 text-brand-blue-700 hover:text-brand-blue-700 hover:bg-brand-blue-100"
                        disabled={isGenerating}
                      >
                        <X className="w-4 h-4" />
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
          <CardContent className="pt-5">
            <div className="text-red-700">
              <div className="font-medium mb-2 text-base">生成失败</div>
              <div className="text-sm">{error}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 生成按钮 */}
      <div className="mt-auto pt-5">
        <Button
          onClick={onGenerateContent}
          disabled={selectedDates.length === 0 || isGenerating}
          className="w-full bg-brand-blue-600 hover:bg-brand-blue-700 text-white font-medium text-base py-3"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              生成内容
              {selectedDates.length > 0 && (
                <span className="ml-2 bg-brand-blue-500 text-white px-3 py-1 rounded-full text-sm">
                  {selectedDates.length}
                </span>
              )}
            </>
          )}
        </Button>
        
        {selectedDates.length === 0 && !isGenerating && (
          <p className="text-sm text-gray-500 text-center mt-3">
            请先选择至少一个日期
          </p>
        )}
        
        {isGenerating && (
          <p className="text-sm text-brand-blue-600 text-center mt-3">
            正在为 {selectedDates.length} 个日期生成内容...
          </p>
        )}
      </div>
    </div>
  );
} 