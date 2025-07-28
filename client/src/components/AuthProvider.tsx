// client/src/components/AuthProvider.tsx
import React, { useEffect, useRef } from 'react';
import { useAuth } from '../store/auth';
import { useAuthInit } from '../hooks/useAuthInit';
import { refreshToken } from '../api/auth';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * 인증 상태를 관리하는 프로바이더 컴포넌트
 * 앱 시작 시 쿠키의 토큰을 확인해서 자동 로그인 처리
 * 백그라운드에서 토큰 만료 시간을 체크하여 스마트하게 갱신
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { 
    isAuthenticated, 
    user, 
    clearUser, 
    updateTokenInfo,
    isTokenExpiringSoon,
    isRefreshTokenExpired,
    tokenInfo
  } = useAuth();
  
  const { isLoading } = useAuthInit();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🔄 스마트한 백그라운드 토큰 갱신 설정
  useEffect(() => {
    if (isAuthenticated && user && tokenInfo) {
      console.log('🔄 백그라운드 토큰 갱신 타이머 시작');
      
      // 2분마다 체크 (더 자주 체크하되 실제 갱신은 필요할 때만)
      intervalRef.current = setInterval(async () => {
        try {
          // Refresh Token 만료 체크
          if (isRefreshTokenExpired()) {
            console.log('❌ Refresh Token 만료, 로그아웃 처리');
            clearUser();
            window.location.href = '/';
            return;
          }

          // Access Token이 5분 내로 만료될 예정인지 체크
          if (isTokenExpiringSoon(5)) {
            console.log('🔄 토큰이 곧 만료됨, 사전 갱신 시도...');
            
            try {
              const response = await refreshToken();
              
              if (response.tokenInfo) {
                updateTokenInfo(response.tokenInfo);
                console.log('✅ 사전 토큰 갱신 성공');
              } else {
                console.warn('⚠️ 토큰 갱신 응답에 tokenInfo 없음');
              }
            } catch (error) {
              console.error('❌ 사전 토큰 갱신 실패:', error);
              
              // 갱신 실패 시 로그아웃 처리
              console.log('🚪 토큰 갱신 실패로 인한 자동 로그아웃');
              clearUser();
              window.location.href = '/';
            }
          } else {
            // 토큰이 아직 유효함
            const expiry = new Date(tokenInfo.accessTokenExpiry);
            const now = new Date();
            const minutesLeft = Math.floor((expiry.getTime() - now.getTime()) / 60000);
            console.log(`✅ 토큰 상태 양호 (${minutesLeft}분 남음)`);
          }
        } catch (error) {
          console.error('토큰 상태 체크 오류:', error);
        }
      }, 2 * 60 * 1000); // 2분마다 실행

      // 정리 함수
      return () => {
        if (intervalRef.current) {
          console.log('🛑 백그라운드 토큰 갱신 타이머 정리');
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // 로그아웃 상태일 때 타이머 정리
      if (intervalRef.current) {
        console.log('🛑 로그아웃으로 인한 토큰 갱신 타이머 정리');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isAuthenticated, user, tokenInfo, clearUser, updateTokenInfo, isTokenExpiringSoon, isRefreshTokenExpired]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 인증 상태 초기화 중이면 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">인증 상태 확인 중...</p>
          <p className="text-gray-400 text-sm mt-2">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  // 인증 상태 초기화 완료 후 자식 컴포넌트 렌더링
  return (
    <>
      {children}
      
      {/* 개발 환경에서만 보이는 인증 상태 디버깅 정보 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-50">
          <div>🔐 Login : {isAuthenticated ? '✅' : '❌'}</div>
          {user && (
            <>
              <div>👤 사용자: {user.name}</div>
              <div>🔄 자동갱신: {intervalRef.current ? '✅' : '❌'}</div>
              {tokenInfo && (
                <>
                  <div>⏰ Access 만료: {new Date(tokenInfo.accessTokenExpiry).toLocaleTimeString()}</div>
                  <div>🔑 Refresh 만료: {new Date(tokenInfo.refreshTokenExpiry).toLocaleDateString()}</div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};