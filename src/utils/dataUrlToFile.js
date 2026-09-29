/**
 * Wandelt eine Data-URL (Base64) in ein File-Objekt um, z. B. für den
 * Multipart-Foto-Upload (ApiMm.preUpload()).
 * @param {string} dataUrl
 * @param {string} filename
 * @returns {File}
 */
export function dataUrlToFile(dataUrl, filename) {
  const [meta, base64] = dataUrl.split(',')
  const mimeMatch = /data:(.*?);base64/.exec(meta || '')
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const binary = atob(base64 || '')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], filename, { type: mime })
}
