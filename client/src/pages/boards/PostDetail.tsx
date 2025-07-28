// src/pages/boards/PostDetail.tsx - 단순화된 안정적 버전
import React from 'react';
import { useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import CommentSection from './CommentSection';
import AttachmentList from '../../components/AttachmentList';
import ImageViewer from '../../components/ImageViewer';
import { usePostDetail } from '../../hooks/usePostDetail';
import { useContentImageHandler } from '../../hooks/useContentImageHandler';
import { Viewer } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor-viewer.css';
import '../../styles/ContentImageStyles.css';

const PostDetail = () => {
  const { boardType, id } = useParams<{ boardType: string; id: string }>();
  
  const {
    post,
    loading,
    error,
    isDeleting,
    canEditOrDelete,
    getBoardTitle,
    formatDate,
    handleBack,
    handleEdit,
    handleDelete
  } = usePostDetail({ boardType, id });

  // 게시글 본문 이미지 클릭 핸들러
  const { imageViewer, closeImageViewer } = useContentImageHandler();

  // 스켈레톤 로더 컴포넌트
  const SkeletonLoader = () => (
    <div className="min-h-full bg-gradient-to-br from-gray-50/50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
            <div className="h-5 bg-gray-200 rounded w-32"></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden mb-6 animate-pulse">
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-8 py-8">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 에러 상태 컴포넌트
  const ErrorState = ({ message }: { message: string }) => (
    <div className="min-h-full bg-gradient-to-br from-gray-50/50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h3>
            <p className="text-gray-600 mb-6" role="alert">{message}</p>
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              목록으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // 게시글을 찾을 수 없는 상태
  const NotFoundState = () => (
    <div className="min-h-full bg-gradient-to-br from-gray-50/50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-8">
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">게시글을 찾을 수 없습니다</h3>
            <p className="text-gray-600 mb-6">요청하신 게시글이 존재하지 않거나 삭제되었습니다.</p>
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              목록으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // 렌더링 조건부 처리
  if (loading) return <SkeletonLoader />;
  if (error) return <ErrorState message={error} />;
  if (!post) return <NotFoundState />;

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50/50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* 헤더 */}
        <header className="mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-9 h-9 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all duration-200 shadow-sm border-0 outline-none focus:outline-none"
              aria-label="뒤로 가기"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {getBoardTitle(boardType!)}
            </h1>
          </div>
        </header>

        {/* 게시글 카드 */}
        <main className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden mb-6">
          {/* 게시글 헤더 */}
          <header className="px-8 py-6 border-b border-gray-100">
            {/* 제목 섹션 */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl px-6 py-5 mb-6 border border-slate-200">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                {post.title}
              </h1>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* 작성자 정보 */}
                <div className="flex items-center gap-3">
                  <Avatar 
                    name={post.author} 
                    size="md" 
                    variant="gradient"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{post.author}</div>
                    <div className="text-xs text-gray-500">{formatDate(post.createdAt)}</div>
                  </div>
                </div>
                
                {/* 수정됨 표시 */}
                {post.updatedAt !== post.createdAt && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span className="text-amber-700 font-medium">수정됨</span>
                  </div>
                )}
              </div>
              
              {/* 액션 버튼 */}
              {canEditOrDelete && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium border-0 outline-none focus:outline-none"
                    disabled={isDeleting}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                    수정
                  </button>
                  
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-50 border-0 outline-none focus:outline-none"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                        삭제 중
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        삭제
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* 게시글 본문 - 단순화된 Viewer (Toast UI의 기본 동작에 맡김) */}
          <section className="bg-white px-8 py-8">
            <div className="prose prose-gray max-w-none">
              {post.content && (
                <Viewer
                  key={`${post.id}-${post.updatedAt}`} // 고유 키로 완전한 재마운트 보장
                  initialValue={post.content}
                  theme="light"
                  height="auto"
                  extendedAutolinks={true}
                  linkAttributes={{
                    target: '_blank',
                    rel: 'noopener noreferrer'
                  }}
                />
              )}
            </div>
          </section>

          {/* 첨부파일 섹션 */}
          <AttachmentList attachments={post.attachments || []} />
        </main>

        {/* 댓글 섹션 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
          <header className="px-8 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-gray-50/30">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-slate-600 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">댓글</h2>
            </div>
          </header>
          
          <div className="px-8 py-5">
            <CommentSection postId={id!} />
          </div>
        </section>

        {/* 게시글 본문 이미지 뷰어 */}
        <ImageViewer
          isOpen={imageViewer.isOpen}
          onClose={closeImageViewer}
          imageUrl={imageViewer.imageUrl}
          altText={imageViewer.altText}
        />
      </div>
    </div>
  );
};

export default PostDetail;