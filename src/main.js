import * as core from '@actions/core'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as child_process from 'child_process'

/**
 * Downloads a file from a URL to a local path
 * @param {string} url - The URL to download from
 * @param {string} dest - The destination path
 * @returns {Promise<void>}
 */
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)

    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        core.info(`Following redirect to: ${redirectUrl}`)
        file.close()
        fs.unlink(dest, () => {}) // Clean up the partial file
        return downloadFile(redirectUrl, dest)
      }

      if (response.statusCode !== 200) {
        file.close()
        fs.unlink(dest, () => {}) // Clean up the partial file
        reject(new Error(`Failed to download file: ${response.statusCode}`))
        return
      }

      response.pipe(file)
      file.on('finish', () => {
        file.close()
        core.info('Downloaded rpk successfully')
        resolve()
      })
    })

    request.on('error', (err) => {
      file.close()
      fs.unlink(dest, () => {}) // Delete the file if download failed
      core.error(`Failed to download file: ${err.message}`)
      reject(err)
    })
  })
}

/**
 * Unzips a file to a destination directory
 * @param {string} zipPath - Path to the zip file
 * @param {string} destDir - Destination directory
 * @returns {Promise<void>}
 */
async function unzipFile(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    const unzip = child_process.spawn('unzip', ['-o', zipPath, '-d', destDir])
    unzip.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`unzip failed with code ${code}`))
      }
    })
    unzip.on('error', reject)
  })
}

/**
 * Verifies that rpk is installed and executable
 * @param {string} binDir - Directory containing the rpk binary
 * @returns {Promise<boolean>} - True if verification succeeds
 */
async function verifyInstallation(binDir) {
  return new Promise((resolve) => {
    const rpkPath = path.join(binDir, 'rpk')

    // Check if the binary exists
    if (!fs.existsSync(rpkPath)) {
      core.error(`rpk binary not found at ${rpkPath}`)
      resolve(false)
      return
    }

    // Make the binary executable
    try {
      fs.chmodSync(rpkPath, '755')
    } catch (error) {
      core.error(`Failed to make rpk executable: ${error.message}`)
      resolve(false)
      return
    }

    // Try to run rpk --version
    const rpk = child_process.spawn(rpkPath, ['--version'])
    rpk.on('close', (code) => {
      if (code === 0) {
        core.info('rpk installation verified successfully')
        resolve(true)
      } else {
        core.error(`rpk verification failed with code ${code}`)
        resolve(false)
      }
    })
    rpk.on('error', (error) => {
      core.error(`Failed to run rpk: ${error.message}`)
      resolve(false)
    })
  })
}

/**
 * The main function for the action.
 *
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run() {
  try {
    const version = core.getInput('version')
    const arch = os.arch()
    const archSuffix = arch === 'arm64' ? 'arm64' : 'amd64'

    // Determine the download URL based on version and architecture
    const baseUrl = 'https://github.com/redpanda-data/redpanda/releases'
    const downloadUrl =
      version === 'latest'
        ? `${baseUrl}/latest/download/rpk-linux-${archSuffix}.zip`
        : `${baseUrl}/download/v${version}/rpk-linux-${archSuffix}.zip`

    core.info(`Installing rpk version: ${version} for architecture: ${arch}`)

    // Create necessary directories
    const homeDir = os.homedir()
    const binDir = path.join(homeDir, '.local', 'bin')
    const zipPath = path.join(process.cwd(), `rpk-linux-${archSuffix}.zip`)

    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true })
    }

    // Download and install rpk
    core.info('Downloading rpk...')
    await downloadFile(downloadUrl, zipPath)

    core.info('Installing rpk...')
    await unzipFile(zipPath, binDir)

    // Add ~/.local/bin to PATH
    core.addPath(binDir)
    core.info(`Added ${binDir} to PATH`)

    // Verify the installation
    const verified = await verifyInstallation(binDir)
    if (!verified) {
      throw new Error('rpk installation verification failed')
    }

    // Clean up the downloaded zip file
    fs.unlinkSync(zipPath)

    core.info('rpk installation completed successfully')
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
