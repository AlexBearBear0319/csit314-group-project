import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import Button from '../components/Button';
import DetailsView from '../components/DetailsView';
import FormField from '../components/FormField';
import Message from '../components/Message';
import ProjectImageCarousel from '../components/ProjectImageCarousel';
import ProjectFolderCard from '../components/ProjectFolderCard';
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
  const title = past ? 'Past IDPs' : 'Current IDPs';
  const basePath = `/designer/${status}-idps`;
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const dialogRef = useRef(null);
  const projectDialogRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const projectRestoreFocusRef = useRef(null);
  const listRequestIdRef = useRef(0);
  const projectRequestIdRef = useRef(0);

  useEffect(() => {
    let active = true;
    let redirected = false;
    const requestId = ++listRequestIdRef.current;
    const params = new URLSearchParams({ page: String(pageNumber), pageSize: '9' });
    if (searchQuery.trim()) params.set('q', searchQuery.trim());

    api.get(`${basePath}?${params.toString()}`).then((response) => {
      if (!active || requestId !== listRequestIdRef.current) return;
      const pageInfo = response.pagination || {
        page: pageNumber,
        pageSize: 9,
        total: response.projects.length,
        totalPages: response.projects.length ? 1 : 0,
      };
      const lastPage = Math.max(1, pageInfo.totalPages);
      if (pageNumber > lastPage) {
        redirected = true;
        setProjects([]);
        setIsLoading(true);
        setPageNumber(lastPage);
        return;
      }
      setProjects(response.projects);
      setPagination(pageInfo);
    }).catch((requestError) => {
      if (active && requestId === listRequestIdRef.current) setError(requestError.message);
    }).finally(() => {
      if (active && requestId === listRequestIdRef.current && !redirected) setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [basePath, pageNumber, refreshKey, searchQuery]);

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
    setIsLoading(true);
    setError('');
    setNotice('');
    setSearchQuery(query.trim());
    setPageNumber(1);
    setRefreshKey((current) => current + 1);
  }

  function goToPage(page) {
    setIsLoading(true);
    setPageNumber(page);
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
    setNotice('');
    setViewProject(null);
    setRemovedImageIds(new Set());
    setFiles([]);
    setUploadProgress(null);
    setEditor({ ...EMPTY_PROJECT });
  }

  async function beginEdit(project) {
    setError('');
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
    }
  }

  async function showProject(project, focusTarget, imageId) {
    setError('');
    setNotice('');
    setEditor(null);
    setFiles([]);
    setUploadProgress(null);
    const requestId = ++projectRequestIdRef.current;
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
      setError('Enter a project name.');
      return;
    }
    if (past && !editor.completionDate) {
      setError('Enter the completion date.');
      return;
    }
      if (editor.images.some((image) => image.altText.trim().length > 240)
        || files.some((item) => item.altText.trim().length > 240)) {
        setError('Use 240 characters or less for the image description.');
      return;
    }

    setError('');
    setNotice('');
    setIsSaving(true);
    let projectId = editor.id;
    const wasExisting = Boolean(editor.id);
    let cleanupPending = false;
    try {
      const values = {
        name: editor.name,
        description: editor.description,
        propertyType: editor.propertyType,
        designStyle: editor.designStyle,
        ...(past ? { completionDate: editor.completionDate } : {}),
      };
      const saved = projectId
        ? await api.put(`${basePath}/${projectId}`, values)
        : await api.post(basePath, values);
      projectId = saved.project.id;
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
      setError(requestError.message || 'The project could not be saved. Try again.');
      if (projectId) {
        try {
          const response = await api.get(`${basePath}/${projectId}`);
          const serverProject = response.project;
          setEditor((current) => ({
            ...serverProject,
            images: serverProject.images.map((image) => {
              const desired = current.images.find((item) => item.id === image.id);
              return { ...image, originalAltText: image.altText, altText: desired?.altText ?? image.altText };
            }),
          }));
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
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl tracking-tight text-ink sm:text-4xl">{title}</h1>
        {!editor && <Button onClick={beginCreate}>Add project</Button>}
      </div>

      <Message type="error" text={error} />
      <Message type="success" text={notice} />

      {editor ? (
        <section className="rounded-panel border border-border bg-surface p-5 shadow-card sm:p-7" aria-labelledby="project-form-title">
          <h2 id="project-form-title" className="mb-6 text-2xl text-ink">{editor.id ? 'Edit project' : 'Add project'}</h2>
          <form className="grid max-w-3xl gap-5" onSubmit={saveProject} aria-busy={isSaving || undefined}>
            <FormField id="project-name" name="name" label="Project name" value={editor.name} onChange={updateProjectField} required disabled={isSaving} />
            <FormField id="project-description" name="description" label="Description" type="textarea" value={editor.description || ''} onChange={updateProjectField} disabled={isSaving} />
            <FormField id="project-property-type" name="propertyType" label="Property type" value={editor.propertyType || ''} onChange={updateProjectField} disabled={isSaving} />
            <FormField id="project-design-style" name="designStyle" label="Design style" value={editor.designStyle || ''} onChange={updateProjectField} disabled={isSaving} />
            {past && (
              <FormField id="project-completion-date" name="completionDate" label="Completion date" type="date" value={editor.completionDate || ''} onChange={updateProjectField} required disabled={isSaving} />
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
          <SearchBar
            key={searchQuery}
            placeholder="Search by project name, property type or design style"
            initialValue={searchQuery}
            onSearch={handleSearch}
          />
          {isLoading ? (
            <p role="status" className="rounded-card border border-border bg-surface px-5 py-8 text-center text-muted">Loading projects.</p>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, index) => (
                <ProjectFolderCard
                  key={project.id}
                  project={project}
                  past={past}
                  appearDelay={index * 70}
                  onView={showProject}
                  onEdit={beginEdit}
                  onDelete={openDelete}
                />
              ))}
            </div>
          ) : (
            <p role="status" className="rounded-card border border-dashed border-border bg-surface px-5 py-12 text-center text-muted">No projects found.</p>
          )}

          {!isLoading && pagination.total > 0 && (
            <nav aria-label="Project pages" className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
              <p className="text-sm text-muted" role="status" aria-live="polite">
                Showing {Math.min((pageNumber - 1) * pagination.pageSize + 1, pagination.total)}–{Math.min(pageNumber * pagination.pageSize, pagination.total)} of {pagination.total} projects
              </p>
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pageNumber <= 1}
                    onClick={() => goToPage(Math.max(1, pageNumber - 1))}
                  >
                    Previous
                  </Button>
                  <span className="min-w-20 text-center text-sm text-ink" aria-current="page">
                    Page {pageNumber} of {pagination.totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pageNumber >= pagination.totalPages}
                    onClick={() => goToPage(Math.min(pagination.totalPages, pageNumber + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </nav>
          )}

        </>
      )}

      <dialog
        ref={projectDialogRef}
        className="m-auto w-[min(96vw,72rem)] max-h-[92dvh] overflow-hidden rounded-panel border border-border bg-surface p-0 text-ink shadow-menu backdrop:bg-ink/45"
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
                <Button size="sm" variant="secondary" onClick={() => beginEdit(viewProject)} disabled={isViewing}>Edit</Button>
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
                  <ProjectImageCarousel key={viewProject.id} images={viewProject.images || []} projectName={viewProject.name} initialIndex={projectStartIndex} />
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
