// src/hooks/useContentImageHandler.ts - 호버 효과 단순화 버전
import { useEffect, useState, useCallback, useRef } from 'react';

interface ImageViewerState {
  isOpen: boolean;
  imageUrl: string;
  altText: string;
}

type TimerRef = ReturnType<typeof setTimeout>;

// 전역 클린업 함수들을 추적하는 WeakMap
const globalCleanupMap = new WeakMap<HTMLImageElement, () => void>();

export const useContentImageHandler = () => {
  const [imageViewer, setImageViewer] = useState<ImageViewerState>({
    isOpen: false,
    imageUrl: '',
    altText: ''
  });

  const observerRef = useRef<MutationObserver | null>(null);
  const timeoutRef = useRef<TimerRef | null>(null);
  const debounceTimerRef = useRef<TimerRef | null>(null);
  const isInitializedRef = useRef(false);
  const containerRef = useRef<Element | null>(null);
  const processedImagesRef = useRef<Set<HTMLImageElement>>(new Set());
  const isMountedRef = useRef(true);

  // 안전한 상태 업데이트
  const safeSetState = useCallback((updater: (prev: ImageViewerState) => ImageViewerState) => {
    if (isMountedRef.current) {
      setImageViewer(updater);
    }
  }, []);

  // 디바운스 함수
  const debouncedCallback = useCallback((callback: () => void, delay: number = 100) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    if (!isMountedRef.current) return;
    
    debounceTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        callback();
      }
      debounceTimerRef.current = null;
    }, delay);
  }, []);

  // 이미지 클릭 핸들러 생성
  const createImageClickHandler = useCallback((img: HTMLImageElement) => {
    return (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!isMountedRef.current || !img.src || !document.contains(img)) return;
      
      console.log('🖼️ 게시글 이미지 클릭됨:', img.src);
      
      safeSetState(prev => ({
        ...prev,
        isOpen: true,
        imageUrl: img.src,
        altText: img.alt || '게시글 이미지'
      }));
    };
  }, [safeSetState]);

  // 개선된 툴팁 관리
  const createTooltipHandlers = useCallback((img: HTMLImageElement) => {
    let tooltip: HTMLDivElement | null = null;
    
    const showTooltip = () => {
      if (!isMountedRef.current) return;
      
      const parent = img.parentElement;
      if (!parent) return;

      // 기존 툴팁 제거
      const existingTooltip = parent.querySelector('.image-click-tooltip');
      if (existingTooltip) {
        existingTooltip.remove();
      }

      // 부모 요소의 position 설정
      const computedStyle = getComputedStyle(parent);
      if (computedStyle.position === 'static') {
        parent.style.position = 'relative';
      }

      // 새 툴팁 생성
      tooltip = document.createElement('div');
      tooltip.className = 'image-click-tooltip';
      tooltip.textContent = '🔍 클릭하여 확대';
      tooltip.setAttribute('aria-hidden', 'true');
      tooltip.style.cssText = `
        position: absolute !important;
        top: 8px !important;
        right: 8px !important;
        background: rgba(0, 0, 0, 0.85) !important;
        color: white !important;
        padding: 6px 10px !important;
        border-radius: 6px !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        line-height: 1.2 !important;
        z-index: 10 !important;
        pointer-events: none !important;
        white-space: nowrap !important;
        opacity: 0 !important;
        transform: translate3d(0, 0, 0) !important;
        transition: opacity 0.2s ease !important;
        backdrop-filter: blur(8px) saturate(180%) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      `;
      
      parent.appendChild(tooltip);
      
      // 애니메이션을 위한 지연
      requestAnimationFrame(() => {
        if (tooltip && isMountedRef.current) {
          tooltip.style.opacity = '1';
        }
      });
    };

    const hideTooltip = () => {
      if (tooltip) {
        tooltip.style.opacity = '0';
        // 약간의 지연 후 제거
        setTimeout(() => {
          if (tooltip && tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
            tooltip = null;
          }
        }, 200);
      }
    };

    const cleanupTooltip = () => {
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
      tooltip = null;
    };

    return { showTooltip, hideTooltip, cleanupTooltip };
  }, []);

  // 단일 이미지 핸들러 추가 (단순화된 호버 버전)
  const addHandlerToImage = useCallback((img: HTMLImageElement) => {
    // 이미 처리된 이미지는 건너뛰기
    if (processedImagesRef.current.has(img) || img.getAttribute('data-image-enhanced')) {
      return;
    }

    // 유효하지 않은 이미지는 건너뛰기
    if (!img.src || (img.src.startsWith('data:') && img.src.length < 100)) {
      return;
    }

    console.log('🖼️ 이미지 핸들러 추가:', img.src);

    // 처리된 이미지로 마킹
    processedImagesRef.current.add(img);
    img.setAttribute('data-image-enhanced', 'true');
    
    // CSS 클래스 즉시 적용
    img.classList.add('content-image-clickable');
    
    // 인라인 스타일로 기본 스타일 강제 적용 (확대/이동 효과 제거)
    img.style.cssText += `
      cursor: pointer !important;
      transition: border 0.15s ease, box-shadow 0.15s ease !important;
      border-radius: 8px !important;
      border: 2px solid transparent !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
    `;

    // 이벤트 핸들러 생성
    const clickHandler = createImageClickHandler(img);
    const { showTooltip, hideTooltip, cleanupTooltip } = createTooltipHandlers(img);

    // 호버 효과 핸들러 (단순화된 버전 - 테두리와 그림자만)
    const mouseEnterHandler = (e: Event) => {
      if (!isMountedRef.current) return;
      
      console.log('🖱️ 이미지 마우스 진입:', img.src);
      
      // CSS 클래스 추가
      img.classList.add('content-image-hover');
      
      // 인라인 스타일로 테두리와 그림자 효과만 적용
      img.style.cssText += `
        border-color: #000000 !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25) !important;
      `;
      
      showTooltip();
    };
    
    const mouseLeaveHandler = (e: Event) => {
      if (!isMountedRef.current) return;
      
      console.log('🖱️ 이미지 마우스 벗어남:', img.src);
      
      // CSS 클래스 제거
      img.classList.remove('content-image-hover');
      
      // 원래 스타일로 복원
      img.style.cssText = img.style.cssText.replace(
        /border-color: #000000 !important;|box-shadow: 0 4px 20px rgba\(0, 0, 0, 0\.25\) !important;/g,
        ''
      );
      img.style.cssText += `
        border-color: transparent !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
      `;
      
      hideTooltip();
    };

    // 이벤트 리스너 등록
    img.addEventListener('click', clickHandler, { passive: false });
    img.addEventListener('mouseenter', mouseEnterHandler, { passive: true });
    img.addEventListener('mouseleave', mouseLeaveHandler, { passive: true });

    // 전역 클린업 함수 등록
    const globalCleanup = () => {
      img.removeEventListener('click', clickHandler);
      img.removeEventListener('mouseenter', mouseEnterHandler);
      img.removeEventListener('mouseleave', mouseLeaveHandler);
      cleanupTooltip();
      img.classList.remove('content-image-clickable', 'content-image-hover');
      img.removeAttribute('data-image-enhanced');
      // 인라인 스타일 정리
      img.style.cssText = img.style.cssText.replace(
        /cursor: pointer !important;|transition: [^;]+ !important;|border-radius: 8px !important;|border: [^;]+ !important;|box-shadow: [^;]+ !important;/g,
        ''
      );
      processedImagesRef.current.delete(img);
      globalCleanupMap.delete(img);
    };

    globalCleanupMap.set(img, globalCleanup);
  }, [createImageClickHandler, createTooltipHandlers]);

  // 이미지 핸들러 추가 (배치 처리)
  const addImageClickHandlers = useCallback(() => {
    if (!isMountedRef.current) return;

    if (!containerRef.current) {
      containerRef.current = document.querySelector('.toastui-editor-contents');
    }
    
    const viewerContainer = containerRef.current;
    if (!viewerContainer) {
      console.log('⚠️ Toast UI Viewer 컨테이너를 찾을 수 없음');
      return;
    }

    // 새로운 이미지만 선택
    const newImages = viewerContainer.querySelectorAll('img:not([data-image-enhanced])') as NodeListOf<HTMLImageElement>;
    
    if (newImages.length === 0) return;

    console.log(`🖼️ ${newImages.length}개의 새 이미지 발견`);

    // 배치 처리로 성능 최적화
    newImages.forEach(img => {
      addHandlerToImage(img);
    });
  }, [addHandlerToImage]);

  // 메인 useEffect
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    isMountedRef.current = true;

    console.log('🖼️ useContentImageHandler 초기화');

    // 초기 로딩 - 약간 더 긴 지연으로 Toast UI Viewer 완전 로드 대기
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        addImageClickHandlers();
      }
    }, 300);

    // MutationObserver 설정
    observerRef.current = new MutationObserver((mutations) => {
      if (!isMountedRef.current) return;

      let hasRelevantChanges = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.tagName === 'IMG' || 
                  element.querySelector?.('img') ||
                  element.classList?.contains('toastui-editor-contents')) {
                hasRelevantChanges = true;
                break;
              }
            }
          }
        } else if (mutation.type === 'attributes' && 
                   mutation.attributeName === 'src' && 
                   (mutation.target as Element).tagName === 'IMG') {
          hasRelevantChanges = true;
        }
        
        if (hasRelevantChanges) break;
      }

      if (hasRelevantChanges) {
        debouncedCallback(addImageClickHandlers, 200);
      }
    });

    // Observer 시작
    const viewerContainer = document.querySelector('.toastui-editor-contents');
    if (viewerContainer) {
      containerRef.current = viewerContainer;
      observerRef.current.observe(viewerContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
      });
    } else {
      // Toast UI Viewer가 아직 로드되지 않은 경우 재시도
      const retryTimer = setTimeout(() => {
        if (isMountedRef.current) {
          addImageClickHandlers();
        }
      }, 1000);
      
      return () => clearTimeout(retryTimer);
    }

    // Cleanup 함수
    return () => {
      console.log('🖼️ useContentImageHandler 클린업 시작');
      
      isMountedRef.current = false;

      // 타이머 정리
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      // Observer 정리
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      // 모든 처리된 이미지 정리
      processedImagesRef.current.forEach(img => {
        const cleanup = globalCleanupMap.get(img);
        if (cleanup) {
          cleanup();
        }
      });
      processedImagesRef.current.clear();

      // 남은 enhanced 이미지들 강제 정리
      const remainingImages = document.querySelectorAll('img[data-image-enhanced]') as NodeListOf<HTMLImageElement>;
      remainingImages.forEach(img => {
        const cleanup = globalCleanupMap.get(img);
        if (cleanup) {
          cleanup();
        }
      });

      containerRef.current = null;
      isInitializedRef.current = false;
      
      console.log('🖼️ useContentImageHandler 클린업 완료');
    };
  }, [addImageClickHandlers, debouncedCallback]);

  // 이미지 뷰어 닫기
  const closeImageViewer = useCallback(() => {
    if (!isMountedRef.current) return;
    
    safeSetState(prev => ({
      ...prev,
      isOpen: false
    }));
    
    setTimeout(() => {
      if (isMountedRef.current) {
        safeSetState({
          isOpen: false,
          imageUrl: '',
          altText: ''
        });
      }
    }, 300);
  }, [safeSetState]);

  return {
    imageViewer,
    closeImageViewer
  };
};