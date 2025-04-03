# Install rpk GitHub Action

This GitHub Action installs the `rpk` binary from Redpanda. It automatically
detects the architecture of the runner and installs the appropriate version.

## Usage

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: redpanda-data/install-rpk@v1
    with:
      version: 'latest' # Optional, defaults to 'latest'
```

### Inputs

| Name    | Description                                          | Required | Default |
| ------- | ---------------------------------------------------- | -------- | ------- |
| version | Version of rpk to install (e.g. "latest" or "1.2.3") | No       | latest  |

### Example

```yaml
name: Install rpk
on: [push]

jobs:
  install-rpk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: redpanda-data/install-rpk@v1
        with:
          version: '1.2.3' # Will be converted to v1.2.3 in the download URL
      - run: rpk version
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.
