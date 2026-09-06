import { useEffect, useState, type FormEvent } from 'react';
import { getEmployeeList, getEmployee, createEmployee, modifyEmployee, deleteEmployee } from '../api/employee';
import { toApiError } from '../api/client';
import { POSITION_LABEL } from '../types/employee';
import type {
  EmployeeListResponseDto,
  EmployeeResponseDto,
  Gender,
  Position,
  UserRole,
} from '../types/employee';

// domain/member/UserRole.java의 getRole() 라벨 그대로
const ROLE_LABEL: Record<UserRole, string> = {
  USER: '사원',
  MANAGER: '근태 관리자',
  ADMIN: '관리자',
};
const ALL_ROLES: UserRole[] = ['USER', 'MANAGER', 'ADMIN'];
const ALL_POSITIONS = Object.keys(POSITION_LABEL) as Position[];

interface FormState {
  name: string;
  email: string;
  gender: Gender;
  birthDate: string;
  hireDate: string;
  department: string;
  position: Position;
  userRoleList: UserRole[];
}

function emptyForm(): FormState {
  return {
    name: '',
    email: '',
    gender: 'MALE',
    birthDate: '',
    hireDate: new Date().toISOString().slice(0, 10),
    department: '',
    position: 'EMPLOYEE',
    userRoleList: ['USER'],
  };
}

// 사원 관리 — 이슈 #83(관리자 로그인) 다음 단계로 만든 최소 관리자 화면. 사원
// 목록/등록/수정/삭제만 다룬다. EmployeeController의 세 액션(create/modify/delete)이
// 전부 @PreAuthorize("hasAnyRole('ROLE_MANAGER')")로 막혀있어서, MANAGER/ADMIN이
// 아닌 계정으로 오면 백엔드가 403을 준다 — 이 페이지 자체는 그걸 대비해 라우트
// 단계에서도 한 번 더 막는다(AdminRoute).
export function AdminEmployeesPage() {
  const [page, setPage] = useState<import('../types/common').PageDto<EmployeeListResponseDto> | null>(null);
  const [pageNum, setPageNum] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<EmployeeListResponseDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getEmployeeList(pageNum, 10);
      setPage(res);
    } catch (err) {
      setLoadError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum]);

  function openCreate() {
    setForm(emptyForm());
    setFormError(null);
    setEditingId(null);
    setEditingVersion(null);
    setFormMode('create');
  }

  async function openEdit(row: EmployeeListResponseDto) {
    setFormError(null);
    try {
      const detail: EmployeeResponseDto = await getEmployee(row.id);
      setForm({
        name: detail.name,
        email: detail.email,
        gender: detail.gender,
        // 목록 API는 생일을 안 내려주고, 상세 API(EmployeeResponseDto)에도 birthDate
        // 필드가 없다 — 백엔드가 안 내려주는 값이라 빈 값으로 시작, 필요하면 다시 입력.
        birthDate: '',
        hireDate: new Date().toISOString().slice(0, 10),
        department: detail.department,
        position: detail.position,
        userRoleList: detail.userRoleList,
      });
      setEditingId(detail.id);
      setEditingVersion(detail.version);
      setFormMode('edit');
    } catch (err) {
      setLoadError(toApiError(err).message);
    }
  }

  function closeForm() {
    setFormMode(null);
    setFormError(null);
  }

  function toggleRole(role: UserRole) {
    setForm((f) => {
      const has = f.userRoleList.includes(role);
      const next = has ? f.userRoleList.filter((r) => r !== role) : [...f.userRoleList, role];
      return { ...f, userRoleList: next };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (form.userRoleList.length === 0) {
      setFormError('권한을 하나 이상 선택해야 합니다.');
      return;
    }
    if (formMode === 'create' && !form.birthDate) {
      setFormError('생일을 입력해야 합니다.');
      return;
    }

    setSubmitting(true);
    try {
      if (formMode === 'create') {
        await createEmployee({
          name: form.name,
          email: form.email,
          gender: form.gender,
          birthDate: form.birthDate,
          hireDate: form.hireDate,
          department: form.department,
          position: form.position,
          userRoleList: form.userRoleList,
        });
      } else if (formMode === 'edit' && editingId !== null && editingVersion !== null) {
        await modifyEmployee(editingId, {
          name: form.name,
          email: form.email,
          gender: form.gender,
          birthDate: form.birthDate || '1990-01-01', // 상세 API가 생일을 안 내려줘서 수정 폼엔 없음 — 백엔드 DTO는 필수라 안전한 기본값 채움
          hireDate: form.hireDate,
          department: form.department,
          position: form.position,
          userRoleList: form.userRoleList,
          version: editingVersion,
        });
      }
      closeForm();
      await load();
    } catch (err) {
      setFormError(toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteEmployee(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setDeleteError(toApiError(err).message);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h3 style={{ margin: 0 }}>사원 관리</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-fade)', margin: '4px 0 0' }}>
            사원 등록·수정·삭제는 근태 관리자 권한이 필요합니다.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          사원 등록
        </button>
      </div>

      {loading && <p style={{ color: 'var(--ink-fade)' }}>불러오는 중...</p>}
      {loadError && <p className="error-text">{loadError}</p>}

      {page && (
        <div className="card" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th>부서</th>
                <th>직급</th>
                <th style={{ width: 140 }} />
              </tr>
            </thead>
            <tbody>
              {page.contents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--ink-fade)' }}>
                    사원이 없습니다.
                  </td>
                </tr>
              ) : (
                page.contents.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.name}</td>
                    <td>{emp.email}</td>
                    <td>{emp.department}</td>
                    <td>{POSITION_LABEL[emp.position]}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn" style={{ padding: '4px 10px', fontSize: 12.5 }} onClick={() => openEdit(emp)}>
                          수정
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 10px', fontSize: 12.5 }}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(emp);
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
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

      {formMode && (
        <div className="modal-overlay" onClick={closeForm}>
          <form className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <p className="modal-title">{formMode === 'create' ? '사원 등록' : '사원 정보 수정'}</p>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label>이름</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label>이메일</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  disabled={formMode === 'edit'}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>성별</label>
                  <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Gender }))}>
                    <option value="MALE">남성</option>
                    <option value="FEMALE">여성</option>
                  </select>
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>직급</label>
                  <select value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value as Position }))}>
                    {ALL_POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {POSITION_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {formMode === 'create' && (
                <div className="field">
                  <label>생일</label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                    required
                  />
                </div>
              )}
              <div className="field">
                <label>부서</label>
                <input
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label>권한</label>
                <div style={{ display: 'flex', gap: 14 }}>
                  {ALL_ROLES.map((role) => (
                    <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        checked={form.userRoleList.includes(role)}
                        onChange={() => toggleRole(role)}
                      />
                      {ROLE_LABEL[role]}
                    </label>
                  ))}
                </div>
              </div>
              {formError && <p className="error-text">{formError}</p>}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={closeForm}>
                취소
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? '저장 중...' : formMode === 'create' ? '등록' : '저장'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-title">사원 삭제</p>
            <p className="modal-body">'{deleteTarget.name}' 사원을 삭제하시겠습니까?</p>
            {deleteError && <p className="error-text">{deleteError}</p>}
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteTarget(null)}>
                취소
              </button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
