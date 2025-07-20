/**
 * TODO-LIST Application - Utility Functions
 * 
 * Copyright (c) 2025 taeyoon0526
 * Licensed under Shared Source License
 * 
 * This software is provided for viewing and educational purposes only.
 * Modification, redistribution, and commercial use are prohibited.
 * See LICENSE file for full terms and conditions.
 */

// scripts/utils.js
// Day.js 플러그인 설정
dayjs.extend(dayjs_plugin_utc);
dayjs.extend(dayjs_plugin_timezone);
dayjs.extend(dayjs_plugin_relativeTime);

/**
 * 마감일까지의 D-Day를 계산하는 함수
 * @param {string} dueDate - ISO 형식의 마감일 문자열
 * @returns {string} D-Day 문자열 (예: "D-3", "D-Day", "D+2")
 */
export function getDDay(dueDate) {
  if (!dueDate) return '';
  
  try {
    const due = dayjs.utc(dueDate);
    const today = dayjs.utc().startOf('day');
    const dueDay = due.startOf('day');
    
    const diffDays = dueDay.diff(today, 'day');
    
    if (diffDays > 0) {
      return `D-${diffDays}`;
    } else if (diffDays === 0) {
      return 'D-Day';
    } else {
      return `D+${Math.abs(diffDays)}`;
    }
  } catch (error) {
    console.error('날짜 계산 오류:', error);
    return '';
  }
}

/**
 * 로컬 날짜를 UTC ISO 형식으로 변환
 * @param {string} localDate - YYYY-MM-DD 형식의 로컬 날짜
 * @returns {string} UTC ISO 형식 문자열
 */
export function convertToUTCISO(localDate) {
  if (!localDate) return null;
  
  try {
    // 로컬 날짜를 UTC로 변환 (시간은 00:00:00으로 설정)
    const utcDate = dayjs(localDate).utc().startOf('day');
    return utcDate.toISOString();
  } catch (error) {
    console.error('UTC 변환 오류:', error);
    return null;
  }
}

/**
 * UTC ISO 형식을 로컬 날짜 형식으로 변환
 * @param {string} utcISO - UTC ISO 형식 문자열
 * @returns {string} YYYY-MM-DD 형식의 로컬 날짜
 */
export function convertFromUTCISO(utcISO) {
  if (!utcISO) return '';
  
  try {
    return dayjs.utc(utcISO).format('YYYY-MM-DD');
  } catch (error) {
    console.error('로컬 날짜 변환 오류:', error);
    return '';
  }
}

/**
 * D-Day 뱃지의 클래스명을 반환하는 함수
 * @param {string} ddayText - getDDay()에서 반환된 D-Day 문자열
 * @returns {string} CSS 클래스명
 */
export function getDDayClass(ddayText) {
  if (!ddayText) return '';
  
  if (ddayText === 'D-Day') {
    return 'dday-today';
  } else if (ddayText.startsWith('D+')) {
    return 'dday-overdue';
  } else if (ddayText.startsWith('D-')) {
    const days = parseInt(ddayText.substring(2));
    if (days <= 3) {
      return 'dday-urgent';
    } else if (days <= 7) {
      return 'dday-soon';
    } else {
      return 'dday-normal';
    }
  }
  
  return '';
}

/**
 * 날짜 입력값 유효성 검사
 * @param {string} dateString - 날짜 문자열
 * @returns {boolean} 유효한 날짜인지 여부
 */
export function isValidDate(dateString) {
  if (!dateString) return false;
  return dayjs(dateString).isValid();
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 * @returns {string} 오늘 날짜
 */
export function getTodayString() {
  return dayjs().format('YYYY-MM-DD');
}
