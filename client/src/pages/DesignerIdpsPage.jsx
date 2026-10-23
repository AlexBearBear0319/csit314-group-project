import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import Button from '../components/Button';
import DetailsView from '../components/DetailsView';
import FormField from '../components/FormField';
import Message from '../components/Message';
import ResultsTable from '../components/ResultsTable';
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
  const [editor, setEditor] = useState(null);
  const [files, setFiles] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState(() => new Set());
  const [viewProject, setViewProject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dialogRef = useRef(null);
  const deleteButtonRef = useRef(null);
  const restoreFocusRef = useRef(null);

  const loadProjects = useCallback(async (query = '') => {
    setIsLoading(true);
    setError('');
    try {
      const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
      const response = await api.get(`${basePath}${suffix}`);
      setProjects(response.projects);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadProjects(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProjects]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (deleteTarget && dialog && !dialog.open) {
      restoreFocusRef.current = document.activeElement;
      dialog.showModal();
    } else if (!deleteTarget && dialog?.open) {
      dialog.close();
    }
  }, [deleteTarget]);

  function beginCreate() {
    setError('');
    setNotice('');
    setViewProject(null);
    setRemovedImageIds(new Set());
    setFiles([]);
    setEditor({ ...EMPTY_PROJECT });
  }

  async function beginEdit(project) {
    setError('');
    setNotice('');
    try {
      const response = await api.get(`${basePath}/${project.id}`);
      setViewProject(null);
      setFiles([]);
      setRemovedImageIds(new Set());
      setEditor({
        ...response.project,
        images: response.project.images.map((image) => ({ ...image, originalAltText: image.altText })),
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function showProject(project) {
    setError('');
    setNotice('');
    setEditor(null);
    setFiles([]);
    try {
      const response = await api.get(`${basePath}/${project.id}`);
      setViewProject(response.project);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function cancelEdit() {
    setEditor(null);
    setFiles([]);
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

      for (const pending of files) {
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
      setRemovedImageIds(new Set());
      setViewProject(null);
      setNotice(cleanupPending
        ? 'Project saved. Image cleanup is pending.'
        : wasExisting ? 'Project saved.' : 'Project added.');
      await loadProjects();
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
      setNotice(result.cleanupPending ? 'Project deleted. Image cleanup is pending.' : 'Project deleted.');
      await loadProjects();
    } catch (requestError) {
      setError(requestError.message);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = [
    { key: 'name', label: 'Project name' },
    { key: 'propertyType', label: 'Property type' },
    { key: 'designStyle', label: 'Design style' },
    ...(past ? [{ key: 'completionDate', label: 'Completion date' }] : []),
    { key: 'imageCount', label: 'Images' },
  ];
  const rows = projects.map((project) => ({
    ...project,
    propertyType: project.propertyType || '—',
    designStyle: project.designStyle || '—',
    completionDate: project.completionDate || '—',
    imageCount: project.images.length,
  }));

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
                <legend className="mb-1 text-sm font-medium text-ink">Images to upload</legend>
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

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={cancelEdit} disabled={isSaving}>Cancel</Button>
              <Button type="submit" loading={isSaving}>Save project</Button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <SearchBar placeholder="Search by project name, property type or design style" onSearch={loadProjects} />
          {isLoading ? (
            <p role="status" className="rounded-card border border-border bg-surface px-5 py-8 text-center text-muted">Loading projects.</p>
          ) : (
            <ResultsTable
              columns={columns}
              rows={rows}
              ariaLabel={title}
              actions={[
                { label: 'View', onClick: showProject },
                { label: 'Edit', onClick: beginEdit },
                { label: 'Delete', variant: 'outline-danger', onClick: (project) => {
                  deleteButtonRef.current = document.activeElement;
                  setDeleteTarget(project);
                } },
              ]}
            />
          )}

          {viewProject && (
            <section className="rounded-panel border border-border bg-surface p-5 shadow-card sm:p-7" aria-labelledby="project-details-title">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 id="project-details-title" className="text-2xl text-ink">Project details</h2>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => beginEdit(viewProject)}>Edit</Button>
                  <Button size="sm" variant="secondary" onClick={() => setViewProject(null)}>Close</Button>
                </div>
              </div>
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
              {viewProject.images.length > 0 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {viewProject.images.map((image) => (
                    <figure key={image.id} className="overflow-hidden rounded-card border border-border bg-white">
                      {image.url ? (
                        <img src={image.url} alt={image.altText} className="aspect-[4/3] w-full object-cover" />
                      ) : (
                        <div className="grid aspect-[4/3] place-items-center bg-canvas text-sm text-muted">Preview unavailable</div>
                      )}
                      <figcaption className="grid gap-1 p-3">
                        <span className="text-sm font-medium text-ink">{image.fileName}</span>
                        <span className="text-xs text-muted">{image.altText} · {imageSize(image.sizeBytes)}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(92vw,32rem)] rounded-panel border border-border bg-surface p-0 text-ink shadow-card backdrop:bg-ink/40"
        aria-labelledby="delete-project-title"
        onCancel={(event) => { event.preventDefault(); setDeleteTarget(null); }}
        onClose={() => {
          if (deleteTarget) setDeleteTarget(null);
          (restoreFocusRef.current || deleteButtonRef.current)?.focus?.();
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
