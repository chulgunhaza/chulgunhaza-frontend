import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPostList } from '../api/post';
import type { PostListResponseDto } from '../types/post';
import type { PageDto } from '../types/common';
import { toApiError } from '../api/client';

const DEFAULT_CATEGORY = '공지';

export function BoardListPage() {
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [page, setPage] = useState<PageDto<PostListResponseDto> | null>(null);
  const [pageNum, setPageNum] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getPostList(category, pageNum, 10);
      setPage(res);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, pageNum]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="field" style={{ maxWidth: 240, marginBottom: 0 }}>
          <label>카테고리</label>
          <input
            value={category}
            onChange={(e) => {
              setPageNum(0);
              setCategory(e.target.value);
            }}
          />
        </div>
        <Link to="/board/new" className="btn btn-primary">
          ✏️ 글쓰기
        </Link>
      </div>

      {loading && <p style={{ color: 'var(--ink-faint)' }}>불러오는 중...</p>}
      {error && <p className="error-text">{error}</p>}

      {page && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>제목</th>
                <th>작성자</th>
                <th>조회수</th>
                <th>작성일</th>
              </tr>
            </thead>
            <tbody>
              {page.contents.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ color: 'var(--ink-faint)' }}>
                    게시글이 없습니다.
                  </td>
                </tr>
              ) : (
                page.contents.map((post) => (
                  <tr key={post.postNumber}>
                    <td>
                      <Link to={`/board/${post.postNumber}`}>{post.title}</Link>
                    </td>
                    <td>{post.author ?? '알 수 없음'}</td>
                    <td>{post.count}</td>
                    <td>{new Date(post.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
            <button className="btn" disabled={page.isFirstPage} onClick={() => setPageNum((p) => p - 1)}>
              이전
            </button>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              {page.currentPage + 1} / {Math.max(page.totalPages, 1)}
            </span>
            <button className="btn" disabled={page.isLastPage} onClick={() => setPageNum((p) => p + 1)}>
              다음
            </button>
          </div>
        </div>
      )}
    </>
  );
}
