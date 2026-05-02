import fs from 'node:fs'
import path from 'node:path'
import { createAdminClient, getAdminClientConfigStatus } from '../lib/supabase/admin'

type LoadedTestAccountConfig = {
  envPath: string
  email: string
  password: string
}

const SERVER_ENV_CANDIDATES = ['.env.local', '.env'] as const
const LOCAL_ENV_CANDIDATES = ['.local/test-account.env', '.env.test.local'] as const

function parseEnvFile(fileContents: string): Record<string, string> {
  const values: Record<string, string> = {}

  for (const rawLine of fileContents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const equalsIndex = line.indexOf('=')
    if (equalsIndex === -1) continue

    const key = line.slice(0, equalsIndex).trim()
    let value = line.slice(equalsIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    values[key] = value
  }

  return values
}

function loadLocalTestAccountConfig(): LoadedTestAccountConfig {
  for (const relativeEnvPath of LOCAL_ENV_CANDIDATES) {
    const envPath = path.resolve(process.cwd(), relativeEnvPath)

    if (!fs.existsSync(envPath)) {
      continue
    }

    const envValues = parseEnvFile(fs.readFileSync(envPath, 'utf8'))
    const email = envValues.TEST_ACCOUNT_EMAIL?.trim().toLowerCase() ?? ''
    const password = envValues.TEST_ACCOUNT_PASSWORD ?? ''

    if (!email || !password) {
      throw new Error(
        `Missing TEST_ACCOUNT_EMAIL or TEST_ACCOUNT_PASSWORD in ${relativeEnvPath}.`
      )
    }

    return { envPath: relativeEnvPath, email, password }
  }

  throw new Error(
    `No local test account env file found. Create ${LOCAL_ENV_CANDIDATES.join(' or ')} first.`
  )
}

function loadServerEnvFiles() {
  for (const relativeEnvPath of SERVER_ENV_CANDIDATES) {
    const envPath = path.resolve(process.cwd(), relativeEnvPath)

    if (!fs.existsSync(envPath)) {
      continue
    }

    const envValues = parseEnvFile(fs.readFileSync(envPath, 'utf8'))

    for (const [key, value] of Object.entries(envValues)) {
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  }
}

async function findUserByEmail(email: string) {
  const supabase = createAdminClient()

  if (!supabase) {
    const configStatus = getAdminClientConfigStatus()
    if (configStatus === 'missing_supabase_url') {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for the admin client.')
    }

    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for the admin client.')
  }

  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    })

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`)
    }

    const users = data.users ?? []
    const matchingUser = users.find((user) => user.email?.toLowerCase() === email)

    if (matchingUser) {
      return { supabase, user: matchingUser }
    }

    if (users.length < 200) {
      return { supabase, user: null }
    }

    page += 1
  }
}

async function main() {
  loadServerEnvFiles()
  const { envPath, email, password } = loadLocalTestAccountConfig()
  const { supabase, user } = await findUserByEmail(email)

  console.log(`Using local credential file: ${envPath}`)

  if (user) {
    console.log(`Test account already exists for ${email}.`)
    console.log(`Auth user id: ${user.id}`)
    return
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    throw new Error(`Failed to create test account: ${error.message}`)
  }

  console.log(`Created test account for ${email}.`)
  console.log(`Auth user id: ${data.user.id}`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error.'
  console.error(`create:test-account failed: ${message}`)
  process.exitCode = 1
})
