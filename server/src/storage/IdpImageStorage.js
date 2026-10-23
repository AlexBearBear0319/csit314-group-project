const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
let testAdapter = null;

function bucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET || 'designer-idp-images';
}

function isStorageConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

function storageConfig() {
  if (testAdapter) return testAdapter;
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error('Supabase Storage is not configured.');
  return { url: url.replace(/\/$/, ''), secretKey };
}

function setStorageAdapterForTests(adapter) {
  testAdapter = adapter;
}

function encodeStoragePath(value) {
  return String(value).split('/').map(encodeURIComponent).join('/');
}

function requestHeaders(secretKey) {
  return { apikey: secretKey };
}

async function storageRequest(endpoint, secretKey, options = {}) {
  let response;
  try {
    response = await fetch(endpoint, {
      method: options.method,
      body: options.body,
      signal: options.signal,
      headers: { ...requestHeaders(secretKey), ...(options.headers || {}) },
    });
  } catch {
    throw new Error('Storage is not available. Try again.');
  }
  if (!response.ok) throw new Error(`Storage request failed (${response.status}).`);
  return response;
}

async function readBoundedImage(response) {
  const declaredSize = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Storage did not return an image.');

  const chunks = [];
  let sizeBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    sizeBytes += value.byteLength;
    if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
      await reader.cancel();
      throw new Error('Image must be 5 MB or smaller.');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, sizeBytes);
}

function detectImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

async function createSignedUploadUrl(path) {
  const config = storageConfig();
  if (testAdapter) return testAdapter.createSignedUploadUrl(path);
  const endpoint = `${config.url}/storage/v1/object/upload/sign/${encodeURIComponent(bucketName())}/${encodeStoragePath(path)}`;
  const response = await storageRequest(endpoint, config.secretKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await response.json();
  let token = data.token;
  const signedUrl = data.url || data.signedUrl || data.signedURL;
  if (!token && signedUrl) token = new URL(signedUrl, `${config.url}/storage/v1`).searchParams.get('token');
  if (!token) throw new Error('Storage did not return an upload link.');
  return { token, path, signedUrl };
}

async function verifyObject(path) {
  const config = storageConfig();
  if (testAdapter) return testAdapter.verifyObject(path);
  const endpoint = `${config.url}/storage/v1/object/authenticated/${encodeURIComponent(bucketName())}/${encodeStoragePath(path)}`;
  const response = await storageRequest(endpoint, config.secretKey, { method: 'GET' });
  const bytes = await readBoundedImage(response);
  const contentType = detectImageType(bytes);
  if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) throw new Error('Choose a JPEG, PNG or WebP image.');
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_IMAGE_SIZE_BYTES) throw new Error('Image must be 5 MB or smaller.');
  return { contentType, sizeBytes: bytes.byteLength };
}

async function createSignedReadUrl(path) {
  const config = storageConfig();
  if (testAdapter) return testAdapter.createSignedReadUrl(path);
  const endpoint = `${config.url}/storage/v1/object/sign/${encodeURIComponent(bucketName())}/${encodeStoragePath(path)}`;
  const response = await storageRequest(endpoint, config.secretKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 300 }),
  });
  const data = await response.json();
  const signedUrl = data.signedURL || data.signedUrl;
  if (!signedUrl) throw new Error('Storage did not return an image link.');
  if (/^https?:\/\//i.test(signedUrl)) return signedUrl;
  const signedPath = signedUrl.startsWith('/') ? signedUrl : `/${signedUrl}`;
  return signedPath.startsWith('/storage/v1/')
    ? `${config.url}${signedPath}`
    : `${config.url}/storage/v1${signedPath}`;
}

async function checkStorageReady() {
  if (testAdapter) {
    return typeof testAdapter.checkReady === 'function' ? Boolean(await testAdapter.checkReady()) : true;
  }
  if (!isStorageConfigured()) return false;

  const config = storageConfig();
  const endpoint = `${config.url}/storage/v1/bucket/${encodeURIComponent(bucketName())}`;
  const response = await storageRequest(endpoint, config.secretKey, { method: 'GET' });
  const bucket = await response.json();
  const allowedTypes = bucket.allowed_mime_types || [];
  return bucket.id === bucketName()
    && bucket.public === false
    && Number(bucket.file_size_limit) === MAX_IMAGE_SIZE_BYTES
    && [...ALLOWED_CONTENT_TYPES].every((contentType) => allowedTypes.includes(contentType));
}

async function removeObjects(paths) {
  const uniquePaths = [...new Set(paths)];
  if (uniquePaths.length === 0) return { removed: [], failed: [] };
  if (testAdapter) return testAdapter.removeObjects(uniquePaths);

  try {
    const config = storageConfig();
    const endpoint = `${config.url}/storage/v1/object/${encodeURIComponent(bucketName())}`;
    await storageRequest(endpoint, config.secretKey, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: uniquePaths.map(encodeStoragePath) }),
    });
    return { removed: uniquePaths, failed: [] };
  } catch (error) {
    return { removed: [], failed: uniquePaths, error: error.message };
  }
}

module.exports = {
  ALLOWED_CONTENT_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  bucketName,
  checkStorageReady,
  createSignedUploadUrl,
  createSignedReadUrl,
  detectImageType,
  isStorageConfigured,
  removeObjects,
  setStorageAdapterForTests,
  verifyObject,
};
