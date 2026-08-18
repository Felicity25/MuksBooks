import crypto from 'node:crypto'

function resolveKey(): Buffer {
  const raw = process.env.TUTOR_CREDENTIALS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!raw) {
    throw new Error('Missing TUTOR_CREDENTIALS_SECRET or SUPABASE_SERVICE_ROLE_KEY for tutor credential encryption')
  }

  // Support base64, hex, or plain text secrets.
  const asBase64 = Buffer.from(raw, 'base64')
  if (asBase64.toString('base64') === raw && asBase64.length >= 32) {
    return asBase64.subarray(0, 32)
  }

  const asHex = Buffer.from(raw, 'hex')
  if (asHex.toString('hex') === raw.toLowerCase() && asHex.length >= 32) {
    return asHex.subarray(0, 32)
  }

  return crypto.createHash('sha256').update(raw).digest()
}

const KEY = resolveKey()

export function encryptSecret(plainText: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: tag.toString('base64')
  }
}

export function decryptSecret(input: { encrypted: string; iv: string; authTag: string }) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(input.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(input.authTag, 'base64'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(input.encrypted, 'base64')),
    decipher.final()
  ])
  return plain.toString('utf8')
}
