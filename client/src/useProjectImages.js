import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

const EMPTY_IMAGES = [];
const AUTO_RETRY_DELAY = 5 * 60 * 1000;

export default function useProjectImages({ projectId, status, images = EMPTY_IMAGES }) {
  const [state, setState] = useState(null);
  const requestRef = useRef(null);
  const lastAttemptRef = useRef(-Infinity);
  const revisionRef = useRef(0);
  const canRefresh = Boolean(projectId && ['current', 'past'].includes(status));

  const refreshImages = useCallback((manual = false) => {
    if (requestRef.current) return requestRef.current.promise;
    const keepImages = (current) => current?.source === images ? current.images : images;
    const unavailable = () => setState((current) => ({
      source: images, images: keepImages(current), phase: 'unavailable', revision: revisionRef.current,
    }));
    // One automatic request per five minutes prevents a bad object or Storage
    // outage from causing an endless image-error/request loop. Retry is explicit.
    if (!canRefresh || (!manual && Date.now() - lastAttemptRef.current < AUTO_RETRY_DELAY)) {
      unavailable();
      return Promise.resolve(false);
    }
    lastAttemptRef.current = Date.now();
    const controller = new AbortController();
    setState((current) => ({ source: images, images: keepImages(current), phase: 'refreshing', revision: revisionRef.current }));
    const promise = api.get(`/designer/${status}-idps/${projectId}`, { signal: controller.signal })
      .then(({ project }) => {
        if (controller.signal.aborted) return false;
        revisionRef.current += 1;
        const refreshed = project.images || [];
        // The API can return saved metadata with null links while Storage is
        // offline. A 200 response alone does not mean the photos are available.
        setState({ source: images, images: refreshed, phase: refreshed.some((image) => !image.url) ? 'unavailable' : 'ready', revision: revisionRef.current });
        return true;
      }).catch(() => {
        if (!controller.signal.aborted) unavailable();
        return false;
      }).finally(() => {
        if (requestRef.current?.controller === controller) requestRef.current = null;
      });
    requestRef.current = { controller, promise };
    return promise;
  }, [canRefresh, images, projectId, status]);

  useEffect(() => () => {
    requestRef.current?.controller.abort();
    requestRef.current = null;
    lastAttemptRef.current = -Infinity;
  }, [images, projectId, status]);

  useEffect(() => {
    let active = true;
    if (images.some((image) => !image.url)) {
      // Missing links can result from a temporary Storage outage at list time.
      void Promise.resolve().then(() => { if (active) refreshImages(); });
    }
    return () => { active = false; };
  }, [images, refreshImages]);

  const current = state?.source === images ? state : null;
  return {
    images: current?.images ?? images,
    refreshing: current?.phase === 'refreshing',
    unavailable: current?.phase === 'unavailable',
    revision: current?.revision || 0,
    canRefresh,
    refreshImages,
  };
}
