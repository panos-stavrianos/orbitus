import { promises as fs } from 'fs'
import path from 'path'

export async function initCmd() {
  const templatePath = path.resolve(__dirname, '../../templates/directus.config.js')
  const destPath = path.resolve(process.cwd(), 'directus.config.js')

  try {
    await fs.copyFile(templatePath, destPath)
    console.log('✔ directus.config.ts created')
  } catch (err) {
    console.error('✖ failed to create directus.config.ts', err)
    process.exit(1)
  }
}