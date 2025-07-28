// client/src/store/auth.ts
import { create } from 'zustand';

// 🆕 사용자 정보 타입 정의
interface User {
  id: string;
  name: string;
  role: string;
  roleInfo: {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
  };
  permissions: Array<{
    boardId: string;
    boardName: string;
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
  }>;
}

// 🆕 토큰 정보 타입 정의
interface TokenInfo {
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
}

// 🔄 AuthState 인터페이스 - 토큰 정보 추가
interface AuthState {
  // 기존 상태들
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // 🆕 토큰 정보 추가
  tokenInfo: TokenInfo | null;
  
  // 🔄 액션들 - setUser 시그니처 변경
  setUser: (user: User, tokenInfo?: TokenInfo) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  
  // 🆕 토큰 관련 액션들
  updateTokenInfo: (tokenInfo: TokenInfo) => void;
  isAccessTokenExpired: () => boolean;
  isRefreshTokenExpired: () => boolean;
  isTokenExpiringSoon: (minutesBefore?: number) => boolean;
  
  // 기존 편의 기능들
  getUserId: () => string | null;
  getUserName: () => string | null;
  getUserRole: () => string | null;
  isAdmin: () => boolean;
  canAccessBoard: (boardId: string, action: 'read' | 'write' | 'delete') => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  // 🆕 초기 상태 - tokenInfo 추가
  user: null,
  isAuthenticated: false,
  isLoading: true, // 앱 시작 시 로딩 상태
  tokenInfo: null, // 🆕 토큰 정보 초기값

  // 🔄 사용자 설정 - 토큰 정보도 함께 저장
  setUser: (user, tokenInfo) => {
    set({ 
      user, 
      isAuthenticated: true,
      isLoading: false,
      tokenInfo: tokenInfo || null
    });
    
    // 🆕 localStorage에 토큰 만료 시간 저장 (HttpOnly 쿠키 대응)
    if (tokenInfo) {
      localStorage.setItem('tokenInfo', JSON.stringify(tokenInfo));
      console.log('✅ 토큰 정보 저장:', new Date(tokenInfo.accessTokenExpiry));
    }
  },

  // 🔄 사용자 정보 삭제 - 토큰 정보도 함께 삭제
  clearUser: () => {
    set({ 
      user: null, 
      isAuthenticated: false,
      isLoading: false,
      tokenInfo: null
    });
    
    // 🆕 localStorage에서 토큰 정보 제거
    localStorage.removeItem('tokenInfo');
    console.log('🗑️ 토큰 정보 삭제');
  },

  // 로딩 상태 설정
  setLoading: (isLoading) => set({ isLoading }),

  // 🆕 토큰 정보 업데이트 (갱신 시 사용)
  updateTokenInfo: (tokenInfo) => {
    set({ tokenInfo });
    localStorage.setItem('tokenInfo', JSON.stringify(tokenInfo));
    console.log('🔄 토큰 정보 업데이트:', new Date(tokenInfo.accessTokenExpiry));
  },

  // 🆕 Access Token 만료 체크
  isAccessTokenExpired: () => {
    const { tokenInfo } = get();
    if (!tokenInfo) return true;
    
    const now = Date.now();
    return now >= tokenInfo.accessTokenExpiry;
  },

  // 🆕 Refresh Token 만료 체크
  isRefreshTokenExpired: () => {
    const { tokenInfo } = get();
    if (!tokenInfo) return true;
    
    const now = Date.now();
    return now >= tokenInfo.refreshTokenExpiry;
  },

  // 🆕 토큰이 곧 만료되는지 체크 (기본: 5분 전)
  isTokenExpiringSoon: (minutesBefore = 5) => {
    const { tokenInfo } = get();
    if (!tokenInfo) return true;
    
    const now = Date.now();
    const threshold = minutesBefore * 60 * 1000;
    return now >= (tokenInfo.accessTokenExpiry - threshold);
  },

  // 🔍 편의 기능: 사용자 ID 조회
  getUserId: () => {
    const { user } = get();
    return user?.id || null;
  },

  // 🔍 편의 기능: 사용자 이름 조회
  getUserName: () => {
    const { user } = get();
    return user?.name || null;
  },

  // 🔍 편의 기능: 사용자 역할 조회
  getUserRole: () => {
    const { user } = get();
    return user?.role || null;
  },

  // 🔍 편의 기능: 관리자 권한 체크
  isAdmin: () => {
    const { user } = get();
    return user?.role === 'admin';
  },

  // 🔍 편의 기능: 게시판 접근 권한 체크
  canAccessBoard: (boardId: string, action: 'read' | 'write' | 'delete') => {
    const { user } = get();
    if (!user?.permissions) return false;

    const boardPermission = user.permissions.find(p => p.boardId === boardId);
    if (!boardPermission) return false;

    switch (action) {
      case 'read': return boardPermission.canRead;
      case 'write': return boardPermission.canWrite;
      case 'delete': return boardPermission.canDelete;
      default: return false;
    }
  }
}));