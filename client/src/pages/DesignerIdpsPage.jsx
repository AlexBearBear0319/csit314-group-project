import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api';
import Button from '../components/Button';
import DetailsView from '../components/DetailsView';
import FormField from '../components/FormField';
import Message from '../components/Message';
import ProjectImageCarousel from '../components/ProjectImageCarousel';
import ProjectFolderCard from '../components/ProjectFolderCard';
import ProjectPagination from '../components/ProjectPagination';
import SearchBar from '../components/SearchBar';
import { uploadSignedImage } from '../storage';

const EMPTY_PROJECT = {
  name: '',
  description: '',
  propertyType: '',
  designStyle: '',
  completionDate: '',
  images: [],
};

function imageText(fileName) {
  const dot = fileName.lastIndexOf('.');
  return (dot > 0 ? fileName.slice(0, dot) : fileName).slice(0, 240);
}

function imageSize(sizeBytes) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.ceil(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FilePreview({ file }) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);
  return <img src={previewUrl} alt="" className="h-24 w-32 rounded-control object-cover" />;
}

export default function DesignerIdpsPage({ status }) {
  const past = status === 'past';
  const title = past ? 'Past projects' : 'Current projects';
  const basePath = `/designer/${status}-idps`;
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState('oldest');
  const [pageNumber, setPageNumber] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 9, total: 0, totalPages: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [editor, setEditor] = useState(null);
  const [files, setFiles] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState(() => new Set());
  const [viewProject, setViewProject] = useState(null);
  const [projectStartIndex, setProjectStartIndex] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const dialogRef = useRef(null);
  const projectDialogRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const projectRestoreFocusRef = useRef(null);
  const listRequestIdRef = useRef(0);
  const projectRequestIdRef = useRef(0);
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const pageNavigationRef = useRef(false);

  useEffect(() => {
    // Search and page changes can overlap. Only the latest response may update
    // the screen; the server owns the nine-project page boundary.
    let active = true;
    let redirected = false;
    const controller = new AbortController();
    const requestId = ++listRequestIdRef.current;
    const params = new URLSearchParams({ page: String(pageNumber), pageSize: '9', sort });
    if (searchQuery.trim()) params.set('q', searchQuery.trim());

    api.get(`${basePath}?${params.toString()}`, { signal: controller.signal }).then((response) => {
      if (!active || requestId !== listRequestIdRef.current) return;
      const pageInfo = response.pagination || {
        page: pageNumber,
        pageSize: 9,
        total: response.projects.length,
        totalPages: response.projects.length ? 1 : 0,
      };
      const lastPage = Math.max(1, pageInfo.totalPages);
      // A delete can empty the last page. Move back to the last valid page.
      if (pageNumber > lastPage) {
        redirected = true;
        setProjects([]);
        setIsLoading(true);
        setPageNumber(lastPage);
        return;
      }
      setProjects(response.projects);
      setPagination(pageInfo);
      setListError('');
      if (pageNavigationRef.current) {
        pageNavigationRef.current = false;
        // Page controls leave the DOM during loading. Put keyboard focus at
        // the new results instead of leaving it on the removed button.
        requestAnimationFrame(() => { if (!formRef.current) headingRef.current?.focus(); });
      }
    }).catch((requestError) => {
      if (!active || requestId !== listRequestIdRef.current) return;
      setProjects([]);
      setListError(requestError.message);
    }).finally(() => {
      if (active && requestId === listRequestIdRef.current && !redirected) setIsLoading(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [basePath, pageNumber, refreshKey, searchQuery, sort]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (deleteTarget && dialog && !dialog.open) {
      dialog.showModal();
    } else if (!deleteTarget && dialog?.open) {
      dialog.close();
    }
  }, [deleteTarget]);

  useEffect(() => {
    const dialog = projectDialogRef.current;
    if (viewProject && dialog && !dialog.open) {
      dialog.showModal();
      dialog.querySelector('[data-project-view-title]')?.focus();
    } else if (!viewProject && dialog?.open) {
      dialog.close();
    }
  }, [viewProject]);

  function handleSearch(query) {
    pageNavigationRef.current = false;
    setIsLoading(true);
    setError('');
    setListError('');
    setNotice('');
    setSearchQuery(query.trim());
    setPageNumber(1);
    setRefreshKey((current) => current + 1);
  }

  function goToPage(page) {
    if (page === pageNumber || page < 1 || page > pagination.totalPages) return;
    pageNavigationRef.current = true;
    setIsLoading(true);
    setListError('');
    setPageNumber(page);
  }

  function retryList() {
    setListError('');
    setIsLoading(true);
    setRefreshKey((current) => current + 1);
  }

  function changeSort(event) {
    pageNavigationRef.current = false;
    setSort(event.target.value);
    setPageNumber(1);
    setIsLoading(true);
    setListError('');
  }

  function showFieldErrors(errors) {
    setFieldErrors(errors);
    // Wait for field errors to render, then focus the first affected control.
    requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
  }

  function closeProject() {
    projectRequestIdRef.current += 1;
    setIsViewing(false);
    setViewProject(null);
  }

  function openDelete(project, focusTarget) {
    restoreFocusRef.current = focusTarget || document.activeElement;
    setDeleteTarget(project);
  }

  function beginCreate() {
    setError('');
    setFieldErrors({});
    setNotice('');
    setViewProject(null);
    setRemovedImageIds(new Set());
    setFiles([]);
    setUploadProgress(null);
    setEditor({ ...EMPTY_PROJECT });
  }

  async function beginEdit(project) {
    if (editingId !== null) return;
    setEditingId(project.id);
    setError('');
    setFieldErrors({});
    setNotice('');
    try {
      const response = await api.get(`${basePath}/${project.id}`);
      setViewProject(null);
      setFiles([]);
      setUploadProgress(null);
      setRemovedImageIds(new Set());
      setEditor({
        ...response.project,
        images: response.project.images.map((image) => ({ ...image, originalAltText: image.altText })),
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setEditingId(null);
    }
  }

  async function showProject(project, focusTarget, imageId) {
    setError('');
    setNotice('');
    setEditor(null);
    setFiles([]);
    setUploadProgress(null);
    const requestId = ++projectRequestIdRef.current;
    // Show the dialog at once. Ignore its response if it closes or another
    // project opens before this request finishes.
    projectRestoreFocusRef.current = focusTarget || document.activeElement;
    setProjectStartIndex(0);
    setViewProject({ id: project.id, name: project.name, images: [] });
    setIsViewing(true);
    try {
      const response = await api.get(`${basePath}/${project.id}`);
      if (requestId !== projectRequestIdRef.current) return;
      const images = response.project.images || [];
      const selectedIndex = imageId ? images.findIndex((image) => image.id === imageId) : 0;
      setProjectStartIndex(selectedIndex < 0 ? 0 : selectedIndex);
      setViewProject(response.project);
    } catch (requestError) {
      if (requestId === projectRequestIdRef.current) {
        setViewProject(null);
        setError(requestError.message);
      }
    } finally {
      if (requestId === projectRequestIdRef.current) setIsViewing(false);
    }
  }

  function cancelEdit() {
    setEditor(null);
    setFiles([]);
    setUploadProgress(null);
    setRemovedImageIds(new Set());
    setError('');
  }

  function handleFileSelect(event) {
    const selected = [...event.target.files];
    event.target.value = '';
    const invalid = selected.find((file) => (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      || file.size < 1
      || file.size > 5 * 1024 * 1024
    ));
    if (invalid) {
      setError('Choose JPEG, PNG or WebP images that are 5 MB or smaller.');
      return;
    }
    setError('');
    setFiles((current) => [
      ...current,
      ...selected.map((file) => ({
        key: `${Date.now()}-${Math.random()}`,
        file,
        altText: imageText(file.name),
      })),
    ]);
  }

  function updateProjectField(event) {
    const { name, value } = event.target;
    setEditor((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  function updateImageAlt(imageId, altText) {
    setEditor((current) => ({
      ...current,
      images: current.images.map((image) => image.id === imageId ? { ...image, altText } : image),
    }));
  }

  async function saveProject(event) {
    event.preventDefault();
    if (!editor.name.trim()) {
      showFieldErrors({ name: 'Enter a project name.' });
      return;
    }
    if (past && !editor.completionDate) {
      showFieldErrors({ completionDate: 'Enter the completion date.' });
      return;
    }
    if (editor.images.some((image) => image.altText.trim().length > 240)
        || files.some((item) => item.altText.trim().length > 240)) {
        setError('Use 240 characters or less for the image description.');
      return;
    }

    setError('');
    setFieldErrors({});
    setNotice('');
    setIsSaving(true);
    let projectId = editor.id;
    const wasExisting = Boolean(editor.id);
    let projectSaved = false;
    let cleanupPending = false;
    try {
      const values = {
        name: editor.name,
        description: editor.description,
        propertyType: editor.propertyType,
        designStyle: editor.designStyle,
        // Save the editable completion date, not the server's creation date.
        ...(past ? { completionDate: editor.completionDate } : {}),
      };
      // Save the project first: each image upload needs its saved project ID.
      const saved = projectId
        ? await api.put(`${basePath}/${projectId}`, values)
        : await api.post(basePath, values);
      projectId = saved.project.id;
      projectSaved = true;
      setEditor((current) => ({ ...current, id: projectId }));

      for (const image of editor.images) {
        if (image.altText === image.originalAltText) continue;
        await api.patch(`${basePath}/${projectId}/images/${image.id}`, { altText: image.altText });
        setEditor((current) => ({
          ...current,
          images: current.images.map((item) => item.id === image.id
            ? { ...item, originalAltText: image.altText }
            : item),
        }));
      }

      for (const imageId of removedImageIds) {
        const removed = await api.del(`${basePath}/${projectId}/images/${imageId}`);
        cleanupPending ||= removed.cleanupPending;
        setRemovedImageIds((current) => {
          const next = new Set(current);
          next.delete(imageId);
          return next;
        });
      }

      for (const [index, pending] of files.entries()) {
        // Upload one file at a time. The API signs one path, Storage receives
        // the file, then the API confirms the file and links it to the project.
        setUploadProgress({ current: index + 1, total: files.length, fileName: pending.file.name });
        let uploadId = '';
        try {
          const created = await api.post(`${basePath}/${projectId}/images/upload-url`, {
            fileName: pending.file.name,
            contentType: pending.file.type,
            sizeBytes: pending.file.size,
            altText: pending.altText,
          });
          uploadId = created.upload.id;
          await uploadSignedImage(created.upload, pending.file);
          await api.post(`${basePath}/${projectId}/images/${uploadId}/complete`, {});
        } catch (uploadError) {
          if (uploadId) {
            await api.del(`${basePath}/${projectId}/images/uploads/${uploadId}`).catch(() => {});
          }
          throw uploadError;
        }
        setFiles((current) => current.filter((item) => item.key !== pending.key));
      }

      setEditor(null);
      setFiles([]);
      setUploadProgress(null);
      setRemovedImageIds(new Set());
      setViewProject(null);
      setIsLoading(true);
      setNotice(cleanupPending
        ? 'Project saved. Image cleanup is pending.'
        : wasExisting ? 'Project saved.' : 'Project added.');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      // Some steps can succeed before a later upload fails. Reload the saved
      // record and keep pending files so Retry does not repeat completed work.
      setError(requestError.message || 'The project could not be saved. Try again.');
      showFieldErrors(requestError.errors || {});
      // A rejected project write has no image changes to reconcile.
      if (projectSaved) {
        try {
          const response = await api.get(`${basePath}/${projectId}`);
          const serverProject = response.project;
          setEditor((current) => ({
            ...current,
            id: serverProject.id,
            images: serverProject.images.map((image) => {
              const desired = current.images.find((item) => item.id === image.id);
              return { ...image, originalAltText: image.altText, altText: desired?.altText ?? image.altText };
            }),
          }));
          // A removal may have reached the server even if its reply was lost.
          const remainingIds = new Set(serverProject.images.map((image) => image.id));
          setRemovedImageIds((current) => new Set([...current].filter((id) => remainingIds.has(id))));
        } catch {
          // Keep the form available when the project view cannot be refreshed.
        }
      }
    } finally {
      setUploadProgress(null);
      setIsSaving(false);
    }
  }

  async function deleteProject() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError('');
    try {
      const result = await api.del(`${basePath}/${deleteTarget.id}`);
      setDeleteTarget(null);
      if (viewProject?.id === deleteTarget.id) setViewProject(null);
      setIsLoading(true);
      setNotice(result.cleanupPending ? 'Project deleted. Image cleanup is pending.' : 'Project deleted.');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="designer-gallery grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl tracking-tight text-ink focus:outline-none sm:text-4xl">{title}<span className="text-action" aria-hidden="true">.</span></h1>
        {!editor && <Button onClick={beginCreate}><span aria-hidden="true">+</span> Add project</Button>}
      </div>

      <Message type="error" text={error} />
      <Message type="success" text={notice} />

      {editor ? (
        <section className="rounded-panel border border-border bg-surface p-5 shadow-card sm:p-7" aria-labelledby="project-form-title">
          <h2 id="project-form-title" className="mb-6 text-2xl text-ink">{editor.id ? 'Edit project' : 'Add project'}</h2>
          <form ref={formRef} className="grid max-w-3xl gap-5" onSubmit={saveProject} aria-busy={isSaving || undefined}>
            <FormField id="project-name" name="name" label="Project name" value={editor.name} onChange={updateProjectField} required disabled={isSaving} maxLength={160} error={fieldErrors.name} />
            <FormField id="project-description" name="description" label="Description" type="textarea" value={editor.description || ''} onChange={updateProjectField} disabled={isSaving} maxLength={5000} error={fieldErrors.description} />
            <FormField id="project-property-type" name="propertyType" label="Property type" value={editor.propertyType || ''} onChange={updateProjectField} disabled={isSaving} maxLength={80} error={fieldErrors.propertyType} />
            <FormField id="project-design-style" name="designStyle" label="Design style" value={editor.designStyle || ''} onChange={updateProjectField} disabled={isSaving} maxLength={80} error={fieldErrors.designStyle} />
            {past && (
              <FormField id="project-completion-date" name="completionDate" label="Completion date" type="date" value={editor.completionDate || ''} onChange={updateProjectField} required disabled={isSaving} error={fieldErrors.completionDate} />
            )}

            {editor.images.length > 0 && (
              <fieldset className="grid gap-4">
                <legend className="mb-1 text-sm font-medium text-ink">Project images</legend>
                {editor.images.map((image) => {
                  const removed = removedImageIds.has(image.id);
                  return (
                    <div key={image.id} className="grid gap-3 rounded-card border border-border p-4 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center">
                      {image.url ? (
                        <img src={image.url} alt={image.altText} className="h-24 w-32 rounded-control object-cover" />
                      ) : (
                        <p className="text-sm text-muted">Preview unavailable</p>
                      )}
                      <div className="grid gap-1">
                        <p className="break-all text-sm font-medium text-ink">{image.fileName}</p>
                        <p className="text-xs text-muted">{imageSize(image.sizeBytes)}</p>
                        {!removed && (
                          <FormField
                            id={`image-alt-${image.id}`}
                            name={`image-alt-${image.id}`}
                            label="Image description"
                            maxLength={240}
                            value={image.altText}
                            onChange={(event) => updateImageAlt(image.id, event.target.value)}
                            disabled={isSaving}
                          />
                        )}
                        {removed && <p className="text-sm text-muted">This image will be removed when you save.</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isSaving}
                        aria-pressed={removed}
                        onClick={() => setRemovedImageIds((current) => {
                          const next = new Set(current);
                          if (removed) next.delete(image.id);
                          else next.add(image.id);
                          return next;
                        })}
                      >
                        {removed ? 'Keep image' : 'Remove image'}
                      </Button>
                    </div>
                  );
                })}
              </fieldset>
            )}

            <FormField
              id="project-images"
              name="projectImages"
              label="Add images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              disabled={isSaving}
            />
            {files.length > 0 && (
              <fieldset className="grid gap-4">
                <legend className="mb-1 text-sm font-medium text-ink">Images to upload ({files.length})</legend>
                {files.map((item) => (
                  <div key={item.key} className="grid gap-3 rounded-card border border-border p-4 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center">
                    <FilePreview file={item.file} />
                    <div className="grid gap-1">
                      <p className="break-all text-sm font-medium text-ink">{item.file.name}</p>
                      <p className="text-xs text-muted">{imageSize(item.file.size)}</p>
                      <FormField
                        id={`new-image-alt-${item.key}`}
                        name={`new-image-alt-${item.key}`}
                        label="Image description"
                        maxLength={240}
                        value={item.altText}
                        onChange={(event) => setFiles((current) => current.map((file) => file.key === item.key ? { ...file, altText: event.target.value } : file))}
                        disabled={isSaving}
                      />
                    </div>
                    <Button size="sm" variant="secondary" disabled={isSaving} onClick={() => setFiles((current) => current.filter((file) => file.key !== item.key))}>
                      Remove
                    </Button>
                  </div>
                ))}
              </fieldset>
            )}

            {uploadProgress && (
              <p className="text-sm text-muted" role="status" aria-live="polite">
                Uploading image {uploadProgress.current} of {uploadProgress.total}: <span className="break-all">{uploadProgress.fileName}</span>
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={cancelEdit} disabled={isSaving}>Cancel</Button>
              <Button type="submit" loading={isSaving}>Save project</Button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <nav className="gallery-collections" aria-label="Project collections">
            <NavLink to="/designer/current-idps">Current</NavLink>
            <NavLink to="/designer/past-idps">Past</NavLink>
          </nav>
          <SearchBar
            key={searchQuery}
            placeholder="Search by project name, property type or design style"
            initialValue={searchQuery}
            onSearch={handleSearch}
          />
          <div className="w-full sm:max-w-xs">
            <FormField id="project-sort" name="sort" label="Sort by" value={sort} onChange={changeSort} includeEmptyOption={false} options={[
              { value: 'oldest', label: 'Oldest first (creation date)' },
              { value: 'newest', label: 'Newest first (creation date)' },
              { value: 'name-asc', label: 'Name A–Z' },
              { value: 'name-desc', label: 'Name Z–A' },
            ]} />
          </div>
          {isLoading ? (
            <div role="status" className="gallery-loading"><span className="sr-only">Loading projects.</span>{[0, 1, 2].map((item) => <div key={item} aria-hidden="true" />)}</div>
          ) : listError ? (
            <div className="rounded-card border border-border bg-surface p-5">
              <Message type="error" text={listError} />
              <Button variant="secondary" onClick={retryList}>Try again</Button>
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, index) => (
                <ProjectFolderCard
                  key={project.id}
                  project={project}
                  past={past}
                  appearDelay={index * 70}
                  isEditing={editingId === project.id}
                  onView={showProject}
                  onEdit={beginEdit}
                  onDelete={openDelete}
                />
              ))}
            </div>
          ) : (
            <p role="status" className="rounded-card border border-dashed border-border bg-surface px-5 py-12 text-center text-muted">{searchQuery ? 'No projects match your search.' : 'No projects yet.'}</p>
          )}

          {!isLoading && !listError && pagination.total > 0 && (
            <ProjectPagination page={pageNumber} pagination={pagination} onPageChange={goToPage} />
          )}

        </>
      )}

      <dialog
        ref={projectDialogRef}
        className="project-preview-dialog m-auto w-[min(96vw,72rem)] max-h-[92dvh] overflow-hidden rounded-panel border border-border bg-surface p-0 text-ink shadow-menu backdrop:bg-ink/45"
        aria-labelledby="project-view-title"
        onCancel={(event) => { event.preventDefault(); closeProject(); }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeProject();
        }}
        onClose={() => {
          if (viewProject) closeProject();
          const focusTarget = projectRestoreFocusRef.current;
          projectRestoreFocusRef.current = null;
          if (focusTarget?.isConnected) focusTarget.focus();
        }}
      >
        {viewProject && (
          <div className="max-h-[92dvh] overflow-y-auto">
            <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur-sm sm:px-6">
              <h2 id="project-view-title" data-project-view-title tabIndex={-1} className="min-w-0 break-words text-2xl text-ink">
                {viewProject.name}
              </h2>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="secondary" onClick={() => beginEdit(viewProject)} disabled={isViewing} loading={editingId === viewProject.id}>Edit</Button>
                <Button size="sm" variant="secondary" onClick={closeProject} aria-label="Close project view">
                  Close
                </Button>
              </div>
            </header>

            <div aria-busy={isViewing || undefined}>
              {isViewing ? (
                <p className="px-4 py-8 text-center text-muted sm:px-6" role="status" aria-live="polite">Loading project.</p>
              ) : (
                <div className={`grid gap-5 p-4 sm:p-6 ${viewProject.images?.length ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(17rem,0.8fr)]' : ''}`}>
                  <ProjectImageCarousel key={viewProject.id} images={viewProject.images} projectId={viewProject.id} status={status} projectName={viewProject.name} initialIndex={projectStartIndex} />
                  <aside className={`min-w-0 ${viewProject.images?.length ? 'border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0' : ''}`}>
                    <DetailsView
                      fields={[
                        { key: 'name', label: 'Project name' },
                        { key: 'description', label: 'Description' },
                        { key: 'propertyType', label: 'Property type' },
                        { key: 'designStyle', label: 'Design style' },
                        ...(past ? [{ key: 'completionDate', label: 'Completion date' }] : []),
                      ]}
                      item={viewProject}
                    />
                  </aside>
                </div>
              )}
            </div>
          </div>
        )}
      </dialog>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(92vw,32rem)] rounded-panel border border-border bg-surface p-0 text-ink shadow-card backdrop:bg-ink/40"
        aria-labelledby="delete-project-title"
        onCancel={(event) => { event.preventDefault(); setDeleteTarget(null); }}
        onClose={() => {
          if (deleteTarget) setDeleteTarget(null);
          restoreFocusRef.current?.focus?.();
          restoreFocusRef.current = null;
        }}
      >
        <div className="grid gap-5 p-6">
          <h2 id="delete-project-title" className="text-2xl">Delete project?</h2>
          <p>This will delete “{deleteTarget?.name}” and its saved image files.</p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={deleteProject} loading={isDeleting}>Delete project</Button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
