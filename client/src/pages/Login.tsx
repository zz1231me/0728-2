// src/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { login as loginAPI } from '../api/auth';

function Login() {
  const { setUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false); // 🆕 로그인 성공 상태

  // 이미 로그인된 상태면 대시보드로 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      console.log('✅ 이미 로그인된 상태, 대시보드로 이동');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 에러 메시지 자동 제거
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('🔄 로그인 시도:', id);
      
      // 쿠키 기반 로그인 API 사용
      const response = await loginAPI(id, password);
      
      console.log('✅ 로그인 API 성공:', response.user.name);
      console.log('🔐 역할:', response.user.roleInfo.name);
      console.log('📋 권한 수:', response.user.permissions.length);
      
      // 토큰 정보 처리
      if (response.tokenInfo) {
        console.log('✅ 토큰 정보 수신:', new Date(response.tokenInfo.accessTokenExpiry));
        setUser(response.user, response.tokenInfo);
      } else {
        console.warn('⚠️ 서버 응답에 토큰 정보 없음, 사용자 정보만 설정');
        setUser(response.user);
      }
      
      // 🆕 로그인 성공 애니메이션 시작
      setLoginSuccess(true);
      
      // 🆕 단계적 전환: 성공 → 화면 하얘짐 → 페이지 이동
      setTimeout(() => {
        console.log('🚀 대시보드로 리다이렉트');
        navigate('/dashboard', { replace: true });
      }, 2000); // 총 애니메이션 시간
      
    } catch (err: any) {
      console.error('❌ 로그인 실패:', err.message);
      setError(err.message || '아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 🆕 CSS 애니메이션을 위한 스타일 태그 - React 경고 해결 */}
      <style 
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes whiteFade {
              0% {
                opacity: 0;
                transform: scale(0.95);
              }
              50% {
                opacity: 0.7;
                transform: scale(1);
              }
              100% {
                opacity: 1;
                transform: scale(1.05);
              }
            }
            
            @keyframes loadingBar {
              from { width: 0%; }
              to { width: 100%; }
            }
            
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            @keyframes zoomIn {
              from { 
                opacity: 0; 
                transform: scale(0.8); 
              }
              to { 
                opacity: 1; 
                transform: scale(1); 
              }
            }
            
            @keyframes slideUp {
              from { 
                opacity: 0; 
                transform: translateY(20px); 
              }
              to { 
                opacity: 1; 
                transform: translateY(0); 
              }
            }
            
            @keyframes ping {
              75%, 100% {
                transform: scale(2);
                opacity: 0;
              }
            }
            
            .success-overlay {
              animation: fadeIn 0.5s ease-out;
            }
            
            .success-icon-bg {
              animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            }
            
            .success-icon {
              animation: zoomIn 0.7s ease-out;
            }
            
            .success-checkmark {
              animation: slideUp 1s ease-out 0.3s both;
            }
            
            .success-title {
              animation: slideUp 0.7s ease-out 0.3s both;
            }
            
            .success-subtitle {
              animation: slideUp 0.7s ease-out 0.5s both;
            }
            
            .loading-bar-container {
              animation: slideUp 0.7s ease-out 0.7s both;
            }
            
            .loading-bar-animation {
              animation: loadingBar 1s ease-out forwards;
            }
            
            .error-slide {
              animation: slideUp 0.3s ease-out;
            }
          `
        }}
      />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4 relative overflow-hidden">
        {/* 🆕 로그인 성공 시 전체 화면 오버레이 - 하얘지는 효과 추가 */}
        {loginSuccess && (
          <>
            {/* 1단계: 성공 메시지 (0-1초) */}
            <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center z-50 success-overlay">
              <div className="text-center text-white">
                {/* 성공 아이콘 애니메이션 */}
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-white rounded-full opacity-20 success-icon-bg"></div>
                  <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center success-icon">
                    <svg className="w-10 h-10 text-green-600 success-checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                
                {/* 성공 메시지 */}
                <h2 className="text-2xl font-bold mb-2 success-title">
                  로그인 성공!
                </h2>
                <p className="text-blue-100 success-subtitle">
                  대시보드로 이동 중입니다...
                </p>
                
                {/* 로딩 바 */}
                <div className="w-64 h-1 bg-white/20 rounded-full mx-auto mt-6 overflow-hidden loading-bar-container">
                  <div className="h-full bg-white rounded-full loading-bar-animation"></div>
                </div>
              </div>
            </div>

            {/* 2단계: 화면 하얘지는 효과 (1초 후부터) */}
            <div 
              className="fixed inset-0 bg-white z-60"
              style={{
                opacity: 0,
                transform: 'scale(0.95)',
                animation: 'whiteFade 1s ease-in-out 1s forwards'
              }}
            ></div>
          </>
        )}

        {/* 배경 장식 - 로그인 성공 시 흐려짐 */}
        <div className={`absolute inset-0 overflow-hidden transition-all duration-500 ${loginSuccess ? 'blur-sm opacity-50' : ''}`}>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        </div>

        <div className={`relative w-full max-w-sm transition-all duration-500 ${loginSuccess ? 'scale-95 opacity-70' : ''}`}>
          {/* 에러 메시지 */}
          {error && !loginSuccess && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg error-slide">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* 일반 로딩 상태 (로그인 성공 전) */}
          {isLoading && !loginSuccess && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 text-center" style={{ animation: 'zoomIn 0.2s ease-out' }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">로그인 중...</p>
              </div>
            </div>
          )}

          {/* 로그인 카드 */}
          <div className="bg-white rounded-xl shadow-lg border border-white/50 overflow-hidden">
            <div className="px-6 py-6">
              {/* 헤더 */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-gray-900 mb-1">Hello World</h1>
                <p className="text-sm text-gray-600">잠토리 시스템에 로그인하세요</p>
              </div>

              {/* 폼 */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 아이디 입력 */}
                <div>
                  <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">
                    아이디
                  </label>
                  <input
                    id="id"
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    disabled={isLoading || loginSuccess}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                             focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                             disabled:bg-gray-50 disabled:cursor-not-allowed
                             transition-colors box-border"
                    placeholder="아이디를 입력하세요"
                  />
                </div>

                {/* 비밀번호 입력 */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading || loginSuccess}
                      required
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm
                               focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                               disabled:bg-gray-50 disabled:cursor-not-allowed
                               transition-colors box-border"
                      placeholder="비밀번호를 입력하세요"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading || loginSuccess}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* 로그인 버튼 */}
                <button
                  type="submit"
                  disabled={isLoading || loginSuccess}
                  className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 px-4 rounded-md
                           hover:from-blue-700 hover:to-purple-700 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                           disabled:opacity-50 disabled:cursor-not-allowed
                           font-medium text-sm transition-all duration-200 box-border
                           flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                      </svg>
                      로그인 중...
                    </>
                  ) : loginSuccess ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      성공!
                    </>
                  ) : (
                    '로그인'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* 저작권 */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              © 2025 Company Workspace. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;