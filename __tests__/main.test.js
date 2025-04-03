/**
 * Unit tests for the action's main functionality, src/main.js
 */
import { jest, test, expect, beforeEach } from '@jest/globals'

// Mock modules before importing the code under test
jest.unstable_mockModule('@actions/core', () => ({
  getInput: jest.fn(),
  setFailed: jest.fn(),
  info: jest.fn(),
  addPath: jest.fn()
}))

jest.unstable_mockModule('fs', () => ({
  createWriteStream: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  unlink: jest.fn()
}))

jest.unstable_mockModule('https', () => ({
  get: jest.fn()
}))

jest.unstable_mockModule('child_process', () => ({
  spawn: jest.fn()
}))

jest.unstable_mockModule('os', () => ({
  arch: jest.fn(),
  homedir: jest.fn()
}))

// Import mocked modules
const core = await import('@actions/core')
const fs = await import('fs')
const https = await import('https')
const child_process = await import('child_process')
const os = await import('os')
const path = await import('path')

// Import the code under test
const { run } = await import('../src/main.js')

describe('rpk installer', () => {
  let mockWriteStream
  let mockResponse
  let mockUnzip

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock for fs.createWriteStream
    mockWriteStream = {
      on: jest.fn(),
      close: jest.fn()
    }
    fs.createWriteStream.mockReturnValue(mockWriteStream)

    // Setup mock for https.get response
    mockResponse = {
      statusCode: 200,
      pipe: jest.fn(),
      on: jest.fn()
    }
    https.get.mockImplementation((url, callback) => {
      callback(mockResponse)
      return { on: jest.fn() }
    })

    // Setup mock for child_process.spawn
    mockUnzip = {
      on: jest.fn()
    }
    child_process.spawn.mockReturnValue(mockUnzip)

    // Setup mock for os functions
    os.arch.mockReturnValue('amd64')
    os.homedir.mockReturnValue('/home/user')

    // Setup core input mock
    core.getInput.mockReturnValue('latest')
  })

  test('installs latest version successfully', async () => {
    // Setup successful download
    mockWriteStream.on.mockImplementation((event, callback) => {
      if (event === 'finish') {
        callback()
      }
    })

    // Setup successful unzip
    mockUnzip.on.mockImplementation((event, callback) => {
      if (event === 'close') {
        callback(0)
      }
    })

    await run()

    // Verify the correct URL was used
    expect(https.get).toHaveBeenCalledWith(
      'https://github.com/redpanda-data/redpanda/releases/latest/download/rpk-linux-amd64.zip',
      expect.any(Function)
    )

    // Verify directory was created
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.join('/home/user', '.local', 'bin'),
      { recursive: true }
    )

    // Verify PATH was updated
    expect(core.addPath).toHaveBeenCalledWith(
      path.join('/home/user', '.local', 'bin')
    )

    // Verify cleanup was performed
    expect(fs.unlinkSync).toHaveBeenCalled()
  })

  test('installs specific version successfully', async () => {
    core.getInput.mockReturnValue('23.2.1')

    // Setup successful download
    mockWriteStream.on.mockImplementation((event, callback) => {
      if (event === 'finish') {
        callback()
      }
    })

    // Setup successful unzip
    mockUnzip.on.mockImplementation((event, callback) => {
      if (event === 'close') {
        callback(0)
      }
    })

    await run()

    // Verify the correct URL was used
    expect(https.get).toHaveBeenCalledWith(
      'https://github.com/redpanda-data/redpanda/releases/download/v23.2.1/rpk-linux-amd64.zip',
      expect.any(Function)
    )
  })

  test('handles download failure', async () => {
    mockResponse.statusCode = 404

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Failed to download file: 404')
  })

  test('handles unzip failure', async () => {
    // Setup successful download
    mockWriteStream.on.mockImplementation((event, callback) => {
      if (event === 'finish') {
        callback()
      }
    })

    // Setup failed unzip
    mockUnzip.on.mockImplementation((event, callback) => {
      if (event === 'close') {
        callback(1)
      }
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('unzip failed with code 1')
  })
})
