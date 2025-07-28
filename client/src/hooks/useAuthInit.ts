// client/src/hooks/useAuthInit.ts
import { useEffect } from 'react';
import { useAuth } from '../store/auth';
import { getCurrentUser, refreshToken } from '../api/auth';

/**
 * 앱 시작 시 인증 상태를 초기화하는 훅
 * 쿠키에 토큰이 있으면 자동으로 사용자 정보를 가져와서 로그인 상태로 설정
 * localStorage에서 토큰 정보를 복원하고 만료 상태를 체크하여 자동 갱신
 */
export const useAuthInit = () => {
  const { 
    setUser, 
    clearUser, 
    setLoading, 
    isLoading,
    updateTokenInfo,
    isRefreshTokenExpired,
    isAccessTokenExpired
  } = useAuth();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        console.log('🔄 인증 상태 초기화 시작...');

        // 🆕 localStorage에서 토큰 정보 복원
        const storedTokenInfo = localStorage.getItem('tokenInfo');
        if (storedTokenInfo) {
          try {
            const tokenInfo = JSON.parse(storedTokenInfo);
            updateTokenInfo(tokenInfo);
            console.log('✅ 저장된 토큰 정보 복원:', new Date(tokenInfo.accessTokenExpiry));
            
            // Refresh Token이 만료되었으면 로그아웃
            if (isRefreshTokenExpired()) {
              console.log('❌ Refresh Token 만료됨, 로그아웃 처리');
              clearUser();
              return;
            }
          } catch (error) {
            console.error('❌ 토큰 정보 복원 실패:', error);
            localStorage.removeItem('tokenInfo');
          }
        }

        // Access Token이 만료되었으면 갱신 시도
        if (isAccessTokenExpired()) {
          console.log('🔄 Access Token 만료 감지, 갱신 시도...');
          try {
            const refreshResponse = await refreshToken();
            
            // 갱신 성공 시 사용자 정보와 토큰 정보 설정
            if (refreshResponse.user && refreshResponse.tokenInfo) {
              setUser(refreshResponse.user, refreshResponse.tokenInfo);
              console.log('✅ 토큰 갱신 및 인증 상태 복원 성공:', refreshResponse.user.name);
              console.log('🔐 사용자 역할:', refreshResponse.user.roleInfo.name);
              console.log('📋 권한 수:', refreshResponse.user.permissions.length);
              return;
            } else {
              console.warn('⚠️ 토큰 갱신 응답에 필요한 정보 없음');
              throw new Error('토큰 갱신 응답 불완전');
            }
          } catch (refreshError) {
            console.error('❌ 토큰 갱신 실패:', refreshError);
            clearUser();
            return;
          }
        }

        // 유효한 토큰이 있으면 서버에서 현재 사용자 정보 조회
        const response = await getCurrentUser();
        
        // 사용자 정보 설정 (토큰 정보는 이미 복원됨)
        setUser(response.user);
        console.log('✅ 기존 토큰으로 인증 상태 복원 성공:', response.user.name);
        console.log('🔐 사용자 역할:', response.user.roleInfo.name);
        console.log('📋 권한 수:', response.user.permissions.length);
        
      } catch (error) {
        console.log('❌ 인증되지 않은 사용자 (쿠키 없음 또는 만료)');
        
        // 에러 타입에 따른 처리
        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('419')) {
            console.log('🔄 토큰이 없거나 만료됨');
          } else {
            console.warn('⚠️ 예상치 못한 인증 오류:', error.message);
          }
        }
        
        // 인증되지 않은 상태로 설정
        clearUser();
      } finally {
        setLoading(false);
        console.log('✅ 인증 상태 초기화 완료');
      }
    };

    // 초기화 함수 실행
    initializeAuth();
  }, [setUser, clearUser, setLoading, updateTokenInfo, isRefreshTokenExpired, isAccessTokenExpired]);

  // 로딩 상태 반환 (컴포넌트에서 사용할 수 있도록)
  return { isLoading };
};