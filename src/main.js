import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as os from 'os'

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

    // Download and install rpk
    await exec.exec('curl', ['-LO', downloadUrl])
    await exec.exec('mkdir', ['-p', '~/.local/bin'])
    await exec.exec('unzip', [
      `rpk-linux-${archSuffix}.zip`,
      '-d',
      '~/.local/bin/'
    ])

    // Add ~/.local/bin to PATH
    core.addPath('~/.local/bin')

    // Clean up the downloaded zip file
    await exec.exec('rm', [`rpk-linux-${archSuffix}.zip`])

    core.info('rpk installation completed successfully')
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
