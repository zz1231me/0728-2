// client/src/pages/components/MyTUICalendar.tsx
import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import koLocale from '@fullcalendar/core/locales/ko';
import { 
  EventInput, 
  EventClickArg, 
  DateSelectArg, 
  EventDropArg,
  EventResizeArg 
} from '@fullcalendar/core';
import { useAuth } from '../../store/auth';
import { 
  createEvent, 
  getEvents, 
  updateEvent, 
  deleteEvent 
} from '../../api/events';

// 이벤트 데이터 타입 정의
interface CalendarEvent {
  id: number;
  calendarId: string;
  title: string;
  body?: string;
  isAllday: boolean;
  start: string;
  end: string;
  category?: string;
  location?: string;
  attendees?: any;
  state?: string;
  isReadOnly: boolean;
  color?: string;
  backgroundColor?: string;
  dragBackgroundColor?: string;
  borderColor?: string;
  customStyle?: any;
  UserId: string;
  user?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

// 이벤트 생성/수정 폼 데이터 타입
interface EventFormData {
  title: string;
  body: string;
  isAllday: boolean;
  start: string;
  end: string;
  category: string;
  color: string;
  backgroundColor: string;
}

// 모달 모드 타입
type ModalMode = 'view' | 'create' | 'edit';

const MyTUICalendar: React.FC = () => {
  const { user } = useAuth();
  const calendarRef = useRef<FullCalendar>(null);
  
  // 🎯 단순화된 상태 관리 (드래그 관련 복잡한 상태 제거)
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [selectedDate, setSelectedDate] = useState<{start: Date, end: Date} | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    body: '',
    isAllday: true,
    start: '',
    end: '',
    category: '',
    location: '',
    color: '#3788d8',
    backgroundColor: '#3788d8'
  });

  // 카테고리별 색상 설정 (디자이너 친화적인 부드러운 톤)
  const categoryColors = {
    annual: { bg: '#f87171', border: '#ef4444', label: '연차' },
    morning_half: { bg: '#fb923c', border: '#f97316', label: '오전반차' },
    afternoon_half: { bg: '#facc15', border: '#eab308', label: '오후반차' },
    meeting: { bg: '#60a5fa', border: '#3b82f6', label: '회의' },
    dinner: { bg: '#a78bfa', border: '#8b5cf6', label: '회식' },
    etc: { bg: '#94a3b8', border: '#64748b', label: '기타' }
  };

  // 카테고리 배열 (버튼용)
  const categories = [
    { key: 'annual', emoji: '🏖️', label: '연차', bg: '#f87171', border: '#ef4444' },
    { key: 'morning_half', emoji: '🌅', label: '오전반차', bg: '#fb923c', border: '#f97316' },
    { key: 'afternoon_half', emoji: '🌆', label: '오후반차', bg: '#facc15', border: '#eab308' },
    { key: 'meeting', emoji: '💼', label: '회의', bg: '#60a5fa', border: '#3b82f6' },
    { key: 'dinner', emoji: '🍻', label: '회식', bg: '#a78bfa', border: '#8b5cf6' },
    { key: 'etc', emoji: '📝', label: '기타', bg: '#94a3b8', border: '#64748b' }
  ];

  // 이벤트 로드
  const loadEvents = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const calendarApi = calendarRef.current?.getApi();
      if (!calendarApi) return;

      const view = calendarApi.view;
      const start = view.activeStart;
      const end = view.activeEnd;

      console.log('📅 이벤트 로드 중:', { start, end });
      
      const eventData = await getEvents(start, end);
      console.log('✅ 로드된 이벤트:', eventData);

      // FullCalendar 형식으로 변환
      const formattedEvents: EventInput[] = eventData.map((event: CalendarEvent) => ({
        id: event.id.toString(),
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.isAllday,
        backgroundColor: event.backgroundColor || categoryColors[event.category as keyof typeof categoryColors]?.bg || '#3788d8',
        borderColor: event.borderColor || categoryColors[event.category as keyof typeof categoryColors]?.border || '#2563eb',
        textColor: '#ffffff',
        // 🎯 FullCalendar v6 권장: 이벤트별 편집 권한 설정
        editable: canEditEvent(event),
        startEditable: canEditEvent(event),
        durationEditable: canEditEvent(event),
        extendedProps: {
          body: event.body,
          category: event.category,
          location: event.location,
          userId: event.UserId,
          userName: event.user?.name,
          isReadOnly: event.isReadOnly,
          originalEvent: event
        }
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('❌ 이벤트 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 이벤트 로드
  useEffect(() => {
    loadEvents();
  }, [user]);

  // 실시간 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // 1초마다 업데이트

    return () => clearInterval(timer); // 컴포넌트 언마운트 시 정리
  }, []);

  // 오늘 버튼 클릭 핸들러
  const handleTodayClick = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.today();
    }
  };

  // 날짜 선택 시 (새 이벤트 생성)
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    console.log('📅 날짜 선택됨:', selectInfo);
    
    if (!canCreateEvent) {
      console.log('❌ 일정 생성 권한 없음');
      selectInfo.view.calendar.unselect();
      return;
    }
    
    setSelectedDate({
      start: selectInfo.start,
      end: selectInfo.end
    });
    
    // 날짜를 로컬 시간대로 변환하여 정확한 날짜 표시
    const startDate = new Date(selectInfo.start.getTime() - selectInfo.start.getTimezoneOffset() * 60000);
    const endDate = new Date(selectInfo.end.getTime() - selectInfo.end.getTimezoneOffset() * 60000);
    
    // 종료 날짜는 선택된 날짜의 마지막 날로 설정 (하루 빼기)
    endDate.setDate(endDate.getDate() - 1);
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    console.log('📝 폼 데이터 설정:', { startStr, endStr });

    setFormData({
      title: '',
      body: '',
      isAllday: true,
      start: startStr,
      end: endStr,
      category: '',
      color: '#3b82f6',
      backgroundColor: '#3b82f6'
    });
    
    setModalMode('create');
    setSelectedEvent(null);
    setIsModalOpen(true);
    
    // 선택 해제
    selectInfo.view.calendar.unselect();
  };

  // 날짜 클릭 시 (단일 날짜 선택)
  const handleDateClick = (dateClickInfo: any) => {
    console.log('🖱️ 날짜 클릭됨:', dateClickInfo);
    
    if (!canCreateEvent) {
      console.log('❌ 일정 생성 권한 없음');
      return;
    }

    // 클릭된 날짜를 로컬 시간대로 변환
    const clickedDate = new Date(dateClickInfo.date.getTime() - dateClickInfo.date.getTimezoneOffset() * 60000);
    const dateStr = clickedDate.toISOString().split('T')[0];

    console.log('📝 단일 날짜 클릭 폼 데이터:', { dateStr });

    setFormData({
      title: '',
      body: '',
      isAllday: true,
      start: dateStr,
      end: dateStr,
      category: '',
      color: '#3b82f6',
      backgroundColor: '#3b82f6'
    });
    
    setModalMode('create');
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  // 🎯 단순화된 이벤트 클릭 핸들러 (FullCalendar가 자동으로 드래그와 구분)
  const handleEventClick = (clickInfo: EventClickArg) => {
    console.log('🎯 이벤트 클릭:', clickInfo.event.title);
    
    const event = clickInfo.event;
    const originalEvent = event.extendedProps.originalEvent as CalendarEvent;
    
    setSelectedEvent(originalEvent);
    
    let startDate: string;
    let endDate: string;
    
    // 가장 신뢰할 수 있는 날짜 소스 사용
    if (event.startStr && event.startStr.includes('T')) {
      startDate = event.startStr.split('T')[0];
    } else if (event.startStr) {
      startDate = event.startStr;
    } else if (event.start) {
      startDate = event.start.toISOString().split('T')[0];
    } else {
      startDate = new Date(originalEvent.start).toISOString().split('T')[0];
    }
    
    // 종료 날짜 처리
    if (event.endStr && event.endStr.includes('T')) {
      const tempEnd = new Date(event.endStr);
      tempEnd.setDate(tempEnd.getDate() - 1);
      endDate = tempEnd.toISOString().split('T')[0];
    } else if (event.endStr) {
      const tempEnd = new Date(event.endStr);
      tempEnd.setDate(tempEnd.getDate() - 1);
      endDate = tempEnd.toISOString().split('T')[0];
    } else if (event.end) {
      const tempEnd = new Date(event.end);
      tempEnd.setDate(tempEnd.getDate() - 1);
      endDate = tempEnd.toISOString().split('T')[0];
    } else if (originalEvent.end) {
      const tempEnd = new Date(originalEvent.end);
      tempEnd.setDate(tempEnd.getDate() - 1);
      endDate = tempEnd.toISOString().split('T')[0];
    } else {
      endDate = startDate;
    }
    
    setFormData({
      title: event.title,
      body: event.extendedProps.body || '',
      isAllday: true,
      start: startDate,
      end: endDate,
      category: event.extendedProps.category || 'meeting',
      color: event.backgroundColor || '#3b82f6',
      backgroundColor: event.backgroundColor || '#3b82f6'
    });
    
    setModalMode('view');
    setIsModalOpen(true);
  };

  // 수정 모드로 전환
  const switchToEditMode = () => {
    setModalMode('edit');
  };
// 🎯 FullCalendar v6 권장: eventDrop만 사용하여 드래그 처리 단순화
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    console.log('🔄 이벤트 드롭 시작:', {
      title: dropInfo.event.title,
      oldStart: dropInfo.oldEvent.start,
      newStart: dropInfo.event.start,
      oldEnd: dropInfo.oldEvent.end,
      newEnd: dropInfo.event.end
    });
    
    const event = dropInfo.event;
    const originalEvent = event.extendedProps.originalEvent as CalendarEvent;
    
    // 🎯 더 상세한 권한 체크 로깅
    console.log('🔍 권한 체크:', {
      userId: user?.id,
      eventUserId: originalEvent.UserId,
      canEdit: canEditEvent(originalEvent),
      isReadOnly: originalEvent.isReadOnly
    });
    
    // 권한 체크
    if (!canEditEvent(originalEvent)) {
      console.log('❌ 드래그 권한 없음 - 사용자 불일치');
      alert('이 일정을 수정할 권한이 없습니다.');
      dropInfo.revert();
      return;
    }
    
    if (originalEvent.isReadOnly) {
      console.log('❌ 드래그 권한 없음 - 읽기전용');
      alert('읽기전용 일정은 수정할 수 없습니다.');
      dropInfo.revert();
      return;
    }
    
    try {
      const startDate = event.start!;
      let endDate = event.end;
      
      console.log('📅 날짜 처리:', {
        originalStart: startDate,
        originalEnd: endDate,
        startType: typeof startDate,
        endType: typeof endDate
      });
      
      // 종료 날짜가 없으면 시작 날짜 + 1일로 설정
      if (!endDate) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        console.log('📅 종료 날짜 자동 설정:', endDate);
      }
      
      // 기간이 0 이하면 최소 1일로 설정
      const timeDiff = endDate.getTime() - startDate.getTime();
      console.log('⏱️ 시간 차이:', timeDiff, 'ms');
      
      if (timeDiff <= 0) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        console.log('📅 최소 기간 보장:', endDate);
      }

      const updatedEventData = {
        calendarId: originalEvent.calendarId,
        title: originalEvent.title,
        body: originalEvent.body || '',
        isAllday: true,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        category: originalEvent.category,
        location: originalEvent.location || '',
        isReadOnly: originalEvent.isReadOnly,
        color: originalEvent.color,
        backgroundColor: originalEvent.backgroundColor,
        borderColor: originalEvent.borderColor
      };

      console.log('💾 서버 업데이트 요청:', {
        eventId: originalEvent.id,
        data: updatedEventData
      });
      
      const result = await updateEvent(originalEvent.id, updatedEventData);
      console.log('✅ 드롭 업데이트 성공:', result);
      
      // 성공 시 이벤트 다시 로드
      console.log('🔄 이벤트 다시 로드 시작');
      await loadEvents();
      console.log('✅ 이벤트 다시 로드 완료');
      
    } catch (error: any) {
      console.error('❌ 이벤트 드롭 실패:', {
        error,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      // 에러별 메시지 표시
      if (error.response?.status === 403) {
        alert('일정을 수정할 권한이 없습니다.');
      } else if (error.response?.status === 404) {
        alert('일정을 찾을 수 없습니다.');
      } else if (error.response?.status === 400) {
        alert('잘못된 날짜 형식입니다.');
      } else {
        alert(`일정 수정에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
      }
      
      // 🎯 실패 시 원래 위치로 되돌리기 + 로깅
      console.log('🔄 드롭 실패로 인한 revert 실행');
      dropInfo.revert();
      
      // 🎯 실패 후에도 이벤트 다시 로드하여 동기화
      console.log('🔄 실패 후 이벤트 다시 로드');
      await loadEvents();
    }
  };

  // 🎯 리사이즈 핸들러 (기존 유지)
  const handleEventResize = async (resizeInfo: EventResizeArg) => {
    console.log('📏 이벤트 리사이즈:', resizeInfo.event.title);
    
    const event = resizeInfo.event;
    const originalEvent = event.extendedProps.originalEvent as CalendarEvent;
    
    // 권한 체크
    if (!canEditEvent(originalEvent)) {
      console.log('❌ 편집 권한 없음');
      alert('이 일정을 수정할 권한이 없습니다.');
      resizeInfo.revert();
      return;
    }

    if (originalEvent.isReadOnly) {
      console.log('❌ 읽기전용 일정');
      alert('읽기전용 일정은 수정할 수 없습니다.');
      resizeInfo.revert();
      return;
    }
    
    try {
      const startDate = event.start!;
      let endDate = event.end!;
      
      // 최소 1일 기간 보장
      if (!endDate || endDate.getTime() <= startDate.getTime()) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      }

      const updatedEventData = {
        calendarId: originalEvent.calendarId,
        title: originalEvent.title,
        body: originalEvent.body || '',
        isAllday: true,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        category: originalEvent.category,
        location: originalEvent.location || '',
        isReadOnly: originalEvent.isReadOnly,
        color: originalEvent.color,
        backgroundColor: originalEvent.backgroundColor,
        borderColor: originalEvent.borderColor
      };

      await updateEvent(originalEvent.id, updatedEventData);
      console.log('✅ 리사이즈 업데이트 성공');
      
      await loadEvents();
      
    } catch (error: any) {
      console.error('❌ 이벤트 리사이즈 업데이트 실패:', error);
      
      if (error.response?.status === 403) {
        alert('일정을 수정할 권한이 없습니다.');
      } else if (error.response?.status === 404) {
        alert('일정을 찾을 수 없습니다.');
      } else if (error.response?.status === 400) {
        alert('잘못된 날짜 형식입니다.');
      } else {
        alert(`일정 수정에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
      }
      
      resizeInfo.revert();
    }
  };

  // 폼 제출 (생성/수정)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!formData.category) {
      // 알림창 대신 그냥 리턴 (빨간색 경고 메시지가 이미 표시됨)
      return;
    }

    try {
      const startDate = new Date(formData.start + 'T00:00:00');
      const endDate = new Date(formData.end + 'T00:00:00');
      endDate.setDate(endDate.getDate() + 1);
      
      const eventData = {
        calendarId: 'default',
        title: formData.title,
        body: formData.body,
        isAllday: true,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        category: formData.category,
        location: formData.location,
        isReadOnly: false,
        color: formData.color,
        backgroundColor: formData.backgroundColor,
        borderColor: formData.color
      };

      if (modalMode === 'create') {
        await createEvent(eventData);
      } else if (modalMode === 'edit' && selectedEvent) {
        await updateEvent(selectedEvent.id, eventData);
      }

      setIsModalOpen(false);
      loadEvents();
    } catch (error) {
      console.error('❌ 이벤트 저장 실패:', error);
      alert('일정 저장에 실패했습니다.');
    }
  };

  // 이벤트 삭제
  const handleDelete = async () => {
    if (!selectedEvent) return;
    
    if (!confirm('삭제하시겠습니까?')) return;

    try {
      await deleteEvent(selectedEvent.id);
      setIsModalOpen(false);
      loadEvents();
    } catch (error) {
      console.error('❌ 이벤트 삭제 실패:', error);
      alert('일정 삭제에 실패했습니다.');
    }
  };

  // 뷰 변경 시 이벤트 다시 로드
  const handleDatesSet = () => {
    loadEvents();
  };

  // 권한 체크
  const canCreateEvent = true;
  const canEditEvent = (event: CalendarEvent) => 
    user?.id === event.UserId;
  const canDeleteEvent = (event: CalendarEvent) => 
    user?.id === event.UserId;

  // 날짜/시간 포맷팅 함수
  const formatDateTime = (dateStr: string, isAllday: boolean) => {
    const date = new Date(dateStr);
    if (isAllday) {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      });
    } else {
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // 날짜 범위 포맷팅 함수 (상세보기용)
  const formatDateRange = (startStr: string, endStr: string) => {
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    endDate.setDate(endDate.getDate() - 1);
    
    const startFormatted = startDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return startFormatted;
    }
    
    const endFormatted = endDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      weekday: 'short'
    });
    
    return `${startFormatted} ~ ${endFormatted}`;
  };

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-lg">
      {/* 헤더 - 고정 높이 */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200/60">
        <div className="flex items-center justify-between">
          {/* 왼쪽: 네비게이션 + 오늘 버튼 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200/50">
              <button
                onClick={() => {
                  const calendarApi = calendarRef.current?.getApi();
                  if (calendarApi) calendarApi.prev();
                }}
                className="p-2 hover:bg-white transition-all duration-200 rounded-l-lg group"
                title="이전 달"
              >
                <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-px h-4 bg-slate-300/70"></div>
              <button
                onClick={() => {
                  const calendarApi = calendarRef.current?.getApi();
                  if (calendarApi) calendarApi.next();
                }}
                className="p-2 hover:bg-white transition-all duration-200 rounded-r-lg group"
                title="다음 달"
              >
                <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <button
              onClick={handleTodayClick}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-sm transition-all duration-200 hover:shadow-md flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Today
            </button>
          </div>

          {/* 중앙: 제목 */}
          <div className="flex-1 text-center">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight" id="calendar-title">
              {/* 제목은 FullCalendar에서 자동으로 업데이트됩니다 */}
            </h2>
          </div>

          {/* 오른쪽: 현재시간 */}
          <div className="flex items-center">
            <div className="bg-slate-50/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-200/50">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <div className="text-lg font-semibold text-slate-800 tabular-nums tracking-tight">
                  {currentTime.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
{/* 🎯 FullCalendar v6 권장 설정으로 단순화된 캘린더 */}
      <div className="px-4 pb-4">
        <div className="calendar-wrapper">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            locale={koLocale}
            headerToolbar={false}
            initialView="dayGridMonth"
            height="auto"
            events={events}
            
            // 🎯 기본 상호작용 설정
            selectable={canCreateEvent}
            selectMirror={true}
            unselectAuto={true}
            
            // 🎯 FullCalendar v6 권장: editable만 true로 설정하면 자동으로 드래그 활성화
            editable={true}
            
            // 🎯 드래그 부드러움 개선 설정
            eventDragMinDistance={5}
            dragRevertDuration={300}
            dragScroll={true}
            longPressDelay={200}
            
            // 🎯 이벤트 핸들러들 - 단순화됨
            select={handleDateSelect}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            
            // 🎯 핵심: eventDrop만 사용 (FullCalendar v6 권장)
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            
            // 🎯 추가 디버깅을 위한 이벤트 핸들러
            eventDidMount={(info) => {
              console.log('📌 이벤트 마운트:', info.event.title);
            }}
            
            // 🎯 이벤트 권한 제어 강화
            eventAllow={(dropInfo, draggedEvent) => {
              const originalEvent = draggedEvent.extendedProps.originalEvent as CalendarEvent;
              const canEdit = canEditEvent(originalEvent) && !originalEvent.isReadOnly;
              
              console.log('🔍 eventAllow 체크:', {
                title: draggedEvent.title,
                canEdit,
                userId: user?.id,
                eventUserId: originalEvent.UserId
              });
              
              return canEdit;
            }}
            
            // 🎯 기본 설정들
            datesSet={(dateInfo) => {
              handleDatesSet();
              const titleElement = document.getElementById('calendar-title');
              if (titleElement) {
                titleElement.textContent = dateInfo.view.title;
              }
            }}
            nowIndicator={true}
            weekends={true}
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5],
              startTime: '09:00',
              endTime: '18:00',
            }}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={true}
            dayMaxEvents={false}
            eventDisplay="block"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            loading={setLoading}
            fixedWeekCount={false}
            showNonCurrentDates={false}
            contentHeight="auto"
            expandRows={true}
            aspectRatio={0}
            stickyHeaderDates={false}
            selectConstraint={{
              start: '00:00',
              end: '24:00'
            }}
            dayCellClassNames={(arg) => {
              const today = new Date();
              const cellDate = arg.date;
              
              if (
                cellDate.getDate() === today.getDate() &&
                cellDate.getMonth() === today.getMonth() &&
                cellDate.getFullYear() === today.getFullYear()
              ) {
                return ['today-highlight'];
              }
              return [];
            }}
          />
        </div>
      </div>

      {/* 🎯 개선된 CSS - FullCalendar v6 CSS 변수 활용 */}
      <style jsx>{`
        .calendar-wrapper {
          /* 🎯 FullCalendar v6 CSS 변수 사용 */
          --fc-border-color: #e2e8f0;
          --fc-today-bg-color: #fef3c7;
          --fc-neutral-bg-color: #f8fafc;
          
          display: block;
          width: 100%;
          font-family: inherit;
        }
        
        .calendar-wrapper .fc {
          font-family: inherit;
        }
        
        /* 날짜 셀 기본 설정 */
        .calendar-wrapper .fc-daygrid-day {
          min-height: 100px;
          position: relative;
        }
        
        /* 반응형 대응 */
        @media (max-height: 800px) {
          .calendar-wrapper .fc-daygrid-day {
            min-height: 80px;
          }
        }
        
        @media (max-height: 700px) {
          .calendar-wrapper .fc-daygrid-day {
            min-height: 70px;
          }
        }
        
        @media (max-height: 600px) {
          .calendar-wrapper .fc-daygrid-day {
            min-height: 60px;
          }
        }
        
        .calendar-wrapper .fc-theme-standard td,
        .calendar-wrapper .fc-theme-standard th {
          border-color: #e2e8f0;
        }
        
        .calendar-wrapper .fc-col-header-cell {
          background-color: #f8fafc;
          font-weight: 600;
          color: #475569;
          border-bottom: 2px solid #e2e8f0;
          padding: 12px 8px;
        }
        
        /* 주말 헤더 색상 */
        .calendar-wrapper .fc-col-header-cell.fc-day-sun,
        .calendar-wrapper .fc-col-header-cell.fc-day-sat {
          color: #dc2626 !important;
          font-weight: 700 !important;
        }
        
        /* 주말 날짜 숫자 색상 */
        .calendar-wrapper .fc-daygrid-day.fc-day-sun .fc-daygrid-day-number,
        .calendar-wrapper .fc-daygrid-day.fc-day-sat .fc-daygrid-day-number {
          color: #dc2626 !important;
          font-weight: 600 !important;
        }
        
        /* 이번 달이 아닌 주말 날짜 */
        .calendar-wrapper .fc-daygrid-day.fc-day-other.fc-day-sun .fc-daygrid-day-number,
        .calendar-wrapper .fc-daygrid-day.fc-day-other.fc-day-sat .fc-daygrid-day-number {
          color: #fca5a5 !important;
        }
        
        /* 🎯 개선된 오늘 날짜 강조 - box-shadow 사용으로 테두리 문제 해결 */
        .calendar-wrapper .today-highlight {
          background: #fef3c7 !important;
          position: relative !important;
          z-index: 5 !important;
          /* 🎯 box-shadow로 테두리 구현 - overflow 문제 해결 */
          box-shadow: 
            inset 0 0 0 3px #eab308,
            0 4px 12px rgba(234, 179, 8, 0.15) !important;
          border-radius: 8px !important;
          animation: today-glow 2s ease-in-out infinite alternate;
        }

        /* 🎯 글로우 애니메이션 */
        @keyframes today-glow {
          0% { 
            box-shadow: 
              inset 0 0 0 3px #eab308,
              0 4px 12px rgba(234, 179, 8, 0.15);
          }
          100% { 
            box-shadow: 
              inset 0 0 0 3px #eab308,
              0 6px 20px rgba(234, 179, 8, 0.25);
          }
        }

        /* 🎯 주말인 오늘 날짜 */
        .calendar-wrapper .fc-day-sun.today-highlight,
        .calendar-wrapper .fc-day-sat.today-highlight {
          box-shadow: 
            inset 0 0 0 3px #dc2626,
            0 4px 12px rgba(220, 38, 38, 0.15) !important;
          animation: today-glow-red 2s ease-in-out infinite alternate;
        }

        @keyframes today-glow-red {
          0% { 
            box-shadow: 
              inset 0 0 0 3px #dc2626,
              0 4px 12px rgba(220, 38, 38, 0.15);
          }
          100% { 
            box-shadow: 
              inset 0 0 0 3px #dc2626,
              0 6px 20px rgba(220, 38, 38, 0.25);
          }
        }
        
        .calendar-wrapper .today-highlight .fc-daygrid-day-number {
          background: #eab308 !important;
          color: white !important;
          font-weight: 700 !important;
          border-radius: 8px !important;
          width: auto !important;
          height: auto !important;
          min-width: 32px !important;
          min-height: 24px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 6px !important;
          padding: 4px 8px !important;
          font-size: 14px !important;
          line-height: 1 !important;
          box-shadow: 0 3px 6px rgba(234, 179, 8, 0.4) !important;
          position: relative !important;
          z-index: 10 !important;
        }
        
        /* 오늘 날짜가 주말인 경우 */
        .calendar-wrapper .today-highlight.fc-day-sun .fc-daygrid-day-number,
        .calendar-wrapper .today-highlight.fc-day-sat .fc-daygrid-day-number {
          background: #dc2626 !important;
          color: white !important;
          box-shadow: 0 3px 6px rgba(220, 38, 38, 0.4) !important;
        }
        
        .calendar-wrapper .fc-daygrid-day-number {
          color: #374151;
          font-weight: 500;
          padding: 8px;
          transition: all 0.2s ease;
        }
        
        .calendar-wrapper .fc-day-other .fc-daygrid-day-number {
          color: #9ca3af;
        }

        /* 🎯 드래그 관련 스타일 - 부드러움 개선 */
        .calendar-wrapper .fc-event {
          border-radius: 6px;
          font-weight: 500;
          font-size: 12px;
          border: none;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          margin: 1px 2px;
          cursor: move;
          transition: all 0.15s ease-out;
          /* 🎯 드래그 부드러움 개선 */
          transform: translateZ(0);
          will-change: transform;
        }
        
        .calendar-wrapper .fc-event:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px) translateZ(0);
          transition: all 0.15s ease-out;
        }

        /* 🎯 FullCalendar 내장 드래그 스타일 개선 */
        .calendar-wrapper .fc-event-dragging {
          opacity: 0.85 !important;
          z-index: 9999 !important;
          transform: scale(1.02) translateZ(0) !important;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
          transition: none !important;
        }

        .calendar-wrapper .fc-event-mirror {
          opacity: 0.6 !important;
          border: 2px dashed #3b82f6 !important;
          background: rgba(59, 130, 246, 0.1) !important;
          transform: translateZ(0);
        }
        
        /* 🎯 드래그 중 부드러운 애니메이션 */
        .calendar-wrapper .fc-dragging {
          transition: transform 0.1s ease-out !important;
        }
        
        /* 🎯 GPU 가속 활용 */
        .calendar-wrapper .fc-daygrid-day {
          transform: translateZ(0);
        }
      `}</style>

      {/* 로딩 오버레이 */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-40">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">일정을 불러오는 중...</span>
          </div>
        </div>
      )}

      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="p-5">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    {modalMode === 'view' && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                    {modalMode === 'create' && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                    {modalMode === 'edit' && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-900">
                      {modalMode === 'view' && '일정 상세'}
                      {modalMode === 'create' && '새 일정 추가'}
                      {modalMode === 'edit' && '일정 수정'}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all duration-200 flex items-center justify-center flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
{/* 상세보기 모드 */}
              {modalMode === 'view' && selectedEvent && (
                <div className="space-y-4">
                  {/* 헤더 - 제목과 카테고리 */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: selectedEvent.backgroundColor || '#3b82f6' }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 break-words leading-tight">
                          {selectedEvent.title}
                        </h3>
                      </div>
                    </div>
                    <div className="ml-7">
                      <span 
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: selectedEvent.backgroundColor || '#3b82f6' }}
                      >
                        {categoryColors[selectedEvent.category as keyof typeof categoryColors]?.label || '기타'}
                      </span>
                    </div>
                  </div>

                  {/* 상세 정보 */}
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    {/* 날짜/시간 */}
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium text-sm">
                          {formatDateRange(selectedEvent.start, selectedEvent.end)}
                        </p>
                        <p className="text-gray-600 text-xs">종일 일정</p>
                      </div>
                    </div>

                    {/* 내용 */}
                    {selectedEvent.body && (
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center mt-0.5">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-gray-900 text-sm whitespace-pre-wrap leading-relaxed">
                              {selectedEvent.body}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 작성자 정보 */}
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium text-sm">
                          {selectedEvent.user?.name || '알 수 없음'}
                        </p>
                        <div className="text-xs text-gray-500">
                          <p>생성: {new Date(selectedEvent.createdAt).toLocaleString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    {canEditEvent(selectedEvent) && (
                      <button
                        onClick={switchToEditMode}
                        className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        수정
                      </button>
                    )}
                    
                    {canDeleteEvent(selectedEvent) && (
                      <button
                        onClick={handleDelete}
                        className="px-3 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-200 flex items-center gap-2 font-medium text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        삭제
                      </button>
                    )}
                    
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium text-sm"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}

              {/* 생성/수정 모드 */}
              {(modalMode === 'create' || modalMode === 'edit') && (
                <div className="w-full max-w-none">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* 일정 종류 - 버튼 형태 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800">
                        일정 종류 <span className="text-red-500">*</span>
                      </label>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {categories.map((category) => {
                          const isSelected = formData.category === category.key;
                          
                          return (
                            <button
                              key={category.key}
                              type="button"
                              onClick={() => {
                                // 제목에 카테고리 라벨 자동 추가 (최적화된 버전)
                                let newTitle = formData.title;
                                
                                // 기존 라벨 제거 (한 번만 실행)
                                newTitle = newTitle.replace(/^\[.*?\]\s*/, '');
                                
                                // 새 라벨 추가
                                newTitle = newTitle.trim() 
                                  ? `[${category.label}] ${newTitle}` 
                                  : `[${category.label}] `;
                                
                                setFormData(prev => ({ 
                                  ...prev, 
                                  category: category.key,
                                  title: newTitle,
                                  color: category.bg,
                                  backgroundColor: category.bg
                                }));
                              }}
                              className={`
                                relative p-2.5 rounded-lg border-2 flex flex-col items-center gap-1.5 min-h-[60px] justify-center
                                transition-colors duration-150 ease-out
                                ${isSelected 
                                  ? 'border-current text-white font-semibold shadow-md' 
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }
                              `}
                              style={isSelected ? {
                                backgroundColor: category.bg,
                                borderColor: category.border
                              } : undefined}
                            >
                              <span className="text-base">
                                {category.emoji}
                              </span>
                              <span className="text-xs text-center leading-tight font-medium">
                                {category.label}
                              </span>
                              
                              {isSelected && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      
                      {!formData.category && (
                        <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <p className="text-xs text-red-700 font-medium">
                            일정 종류를 선택해주세요
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 제목 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800">
                        제목 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm box-border"
                        placeholder="일정 제목을 입력하세요"
                        required
                      />
                    </div>

                    {/* 날짜 섹션 */}
                    <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        일정 날짜
                      </h4>
                      
                      {/* 시작 날짜 */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-700">
                          시작 날짜
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={formData.start}
                            onChange={(e) => {
                              setFormData(prev => ({ 
                                ...prev, 
                                start: e.target.value,
                                end: e.target.value > prev.end ? e.target.value : prev.end
                              }));
                            }}
                            onClick={(e) => {
                              e.currentTarget.showPicker?.();
                            }}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-sm box-border cursor-pointer"
                            required
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* 종료 날짜 */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-700">
                          종료 날짜
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={formData.end}
                            min={formData.start}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, end: e.target.value }));
                            }}
                            onClick={(e) => {
                              e.currentTarget.showPicker?.();
                            }}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-sm box-border cursor-pointer"
                            required
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 내용 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800">
                        상세 내용
                      </label>
                      <textarea
                        value={formData.body}
                        onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none text-sm box-border"
                        placeholder="일정에 대한 추가 정보를 입력하세요 (선택사항)"
                        rows={3}
                      />
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold text-sm"
                      >
                        {modalMode === 'create' ? '✅ 일정 생성' : '💾 수정 완료'}
                      </button>
                      
                      {modalMode === 'edit' && (
                        <button
                          type="button"
                          onClick={() => setModalMode('view')}
                          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium text-sm"
                        >
                          취소
                        </button>
                      )}
                      
                      {modalMode === 'create' && (
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium text-sm"
                        >
                          취소
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTUICalendar;