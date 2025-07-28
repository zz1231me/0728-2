// src/hooks/usePostDetail.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { fetchPostById, deletePost } from '../api/posts';

export type Post = {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  boardType: string;
  attachments?: Array<{
    url: string;
    originalName: string;
    storedName: string;
    size?: number;
    mimeType?: string;
  }>;
};

export const BOARD_TITLES: Record<string, string> = {
  notice: '공지사항',
  onboarding: '온보딩',
  shared: '공유 자료',
  internal: '내부 문서',
  free: '자유게시판'
} as const;

interface UsePostDetailProps {
  boardType: string | undefined;
  id: string | undefined;
}

export const usePostDetail = ({ boardType, id }: UsePostDetailProps) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const navigate = useNavigate();
  const { user, getUserId, getUserName, isAdmin } = useAuth();

  // 권한 확인
  const canEditOrDelete = useMemo(() => {
    if (!post || !user) return false;
    
    const currentUserId = getUserId();
    const currentUserName = getUserName();
    const isAdminUser = isAdmin();
    
    return (
      post.author === currentUserId || 
      post.author === currentUserName || 
      isAdminUser
    );
  }, [post, user, getUserId, getUserName, isAdmin]);

  // 게시판 제목 가져오기
  const getBoardTitle = useCallback((type: string) => {
    return BOARD_TITLES[type] || type?.toUpperCase() || '게시판';
  }, []);

  // 날짜 포맷팅
  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 24) {
        if (diffInHours < 1) return '방금 전';
        return `${diffInHours}시간 전`;
      } else if (diffInHours < 24 * 7) {
        const days = Math.floor(diffInHours / 24);
        return `${days}일 전`;
      } else {
        return date.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  }, []);

  // 게시글 가져오기
  const fetchPost = useCallback(async () => {
    if (!boardType || !id) {
      setError('잘못된 접근입니다.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await fetchPostById(boardType, id);
      
      console.log('📤 서버 응답 데이터:', data);
      
      setPost({
        id: data.id,
        title: data.title,
        content: data.content || '내용이 없습니다.',
        author: data.author,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt || data.createdAt,
        boardType: boardType,
        attachments: Array.isArray(data.attachments) ? data.attachments : []
      });
      
    } catch (err: any) {
      console.error('게시글 조회 실패:', err);
      setError(err.response?.data?.message || err.message || '게시글을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [boardType, id]);

  // 이벤트 핸들러들
  const handleBack = useCallback(() => {
    navigate(`/dashboard/posts/${boardType}`);
  }, [navigate, boardType]);

  const handleEdit = useCallback(() => {
    if (!canEditOrDelete) {
      alert('수정 권한이 없습니다.');
      return;
    }
    navigate(`/dashboard/posts/${boardType}/edit/${id}`);
  }, [navigate, boardType, id, canEditOrDelete]);

  const handleDelete = useCallback(async () => {
    if (!canEditOrDelete) {
      alert('삭제 권한이 없습니다.');
      return;
    }

    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) return;

    try {
      setIsDeleting(true);
      await deletePost(boardType!, id!);
      alert('게시글이 삭제되었습니다.');
      navigate(`/dashboard/posts/${boardType}`);
    } catch (err: any) {
      console.error('게시글 삭제 실패:', err);
      alert(err.response?.data?.message || '게시글 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  }, [id, boardType, navigate, canEditOrDelete]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  return {
    post,
    loading,
    error,
    isDeleting,
    canEditOrDelete,
    getBoardTitle,
    formatDate,
    handleBack,
    handleEdit,
    handleDelete,
    refreshPost: fetchPost
  };
};