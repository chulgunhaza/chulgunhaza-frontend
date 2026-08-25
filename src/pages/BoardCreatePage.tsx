import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../api/post';
import { toApiError } from '../api/client';

export function BoardCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryName, setCategoryName] = useState('공지');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (title.length < 10) {
      setError('제목은 10자 이상이어야 합니다.');
      return;
    }
    if (content.length < 100) {
      setError(`본문은 100자 이상이어야 합니다. (현재 ${content.length}자)`);
      return;
    }

    setSubmitting(true);
    try {
      const postNumber = await createPost({ title, content, categoryName }, files);
      navigate(`/board/${postNumber}`);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 640 }}>
      <h2 style={{ marginTop: 0 }}>게시글 작성</h2>
      <div className="field">
        <label>카테고리</label>
        <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required />
      </div>
      <div className="field">
        <label>제목 (10~255자)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="field">
        <label>본문 (100~1000자)</label>
        <textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} required />
      </div>
      <div className="field">
        <label>첨부파일 (선택)</label>
        <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
      </div>
      {error && <p className="error-text">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? '등록 중...' : '등록'}
      </button>
    </form>
  );
}
