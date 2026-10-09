# Build image for Anthropic's OSS Scanner (https://github.com/anthropics/oss-scanner).
# The scanner builds this with the repository as the context; network access is
# available here and removed afterwards, so everything the tests need is fetched now.
FROM node:20-bookworm

# The second reader (conformance/go) and the differential fuzz need Go; CI pins 1.22.
COPY --from=golang:1.22-bookworm /usr/local/go /usr/local/go
ENV PATH="/usr/local/go/bin:${PATH}" \
    GOTOOLCHAIN=local

# Scanner contract: the checkout lives inside the image, at /src.
COPY . /src
WORKDIR /src

# Dependencies as the maintainers install them (lockfile), then the Go reader's
# modules, so both suites run offline.
RUN npm ci && cd conformance/go && go mod download && go build ./...

# Run the suites so the image is known to work; a failing test does not abort the build.
RUN (npm test || echo "WARNING: npm test reported failures") \
    && (cd conformance/go && go test ./... || echo "WARNING: go test reported failures")
