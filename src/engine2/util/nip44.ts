import {base64} from "@scure/base"
import {randomBytes} from "@noble/hashes/utils"
import {secp256k1} from "@noble/curves/secp256k1"
import {sha256} from "@noble/hashes/sha256"
import {xchacha20} from "@noble/ciphers/chacha"
import {LRUCache} from "src/util/lruCache"

export const utf8Decoder = new TextDecoder()

export const utf8Encoder = new TextEncoder()

export const sharedSecretCache = new LRUCache<string, Uint8Array>(100)

// Deriving shared secret is an expensive computation, cache it
export function getSharedSecret(sk: string, pk: string) {
  const cacheKey = `${sk}:${pk}`

  let result = sharedSecretCache.get(cacheKey)

  if (!result) {
    result = sha256(secp256k1.getSharedSecret(sk, "02" + pk).subarray(1, 33))

    sharedSecretCache.set(cacheKey, result)
  }

  return result
}

export function encryptWithSharedSecret(key: Uint8Array, text: string, v = 1) {
  if (v !== 1) {
    throw new Error("NIP44: unknown encryption version")
  }

  const nonce = randomBytes(24)
  const plaintext = utf8Encoder.encode(text)
  const ciphertext = xchacha20(key, nonce, plaintext)

  const payload = new Uint8Array(25 + ciphertext.length)
  payload.set([v], 0)
  payload.set(nonce, 1)
  payload.set(ciphertext, 25)

  return base64.encode(payload)
}

export function decryptWithSharedSecret(key: Uint8Array, payload: string) {
  const data = base64.decode(payload)

  if (data[0] !== 1) {
    throw new Error(`NIP44: unknown encryption version: ${data[0]}`)
  }

  const nonce = data.slice(1, 25)
  const ciphertext = data.slice(25)
  const plaintext = xchacha20(key, nonce, ciphertext)

  return utf8Decoder.decode(plaintext)
}

export function encryptFor(sk: string, pk: string, text: string, v = 1) {
  return encryptWithSharedSecret(getSharedSecret(sk, pk), text, v)
}

export function decryptFor(sk: string, pk: string, payload: string) {
  return decryptWithSharedSecret(getSharedSecret(sk, pk), payload)
}
