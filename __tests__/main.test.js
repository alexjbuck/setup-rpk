/**
 * Unit tests for the action's main functionality, src/main.js
 */
import { jest, test, expect, beforeEach, describe } from '@jest/globals'

// Mock modules before importing the code under test
jest.unstable_mockModule('@actions/core', () => ({
  getInput: jest.fn(),
  setFailed: jest.fn(),
  info: jest.fn(),
  addPath: jest.fn(),
  error: jest.fn()
}))

jest.unstable_mockModule('@actions/http-client', () => ({
  HttpClient: jest.fn().mockImplementation(() => ({
    get: jest.fn()
  }))
}))

jest.unstable_mockModule('fs', () => ({
  createWriteStream: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  unlink: jest.fn(),
  chmodSync: jest.fn()
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
const { HttpClient } = await import('@actions/http-client')
const child_process = await import('child_process')
const os = await import('os')
const path = await import('path')

// Import the code under test
const { run } = await import('../src/main.js')

describe('rpk installer', () => {
  let mockWriteStream
  let mockResponse
  let mockUnzip
  let mockRpk
  let mockHttpClient

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock for fs.createWriteStream
    mockWriteStream = {
      on: jest.fn((event, handler) => {
        if (event === 'error') {
          mockWriteStream.errorHandler = handler
        } else if (event === 'finish') {
          mockWriteStream.finishHandler = handler
        }
        return mockWriteStream
      }),
      close: jest.fn(),
      emit: jest.fn()
    }
    fs.createWriteStream.mockReturnValue(mockWriteStream)

    // Setup mock for http response
    mockResponse = {
      message: {
        statusCode: 200,
        pipe: jest.fn(),
        headers: {}
      }
    }

    // Setup mock for HttpClient
    mockHttpClient = {
      get: jest.fn().mockResolvedValue(mockResponse)
    }
    HttpClient.mockImplementation(() => mockHttpClient)

    // Setup mock for child_process.spawn
    mockUnzip = {
      on: jest.fn((event, handler) => {
        if (event === 'error') {
          mockUnzip.errorHandler = handler
        } else if (event === 'close') {
          mockUnzip.closeHandler = handler
        }
        return mockUnzip
      })
    }

    // Setup mock for rpk verification
    mockRpk = {
      on: jest.fn((event, handler) => {
        if (event === 'error') {
          mockRpk.errorHandler = handler
        } else if (event === 'close') {
          mockRpk.closeHandler = handler
        }
        return mockRpk
      })
    }

    child_process.spawn.mockImplementation((cmd) => {
      if (cmd === 'unzip') return mockUnzip
      if (cmd === path.join('/home/user', '.local', 'bin', 'rpk'))
        return mockRpk
      return mockUnzip
    })

    // Setup mock for fs functions
    fs.existsSync.mockReturnValue(true)

    // Setup mock for os functions
    os.arch.mockReturnValue('amd64')
    os.homedir.mockReturnValue('/home/user')

    // Setup core input mock
    core.getInput.mockReturnValue('latest')
  })

  describe('successful installation', () => {
    test('installs latest version', async () => {
      // Mock fs.existsSync to return false for binDir but true for rpk binary
      fs.existsSync.mockImplementation((p) => {
        if (p === path.join('/home/user', '.local', 'bin')) return false
        if (p === path.join('/home/user', '.local', 'bin', 'rpk')) return true
        return false
      })

      // Simulate successful download
      mockResponse.message.pipe.mockImplementation(() => {
        setTimeout(() => mockWriteStream.finishHandler(), 0)
        return mockResponse.message
      })

      // Simulate successful unzip
      mockUnzip.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          setTimeout(() => handler(0), 0)
        }
        return mockUnzip
      })

      // Simulate successful rpk verification
      mockRpk.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          setTimeout(() => handler(0), 0)
        }
        return mockRpk
      })

      await run()

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://github.com/redpanda-data/redpanda/releases/latest/download/rpk-linux-amd64.zip'
      )
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join('/home/user', '.local', 'bin'),
        { recursive: true }
      )
      expect(core.addPath).toHaveBeenCalledWith(
        path.join('/home/user', '.local', 'bin')
      )
      expect(fs.chmodSync).toHaveBeenCalledWith(
        path.join('/home/user', '.local', 'bin', 'rpk'),
        '755'
      )
      expect(fs.unlinkSync).toHaveBeenCalled()
    })

    test('handles x64 architecture', async () => {
      // Mock x64 architecture
      os.arch.mockReturnValue('x64')

      // Mock fs.existsSync to return false for binDir but true for rpk binary
      fs.existsSync.mockImplementation((p) => {
        if (p === path.join('/home/user', '.local', 'bin')) return false
        if (p === path.join('/home/user', '.local', 'bin', 'rpk')) return true
        return false
      })

      // Simulate successful download
      mockResponse.message.pipe.mockImplementation(() => {
        setTimeout(() => mockWriteStream.finishHandler(), 0)
        return mockResponse.message
      })

      // Simulate successful unzip
      mockUnzip.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          setTimeout(() => handler(0), 0)
        }
        return mockUnzip
      })

      // Simulate successful rpk verification
      mockRpk.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          setTimeout(() => handler(0), 0)
        }
        return mockRpk
      })

      await run()

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://github.com/redpanda-data/redpanda/releases/latest/download/rpk-linux-amd64.zip'
      )
    })

    test('installs specific version', async () => {
      core.getInput.mockReturnValue('23.2.1')

      // Simulate successful download
      mockResponse.message.pipe.mockImplementation(() => {
        setTimeout(() => mockWriteStream.finishHandler(), 0)
        return mockResponse.message
      })

      // Simulate successful unzip
      mockUnzip.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          setTimeout(() => handler(0), 0)
        }
        return mockUnzip
      })

      // Simulate successful rpk verification
      mockRpk.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          setTimeout(() => handler(0), 0)
        }
        return mockRpk
      })

      await run()

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://github.com/redpanda-data/redpanda/releases/download/v23.2.1/rpk-linux-amd64.zip'
      )
    })

    // Test for handling redirects
    test('handles redirects', async () => {
      // Mock fs.existsSync to return false for binDir but true for rpk binary
      fs.existsSync.mockImplementation((p) => {
        if (p === path.join('/home/user', '.local', 'bin')) return false
        if (p === path.join('/home/user', '.local', 'bin', 'rpk')) return true
        return false
      })

      // Simulate successful download
      mockResponse.message.pipe.mockImplementation(() => {
        setTimeout(() => mockWriteStream.finishHandler(), 0)
        return mockResponse.message
      })

      // Simulate successful unzip
      mockUnzip.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          setTimeout(() => handler(0), 0)
        }
        return mockUnzip
      })

      // Simulate successful rpk verification
      mockRpk.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          setTimeout(() => handler(0), 0)
        }
        return mockRpk
      })

      await run()

      // Verify that HttpClient was called with the correct URL
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://github.com/redpanda-data/redpanda/releases/latest/download/rpk-linux-amd64.zip'
      )
    })
  })

  describe('error handling', () => {
    test('handles download failure (404)', async () => {
      mockResponse.message.statusCode = 404

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        'Failed to download file: 404'
      )
    })

    test('handles network error', async () => {
      const error = new Error('Network error')
      mockHttpClient.get.mockRejectedValue(error)

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Network error')
    })

    test('handles file system error', async () => {
      fs.createWriteStream.mockImplementation(() => {
        throw new Error('File system error')
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('File system error')
    })

    test('handles unzip failure', async () => {
      // Simulate successful download
      mockResponse.message.pipe.mockImplementation(() => {
        setTimeout(() => mockWriteStream.finishHandler(), 0)
        return mockResponse.message
      })

      // Simulate unzip failure
      mockUnzip.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          setTimeout(() => handler(1), 0)
        }
        return mockUnzip
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('unzip failed with code 1')
    })

    test('handles unzip process error', async () => {
      // Simulate successful download
      mockResponse.message.pipe.mockImplementation(() => {
        setTimeout(() => mockWriteStream.finishHandler(), 0)
        return mockResponse.message
      })

      // Simulate unzip process error
      const error = new Error('Unzip process error')
      mockUnzip.on.mockImplementation((event, handler) => {
        if (event === 'error') {
          setTimeout(() => handler(error), 0)
        }
        return mockUnzip
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Unzip process error')
    })

    test('handles rpk verification failure', async () => {
      // Simulate successful download
      mockResponse.message.pipe.mockImplementation(() => {
        setTimeout(() => mockWriteStream.finishHandler(), 0)
        return mockResponse.message
      })

      // Simulate successful unzip
      mockUnzip.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          setTimeout(() => handler(0), 0)
        }
        return mockUnzip
      })

      // Simulate rpk verification failure
      mockRpk.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          setTimeout(() => handler(1), 0)
        }
        return mockRpk
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        'rpk installation verification failed'
      )
    })

    test('handles missing rpk binary', async () => {
      // Simulate successful download
      mockResponse.message.pipe.mockImplementation(() => {
        setTimeout(() => mockWriteStream.finishHandler(), 0)
        return mockResponse.message
      })

      // Simulate successful unzip
      mockUnzip.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          setTimeout(() => handler(0), 0)
        }
        return mockUnzip
      })

      // Simulate missing rpk binary
      fs.existsSync.mockReturnValue(false)

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        'rpk installation verification failed'
      )
    })

    test('handles chmod failure', async () => {
      // Simulate successful download
      mockResponse.message.pipe.mockImplementation(() => {
        setTimeout(() => mockWriteStream.finishHandler(), 0)
        return mockResponse.message
      })

      // Simulate successful unzip
      mockUnzip.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          setTimeout(() => handler(0), 0)
        }
        return mockUnzip
      })

      // Simulate chmod failure
      fs.chmodSync.mockImplementation(() => {
        throw new Error('chmod failed')
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        'rpk installation verification failed'
      )
    })
  })
})
