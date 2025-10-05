declare module 'solarlunar' {
  interface LunarData {
    lYear: number;
    lMonth: number;
    lDay: number;
    Animal: string;
    IMonthCn: string;
    IDayCn: string;
    cYear: number;
    cMonth: number;
    cDay: number;
    gzYear: string;
    gzMonth: string;
    gzDay: string;
    isToday: boolean;
    isLeap: boolean;
    nWeek: number;
    ncWeek: string;
    isTerm: boolean;
    Term: string;
    lunarFestival: string;
    festival: string;
    term?: string;
  }

  function solar2lunar(year: number, month: number, day: number): LunarData;
  function lunar2solar(year: number, month: number, day: number, isLeap?: boolean): LunarData;

  export = {
    solar2lunar,
    lunar2solar
  };
}
