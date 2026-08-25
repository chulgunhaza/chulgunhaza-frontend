import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPost, deletePost } from '../api/post';
import type { PostSearchResponseDto } from '../types/post';
import { toApiError } from '../api/client';

export function BoardDetailPage() {
  const { postNumber } = useParams<{ postNumber: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostSearchResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (error) return <p className="error-text">{error}</p>;
  if (!post) return <p style={{ color: 'var(--ink-faint)' }}>불러오는 중...</p>;

  return (
    <div className="card">
      <span className="pill good">{post.category.categoryName}</span>
      <h2 style={{ marginBottom: 4 }}>{post.title}</h2>
      <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 16 }}>
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
        <button className="btn" style={{ color: 'var(--danger)' }} onClick={handleDelete}>
          삭제
        </button>
      </div>
    </div>
  );
}
