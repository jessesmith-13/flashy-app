import { supabase } from './supabase.ts'

type BucketConfig = {
  name: string
  sizeLimit: number
}

const ENV_PREFIX =
  Deno.env.get('NODE_ENV') === 'production'
    ? ''
    : Deno.env.get('NODE_ENV') === 'test'
    ? 'test-'
    : 'dev-'

export const STORAGE_BUCKETS = {
  avatars: `${ENV_PREFIX}avatars`,
  cardImages: `${ENV_PREFIX}card-images`,
  cardAudio: `${ENV_PREFIX}card-audio`,
} as const

const BUCKET_CONFIGS: BucketConfig[] = [
  { name: STORAGE_BUCKETS.avatars, sizeLimit: 5 * 1024 * 1024 },
  { name: STORAGE_BUCKETS.cardImages, sizeLimit: 5 * 1024 * 1024 },
  { name: STORAGE_BUCKETS.cardAudio, sizeLimit: 10 * 1024 * 1024 },
]

export async function initializeStorageBuckets() {
  try {
    const { data: existingBuckets } = await supabase.storage.listBuckets()

    for (const bucket of BUCKET_CONFIGS) {
      const exists = existingBuckets?.some(b => b.name === bucket.name)

      if (!exists) {
        console.log(`🪣 Creating bucket: ${bucket.name}`)
        await supabase.storage.createBucket(bucket.name, {
          public: true,
          fileSizeLimit: bucket.sizeLimit,
        })
      }
    }
  } catch (error) {
    console.error('❌ Storage initialization failed:', error)
  }
}