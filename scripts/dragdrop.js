/**
 * TODO-LIST Application - Drag and Drop Module
 * 
 * 드래그 앤 드롭을 통한 작업 우선순위 조정 기능
 * 
 * Copyright (c) 2025 taeyoon0526
 */

import { supabase } from "./api.js";

class DragDropManager {
  constructor() {
    this.draggedElement = null;
    this.draggedId = null;
    this.placeholder = null;
    this.isEnabled = true;
    this.touchStartY = 0;
    this.touchCurrentY = 0;
    this.isDragging = false;
    
    // 터치 이벤트 throttle을 위한 변수
    this.lastTouchMove = 0;
    this.touchMoveThrottle = 16; // ~60fps
  }

  /**
   * 드래그 앤 드롭 기능 초기화
   * @param {string} userId - 사용자 ID
   */
  init(userId) {
    this.userId = userId;
    this.setupEventListeners();
    console.log('[DRAG] 드래그 앤 드롭 시스템 초기화 완료');
  }

  /**
   * 드래그 앤 드롭 활성화/비활성화
   * @param {boolean} enabled - 활성화 여부
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    const todoList = document.getElementById('todo-list');
    if (todoList) {
      todoList.classList.toggle('drag-disabled', !enabled);
    }
    console.log(`[DRAG] 드래그 앤 드롭 ${enabled ? '활성화' : '비활성화'}`);
  }

  /**
   * 필터링 상태에 따라 드래그 앤 드롭 상태 업데이트
   * @param {string} currentFilter - 현재 필터 ('all', 'active', 'completed', 등)
   */
  updateDragDropState(currentFilter) {
    // 'all' 필터일 때만 드래그 앤 드롭 활성화
    const shouldEnable = currentFilter === 'all';
    this.setEnabled(shouldEnable);
    
    // 드래그 핸들 표시/숨김
    const dragHandles = document.querySelectorAll('.drag-handle');
    dragHandles.forEach(handle => {
      handle.style.display = shouldEnable ? 'flex' : 'none';
    });
  }

  /**
   * TODO 항목에 드래그 기능 추가
   * @param {HTMLElement} todoItem - TODO 항목 엘리먼트
   * @param {string} todoId - TODO ID
   */
  makeDraggable(todoItem, todoId) {
    if (!this.isEnabled) return;

    // 데스크톱 드래그 이벤트
    todoItem.draggable = true;
    todoItem.setAttribute('data-todo-id', todoId);
    
    todoItem.addEventListener('dragstart', this.handleDragStart.bind(this));
    todoItem.addEventListener('dragend', this.handleDragEnd.bind(this));
    todoItem.addEventListener('dragover', this.handleDragOver.bind(this));
    todoItem.addEventListener('drop', this.handleDrop.bind(this));
    
    // 모바일 터치 이벤트
    todoItem.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    todoItem.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    todoItem.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    
    // 드래그 핸들 추가
    this.addDragHandle(todoItem);
  }

  /**
   * 드래그 핸들 추가
   * @param {HTMLElement} todoItem - TODO 항목 엘리먼트
   */
  addDragHandle(todoItem) {
    const existingHandle = todoItem.querySelector('.drag-handle');
    if (existingHandle) return;

    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '<i class="material-icons">drag_indicator</i>';
    dragHandle.title = '드래그하여 순서 변경';
    
    // 핸들을 맨 앞에 추가
    todoItem.insertBefore(dragHandle, todoItem.firstChild);
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    const todoList = document.getElementById('todo-list');
    if (!todoList) return;

    // 리스트 전체에 dragover와 drop 이벤트 추가
    todoList.addEventListener('dragover', this.handleDragOver.bind(this));
    todoList.addEventListener('drop', this.handleDrop.bind(this));
  }

