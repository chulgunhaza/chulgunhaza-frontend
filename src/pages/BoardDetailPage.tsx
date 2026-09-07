import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPost, deletePost, togglePostPin } from '../api/post';
import type { PostSearchResponseDto } from '../types/post';
import { toApiError } from '../api/client';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { useAuth } from '../context/AuthContext';

export function BoardDetailPage() {
  const { postNumber } = useParams<{ postNumber: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const { user } = useAuth();
  const [post, setPost] = useState<PostSearchResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pinning, setPinning] = useState(false);

  useEffect(() => {
    if (!postNumber) return;
    getPost(Number(postNumber))
      .then(setPost)
      .catch((err) => setError(toApiError(err).message));
  }, [postNumber]);

  async function handleDelete() {
    if (!postNumber || !confirm('이 게시글을 삭제할까요?')) return;
    try {
      await deletePost(Number(postNumber));
      navigate('/board');
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  async function handleTogglePin() {
    if (!postNumber) return;
    setPinning(true);
    try {
      const pinned = await togglePostPin(Number(postNumber));
      setPost((p) => (p ? { ...p, pinned } : p));
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setPinning(false);
    }
  }

  if (error) return <p className="error-text">{error}</p>;
  if (!post) return <p style={{ color: 'var(--ink-fade)' }}>불러오는 중...</p>;

  // 백엔드가 작성자/관리자만 삭제·수정을 허용하도록 바뀌어서(#87), 버튼을 아무한테나
  // 보여줬다가 403만 받는 걸 막으려고 프론트에서도 미리 가려둔다. PostSearchResponseDto가
  // 작성자 id는 안 내려주고 이름만 줘서 이름으로 비교한다 — 진짜 권한 판정은 어차피
  // 백엔드가 하니, 동명이인이 있어도 최악의 경우 버튼이 잘못 보이는 정도지 실제로
  // 남의 글이 지워지진 않는다.
  const canModify = isAdmin || (user != null && user.name === post.author);

  return (
    <div className="card" style={{ maxWidth: 760 }}>
      <span className="pill good">{post.category.categoryName}</span>
      {post.pinned && (
        <span className="pill good" style={{ marginLeft: 6 }}>
          고정
        </span>
      )}
      <h2 style={{ marginBottom: 4 }}>{post.title}</h2>
      <div style={{ fontSize: 13, color: 'var(--ink-fade)', marginBottom: 16 }}>
        {post.author ?? '알 수 없음'} · 조회 {post.count}
      </div>
      <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>

      {post.imageList.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          {post.imageList.map((path, i) => (
            // 백엔드가 파일을 서버 로컬 절대경로로만 반환하고 정적 리소스로 서빙하지 않아서
            // (LocalFileServiceImpl, #53 S3 마이그레이션 전) 다운로드 링크 대신 경로만 표시한다.
            <div key={i} className="pill warn" title={path}>
              첨부파일 {i + 1}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button className="btn" onClick={() => navigate('/board')}>
          목록
        </button>
        {isAdmin && (
          <button className="btn" onClick={handleTogglePin} disabled={pinning}>
            {pinning ? '처리 중...' : post.pinned ? '고정 해제' : '고정하기'}
          </button>
        )}
        {canModify && (
          <button className="btn" style={{ color: 'var(--danger)' }} onClick={handleDelete}>
            삭제
          </button>
        )}
      </div>
    </div>
  );
}