  /**
   * 드래그 시작 핸들러
   * @param {DragEvent} e - 드래그 이벤트
   */
  handleDragStart(e) {
    if (!this.isEnabled) {
      e.preventDefault();
      return;
    }

    this.draggedElement = e.target.closest('.todo-item');
    this.draggedId = this.draggedElement.getAttribute('data-todo-id');
    
    // 드래그 중 시각적 효과
    this.draggedElement.classList.add('dragging');
    
    // 드래그 데이터 설정
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.draggedElement.outerHTML);
    
    console.log(`[DRAG] 드래그 시작: TODO ${this.draggedId}`);
  }

  /**
   * 드래그 종료 핸들러
   * @param {DragEvent} e - 드래그 이벤트
   */
  handleDragEnd(e) {
    if (this.draggedElement) {
      this.draggedElement.classList.remove('dragging');
    }
    
    // placeholder 제거
    this.removePlaceholder();
    
    this.draggedElement = null;
    this.draggedId = null;
    
    console.log('[DRAG] 드래그 종료');
  }

  /**
   * 드래그 오버 핸들러
   * @param {DragEvent} e - 드래그 이벤트
   */
  handleDragOver(e) {
    if (!this.isEnabled || !this.draggedElement) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = this.getDragAfterElement(e.clientY);
    const todoList = document.getElementById('todo-list');
    
    if (afterElement == null) {
      todoList.appendChild(this.getPlaceholder());
    } else {
      todoList.insertBefore(this.getPlaceholder(), afterElement);
    }
  }

  /**
   * 드롭 핸들러
   * @param {DragEvent} e - 드래그 이벤트
   */
  async handleDrop(e) {
    if (!this.isEnabled || !this.draggedElement) return;
    
    e.preventDefault();
    
    const todoList = document.getElementById('todo-list');
    const placeholder = this.placeholder;
    
    if (placeholder && placeholder.parentNode) {
      // placeholder 위치에 실제 요소 삽입
      placeholder.parentNode.insertBefore(this.draggedElement, placeholder);
      this.removePlaceholder();
      
      // 순서 업데이트
      await this.updateItemOrder();
    }
  }

  /**
   * 터치 시작 핸들러
   * @param {TouchEvent} e - 터치 이벤트
   */
  handleTouchStart(e) {
    if (!this.isEnabled) return;
    
    // 드래그 핸들에서만 터치 드래그 활성화
    const dragHandle = e.target.closest('.drag-handle');
    if (!dragHandle) return;
    
    e.preventDefault();
    
    this.touchStartY = e.touches[0].clientY;
    this.draggedElement = e.target.closest('.todo-item');
    this.draggedId = this.draggedElement.getAttribute('data-todo-id');
    this.isDragging = false;
    
    // 길게 눌러서 드래그 시작
    this.longPressTimer = setTimeout(() => {
      this.isDragging = true;
      this.draggedElement.classList.add('dragging');
      console.log(`[DRAG] 터치 드래그 시작: TODO ${this.draggedId}`);
    }, 500); // 500ms 길게 누르기
  }

  /**
   * 터치 이동 핸들러
   * @param {TouchEvent} e - 터치 이벤트
   */
  handleTouchMove(e) {
    if (!this.isEnabled || !this.draggedElement) return;
    
    // Throttle touch move events
    const now = Date.now();
    if (now - this.lastTouchMove < this.touchMoveThrottle) return;
    this.lastTouchMove = now;
    
    this.touchCurrentY = e.touches[0].clientY;
    const deltaY = Math.abs(this.touchCurrentY - this.touchStartY);
    
    // 움직임이 충분하면 드래그 시작
    if (deltaY > 10 && this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    if (this.isDragging) {
      e.preventDefault();
      
      // 터치 위치에서 드롭 대상 찾기
      const afterElement = this.getDragAfterElement(this.touchCurrentY);
      const todoList = document.getElementById('todo-list');
      
      if (afterElement == null) {
        todoList.appendChild(this.getPlaceholder());
      } else {
        todoList.insertBefore(this.getPlaceholder(), afterElement);
      }
    }
  }

  /**
   * 터치 종료 핸들러
   * @param {TouchEvent} e - 터치 이벤트
   */
  async handleTouchEnd(e) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    if (this.isDragging && this.draggedElement) {
      e.preventDefault();
      
      const placeholder = this.placeholder;
      if (placeholder && placeholder.parentNode) {
        // placeholder 위치에 실제 요소 삽입
        placeholder.parentNode.insertBefore(this.draggedElement, placeholder);
        await this.updateItemOrder();
      }
      
      this.draggedElement.classList.remove('dragging');
      this.removePlaceholder();
      
      console.log('[DRAG] 터치 드래그 종료');
    }
    
    this.isDragging = false;
    this.draggedElement = null;
    this.draggedId = null;
  }

  /**
   * 드래그 위치 기준으로 삽입할 요소 찾기
   * @param {number} y - Y 좌표
   * @returns {HTMLElement|null} 삽입할 위치의 다음 요소
   */
  getDragAfterElement(y) {
    const todoList = document.getElementById('todo-list');
    const draggableElements = [...todoList.querySelectorAll('.todo-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  /**
   * Placeholder 요소 생성/반환
   * @returns {HTMLElement} Placeholder 요소
   */
  getPlaceholder() {
    if (!this.placeholder) {
      this.placeholder = document.createElement('li');
      this.placeholder.className = 'todo-item drag-placeholder';
      this.placeholder.innerHTML = '<div class="placeholder-content">여기에 놓기</div>';
    }
    return this.placeholder;
  }

  /**
   * Placeholder 제거
   */
  removePlaceholder() {
    if (this.placeholder && this.placeholder.parentNode) {
      this.placeholder.parentNode.removeChild(this.placeholder);
    }
    this.placeholder = null;
  }

  /**
   * 항목 순서 업데이트
   */
  async updateItemOrder() {
    try {
      const todoList = document.getElementById('todo-list');
      const todoItems = [...todoList.querySelectorAll('.todo-item:not(.drag-placeholder)')];
      
      // 새로운 순서 배열 생성
      const updates = todoItems.map((item, index) => ({
        id: item.getAttribute('data-todo-id'),
        display_order: index + 1
      }));
      
      console.log('[DRAG] 순서 업데이트:', updates);
      
      // 배치 업데이트 수행
      for (const update of updates) {
        const { error } = await supabase
          .from('todos')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
          .eq('user_id', this.userId);
          
        if (error) {
          console.error('[DRAG] 순서 업데이트 실패:', error);
          throw error;
        }
      }
      
      console.log('[DRAG] 순서 업데이트 완료');
      
      // 성공 피드백
      this.showUpdateFeedback(true);
      
    } catch (error) {
      console.error('[DRAG] 순서 업데이트 중 오류:', error);
      this.showUpdateFeedback(false, error.message);
      
      // TODO 리스트 다시 로드하여 원래 순서로 복원
      if (window.loadTodos) {
        window.loadTodos(this.userId);
      }
    }
  }

  /**
   * 업데이트 피드백 표시
   * @param {boolean} success - 성공 여부
   * @param {string} errorMessage - 에러 메시지
   */
  showUpdateFeedback(success, errorMessage = '') {
    if (window.errorToast) {
      if (success) {
        window.errorToast.success('할 일 순서가 변경되었습니다.');
      } else {
        window.errorToast.error(`순서 변경 실패: ${errorMessage}`, {
          title: '드래그 앤 드롭 오류'
        });
      }
    }
  }
}

// 전역 인스턴스 생성
export const dragDropManager = new DragDropManager();

// 필터 상태에 따른 드래그 앤 드롭 제어
export function updateDragDropState(currentFilter) {
  // 정렬이나 필터링이 활성화된 상태에서는 드래그 앤 드롭 비활성화
  const shouldDisable = currentFilter !== 'all' || 
                       (window.currentSort && window.currentSort === 'priority');
  
  dragDropManager.setEnabled(!shouldDisable);
}
